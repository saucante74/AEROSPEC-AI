import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

DEFAULT_CHUNK_SIZE = 1_000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_TOP_K = 3
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_MODEL_REVISION = os.getenv(
    "EMBEDDING_MODEL_REVISION",
    "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
)


@dataclass(frozen=True)
class SearchResult:
    content: str
    source: str
    page: int
    page_label: str
    distance: float


class SimilaritySearchStore(Protocol):
    def similarity_search_with_score(
        self,
        query: str,
        k: int,
    ) -> list[tuple[Document, float]]: ...


def build_retrieval_index(
    pdf_directory: Path,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> tuple[Chroma, int, int, int]:
    pdf_paths = sorted(pdf_directory.glob("*.pdf"))
    if not pdf_paths:
        raise ValueError(f"Aucun PDF trouvé dans : {pdf_directory}")

    documents = []
    for pdf_path in pdf_paths:
        documents.extend(PyPDFLoader(str(pdf_path)).load())

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunks = text_splitter.split_documents(documents)
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={
            "device": "cpu",
            "revision": EMBEDDING_MODEL_REVISION,
        },
        encode_kwargs={"normalize_embeddings": True},
    )
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name="aerospec_retrieval_experiment",
        collection_metadata={"hnsw:space": "cosine"},
    )
    return vector_store, len(pdf_paths), len(documents), len(chunks)


def search_retrieval(
    vector_store: SimilaritySearchStore,
    query: str,
    top_k: int = DEFAULT_TOP_K,
) -> list[SearchResult]:
    matches = vector_store.similarity_search_with_score(query, k=top_k)

    return [
        SearchResult(
            content=document.page_content,
            source=str(document.metadata["source"]),
            page=int(document.metadata["page"]),
            page_label=str(document.metadata["page_label"]),
            distance=float(distance),
        )
        for document, distance in matches
    ]
