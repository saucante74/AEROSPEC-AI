import argparse
import json
from pathlib import Path

from backend.app.retrieval import build_retrieval_index, search_retrieval

DEFAULT_TOP_K = 3


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Évalue le retrieval des PDF avec Hit@1 et Hit@3."
    )
    parser.add_argument("pdf_directory", type=Path)
    parser.add_argument("questions_path", type=Path)
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()

    if not arguments.pdf_directory.is_dir():
        raise SystemExit(f"Répertoire introuvable : {arguments.pdf_directory}")
    if not arguments.questions_path.is_file():
        raise SystemExit(f"Dataset introuvable : {arguments.questions_path}")

    questions = json.loads(arguments.questions_path.read_text(encoding="utf-8"))
    vector_store, pdf_count, document_count, chunk_count = build_retrieval_index(
        arguments.pdf_directory
    )

    hit_at_1_count = 0
    hit_at_3_count = 0

    print(f"PDF chargés : {pdf_count}")
    print(f"Documents/pages : {document_count}")
    print(f"Chunks indexés : {chunk_count}")

    for index, item in enumerate(questions, start=1):
        question = item["question"]
        expected_source = item["expected_source"]
        results = search_retrieval(vector_store, question, DEFAULT_TOP_K)
        retrieved_sources = [
            Path(result.source).name for result in results
        ]
        hit_at_1 = retrieved_sources[0] == expected_source
        hit_at_3 = expected_source in retrieved_sources
        hit_at_1_count += hit_at_1
        hit_at_3_count += hit_at_3

        print(f"\nQuestion {index}: {question}")
        print(f"Expected: {expected_source}")
        for rank, result in enumerate(results, start=1):
            source = Path(result.source).name
            print(
                f"Top {rank}: {source} | page {result.page_label} | "
                f"distance {result.distance:.4f}"
            )
        print(f"Hit@1: {'yes' if hit_at_1 else 'no'}")
        print(f"Hit@3: {'yes' if hit_at_3 else 'no'}")

    question_count = len(questions)
    print("\n--- Résumé ---")
    print(f"Questions : {question_count}")
    print(f"Hit@1 : {hit_at_1_count}/{question_count}")
    print(f"Hit@3 : {hit_at_3_count}/{question_count}")


if __name__ == "__main__":
    main()
