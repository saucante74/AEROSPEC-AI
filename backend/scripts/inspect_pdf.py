import argparse
from pathlib import Path

from backend.app.retrieval import (
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_TOP_K,
    EMBEDDING_MODEL,
    build_retrieval_index,
    search_retrieval,
)


DEFAULT_CHARACTERS_TO_DISPLAY = 600


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspecte la recherche sémantique dans un corpus de PDF."
    )
    parser.add_argument(
        "pdf_directory",
        type=Path,
        help="Répertoire contenant les PDF à indexer",
    )
    parser.add_argument("question", help="Question utilisée pour la recherche sémantique")
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=DEFAULT_CHUNK_SIZE,
        help=f"Taille maximale d'un chunk (défaut : {DEFAULT_CHUNK_SIZE})",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=DEFAULT_CHUNK_OVERLAP,
        help=f"Chevauchement entre chunks (défaut : {DEFAULT_CHUNK_OVERLAP})",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=DEFAULT_TOP_K,
        help=f"Nombre de chunks à retrouver (défaut : {DEFAULT_TOP_K})",
    )
    parser.add_argument(
        "--characters",
        type=int,
        default=DEFAULT_CHARACTERS_TO_DISPLAY,
        help=(
            "Nombre maximal de caractères affichés par chunk "
            f"(défaut : {DEFAULT_CHARACTERS_TO_DISPLAY})"
        ),
    )
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()

    if not arguments.pdf_directory.is_dir():
        raise SystemExit(f"Répertoire introuvable : {arguments.pdf_directory}")
    if arguments.chunk_size < 1:
        raise SystemExit("--chunk-size doit être supérieur ou égal à 1")
    if arguments.chunk_overlap < 0:
        raise SystemExit("--chunk-overlap doit être supérieur ou égal à 0")
    if arguments.chunk_overlap >= arguments.chunk_size:
        raise SystemExit("--chunk-overlap doit être inférieur à --chunk-size")
    if arguments.top_k < 1:
        raise SystemExit("--top-k doit être supérieur ou égal à 1")
    if arguments.characters < 1:
        raise SystemExit("--characters doit être supérieur ou égal à 1")

    try:
        vector_store, pdf_count, document_count, chunk_count = build_retrieval_index(
            arguments.pdf_directory,
            chunk_size=arguments.chunk_size,
            chunk_overlap=arguments.chunk_overlap,
        )
    except ValueError as error:
        raise SystemExit(str(error)) from error

    results = search_retrieval(vector_store, arguments.question, arguments.top_k)

    print(f"Répertoire : {arguments.pdf_directory}")
    print(f"Nombre de PDF chargés : {pdf_count}")
    print(f"Modèle d'embeddings : {EMBEDDING_MODEL}")
    print(f"Chunk size : {arguments.chunk_size}")
    print(f"Chunk overlap : {arguments.chunk_overlap}")
    print(f"Nombre total de Documents/pages : {document_count}")
    print(f"Nombre de chunks indexés : {chunk_count}")
    print(f"Question : {arguments.question}")
    print(f"Top-k : {arguments.top_k}")

    for rank, result in enumerate(results, start=1):
        excerpt = result.content[: arguments.characters].strip()
        print(f"\n--- Résultat {rank} ---")
        print(f"Source : {result.source}")
        print(f"Page : {result.page} (label PDF : {result.page_label})")
        print(f"Distance cosinus : {result.distance:.4f}")
        print("Extrait :")
        print(excerpt or "[Aucun texte extrait]")


if __name__ == "__main__":
    main()
