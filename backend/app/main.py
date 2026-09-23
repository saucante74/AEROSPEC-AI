import json
import logging
import os
from collections.abc import Awaitable, Callable
from functools import lru_cache
from ipaddress import ip_address
from pathlib import Path
from time import perf_counter
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from langchain_chroma import Chroma
from openai import OpenAIError
from pydantic import BaseModel, Field, field_validator

from .generation import OpenAITextGenerator, TextGenerator, is_abstention
from .rag import answer_question
from .rate_limit import AskRateLimiter
from .retrieval import DEFAULT_TOP_K, build_retrieval_index, search_retrieval
from .tools import Unit, convert_unit

PDF_DIRECTORY = Path(__file__).resolve().parents[2] / "data" / "sample_docs"
MAX_TOP_K = 20
DEFAULT_FRONTEND_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:8080",
)
DEFAULT_ASK_RATE_LIMIT_PER_MINUTE = 5
DEFAULT_ASK_DAILY_LIMIT = 100


def parse_frontend_origins(value: str | None) -> list[str]:
    if value is None:
        return list(DEFAULT_FRONTEND_ORIGINS)
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def parse_non_negative_int(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value < 0:
        raise ValueError(f"{name} doit être positif ou nul.")
    return value


def identify_client(request: Request) -> str:
    if os.getenv("RENDER", "").lower() == "true":
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            candidate = forwarded_for.split(",", maxsplit=1)[0].strip()
            try:
                return str(ip_address(candidate))
            except ValueError:
                pass

    if request.client is None:
        return "unknown"
    return request.client.host

logger = logging.getLogger(__name__)
app = FastAPI(title="AeroSpec AI")
FRONTEND_ORIGINS = parse_frontend_origins(os.getenv("FRONTEND_ORIGINS"))
ask_rate_limiter = AskRateLimiter(
    per_minute=parse_non_negative_int(
        "ASK_RATE_LIMIT_PER_MINUTE",
        DEFAULT_ASK_RATE_LIMIT_PER_MINUTE,
    ),
    daily=parse_non_negative_int("ASK_DAILY_LIMIT", DEFAULT_ASK_DAILY_LIMIT),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def observe_ask_request(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    if request.url.path != "/ask" or request.method != "POST":
        return await call_next(request)

    request_id = str(uuid4())
    request.state.request_id = request_id
    started_at = perf_counter()

    try:
        response = await call_next(request)
    except Exception as error:
        logger.error(
            json.dumps(
                {
                    "event": "rag_request_completed",
                    "request_id": request_id,
                    "status": "error",
                    "total_duration_ms": (perf_counter() - started_at) * 1_000,
                    "error_type": type(error).__name__,
                }
            )
        )
        raise

    response.headers["X-Request-ID"] = request_id
    total_duration_ms = (perf_counter() - started_at) * 1_000
    observation = getattr(request.state, "rag_observation", None)
    if observation is not None:
        observation["total_duration_ms"] = total_duration_ms
        logger.info(json.dumps(observation))
    elif response.status_code >= 400:
        logger.error(
            json.dumps(
                {
                    "event": "rag_request_completed",
                    "request_id": request_id,
                    "status": "error",
                    "total_duration_ms": total_duration_ms,
                    "error_type": getattr(request.state, "error_type", "HTTPError"),
                }
            )
        )
    return response


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1_000)
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1, le=MAX_TOP_K)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, query: str) -> str:
        stripped_query = query.strip()
        if not stripped_query:
            raise ValueError("query ne doit pas être vide")
        return stripped_query


class SearchResultResponse(BaseModel):
    content: str
    source: str
    page: int
    page_label: str
    distance: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultResponse]


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1_000)
    top_k: int = Field(default=DEFAULT_TOP_K, ge=1, le=MAX_TOP_K)

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, question: str) -> str:
        stripped_question = question.strip()
        if not stripped_question:
            raise ValueError("question ne doit pas être vide")
        return stripped_question


class SourceResponse(BaseModel):
    source: str
    page: int
    page_label: str


