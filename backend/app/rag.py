import re
from dataclasses import dataclass
from pathlib import Path

from .generation import TextGenerator, generate_answer
from .retrieval import SimilaritySearchStore, search_retrieval


@dataclass(frozen=True)
class RagSource:
    source: str
    page: int
    page_label: str


@dataclass(frozen=True)
class CitationValidation:
    valid_ids: list[str]
    unknown_ids: list[str]


@dataclass(frozen=True)
class RagResult:
    answer: str
    sources: list[RagSource]
    citation_validation: CitationValidation
    citation_sources: dict[str, RagSource]


def _validate_citations(answer: str, passage_count: int) -> CitationValidation:
    available_ids = {f"[S{index}]" for index in range(1, passage_count + 1)}
    valid_ids: list[str] = []
    unknown_ids: list[str] = []
    seen_ids: set[str] = set()

    for citation_id in re.findall(r"\[S\d+\]", answer):
        if citation_id in seen_ids:
            continue
        seen_ids.add(citation_id)
        if citation_id in available_ids:
            valid_ids.append(citation_id)
        else:
            unknown_ids.append(citation_id)

    return CitationValidation(valid_ids=valid_ids, unknown_ids=unknown_ids)


def answer_question(
    vector_store: SimilaritySearchStore,
    question: str,
    top_k: int,
    llm: TextGenerator,
) -> RagResult:
    results = search_retrieval(vector_store, question, top_k)
    answer = generate_answer(question, results, llm)
    citation_validation = _validate_citations(answer, len(results))
    citation_sources: dict[str, RagSource] = {}
    for citation_id in citation_validation.valid_ids:
        passage_index = int(citation_id[2:-1]) - 1
        passage = results[passage_index]
        citation_sources[citation_id] = RagSource(
            source=Path(passage.source).name,
            page=passage.page,
            page_label=passage.page_label,
        )

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

    return RagResult(
        answer=answer,
        sources=sources,
        citation_validation=citation_validation,
        citation_sources=citation_sources,
    )
