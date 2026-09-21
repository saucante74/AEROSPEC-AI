import logging
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from langchain_chroma import Chroma
from openai import OpenAIError
from pydantic import BaseModel, Field, field_validator

from .generation import OpenAITextGenerator, TextGenerator
from .rag import answer_question
from .retrieval import DEFAULT_TOP_K, build_retrieval_index, search_retrieval
from .tools import Unit, convert_unit

PDF_DIRECTORY = Path(__file__).resolve().parents[2] / "data" / "sample_docs"
MAX_TOP_K = 20

logger = logging.getLogger(__name__)
app = FastAPI(title="AeroSpec AI")


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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except OpenAIError as error:
        logger.error(
            "OpenAI generation failed: exception_type=%s message=%s",
            type(error).__name__,
            str(error),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Le fournisseur LLM n'a pas pu générer de réponse.",
        ) from error

    return AskResponse(
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