class CitationResponse(BaseModel):
    id: str
    source: str
    page: int
    page_label: str


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SourceResponse]
    citations: list[CitationResponse]


class ConvertRequest(BaseModel):
    value: float
    from_unit: Unit
    to_unit: Unit


class ConvertResponse(BaseModel):
    value: float
    from_unit: Unit
    to_unit: Unit
    converted_value: float


@lru_cache(maxsize=1)
def load_retrieval_index() -> Chroma:
    try:
        vector_store, _, _, _ = build_retrieval_index(PDF_DIRECTORY)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    return vector_store


async def get_retrieval_index() -> Chroma:
    return load_retrieval_index()


@lru_cache(maxsize=1)
def load_text_generator() -> TextGenerator:
    try:
        return OpenAITextGenerator()
    except OpenAIError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le service de génération est indisponible.",
        ) from error


async def get_text_generator() -> TextGenerator:
    return load_text_generator()


RetrievalIndex = Annotated[Chroma, Depends(get_retrieval_index)]
AnswerGenerator = Annotated[TextGenerator, Depends(get_text_generator)]


async def get_ask_rate_limiter() -> AskRateLimiter:
    return ask_rate_limiter


async def enforce_ask_rate_limit(
    request: Request,
    limiter: Annotated[AskRateLimiter, Depends(get_ask_rate_limiter)],
) -> None:
    decision = limiter.check(identify_client(request))
    if decision.allowed:
        return

    request.state.rag_observation = {
        "event": "rag_request_rate_limited",
        "request_id": request.state.request_id,
        "status": "rate_limited",
        "limit_type": decision.limit_type,
    }
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Trop de requêtes. Réessayez plus tard.",
    )


AskRateLimit = Annotated[None, Depends(enforce_ask_rate_limit)]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/convert", response_model=ConvertResponse)
async def convert(request: ConvertRequest) -> ConvertResponse:
    try:
        converted_value = convert_unit(
            request.value,
            request.from_unit,
            request.to_unit,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    return ConvertResponse(
        value=request.value,
        from_unit=request.from_unit,
        to_unit=request.to_unit,
        converted_value=converted_value,
    )


@app.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    vector_store: RetrievalIndex,
) -> SearchResponse:
    try:
        results = search_retrieval(vector_store, request.query, request.top_k)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return SearchResponse(
        query=request.query,
        results=[
            SearchResultResponse(
                content=result.content,
                source=Path(result.source).name,
                page=result.page,
                page_label=result.page_label,
                distance=result.distance,
            )
            for result in results
        ],
    )


@app.post("/ask", response_model=AskResponse)
async def ask(
    request: AskRequest,
    http_request: Request,
    _rate_limit: AskRateLimit,
    vector_store: RetrievalIndex,
    llm: AnswerGenerator,
) -> AskResponse:
    try:
        result = answer_question(
            vector_store,
            request.question,
            request.top_k,
            llm,
        )
    except ValueError as error:
        http_request.state.error_type = type(error).__name__
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except OpenAIError as error:
        http_request.state.error_type = type(error).__name__
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Le fournisseur LLM n'a pas pu générer de réponse.",
        ) from error

    response = AskResponse(
        question=request.question,
        answer=result.answer,
        sources=[
            SourceResponse(
                source=source.source,
                page=source.page,
                page_label=source.page_label,
            )
            for source in result.sources
        ],
        citations=[
            CitationResponse(
                id=citation_id[1:-1],
                source=source.source,
                page=source.page,
                page_label=source.page_label,
            )
            for citation_id, source in result.citation_sources.items()
        ],
    )
    http_request.state.rag_observation = {
        "event": "rag_request_completed",
        "request_id": http_request.state.request_id,
        "status": "abstained" if is_abstention(result.answer) else "answered",
        "retrieval_duration_ms": result.retrieval_duration_ms,
        "generation_duration_ms": result.generation_duration_ms,
        "retrieved_count": result.retrieved_count,
        "citation_count": len(result.citation_sources),
    }
    return response
