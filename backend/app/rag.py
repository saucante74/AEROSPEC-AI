from dataclasses import dataclass
from pathlib import Path

from langchain_chroma import Chroma

from .generation import TextGenerator, generate_answer
from .retrieval import search_retrieval


@dataclass(frozen=True)
class RagSource:
    source: str
    page: int
    page_label: str


@dataclass(frozen=True)
class RagResult:
    answer: str
    sources: list[RagSource]


def answer_question(
    vector_store: Chroma,
    question: str,
    top_k: int,
    llm: TextGenerator,
) -> RagResult:
    results = search_retrieval(vector_store, question, top_k)
    answer = generate_answer(question, results, llm)

    sources: list[RagSource] = []
    seen_sources: set[tuple[str, int]] = set()
    for result in results:
        source = Path(result.source).name
        source_key = (source, result.page)
        if source_key in seen_sources:
            continue
        seen_sources.add(source_key)
        sources.append(
            RagSource(
                source=source,
                page=result.page,
                page_label=result.page_label,
            )
        )

    return RagResult(answer=answer, sources=sources)
