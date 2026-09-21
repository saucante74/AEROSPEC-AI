from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from langchain_chroma import Chroma
from pydantic import BaseModel, Field, field_validator

from .retrieval import DEFAULT_TOP_K, build_retrieval_index, search_retrieval


PDF_DIRECTORY = Path(__file__).resolve().parents[2] / "data" / "sample_docs"
MAX_TOP_K = 20

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


RetrievalIndex = Annotated[Chroma, Depends(get_retrieval_index)]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


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
