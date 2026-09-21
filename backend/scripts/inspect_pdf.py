import argparse
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


DEFAULT_CHUNK_SIZE = 1_000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_CHUNKS_TO_DISPLAY = 4
DEFAULT_CHARACTERS_TO_DISPLAY = 600


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspecte le chunking des Documents produits par PyPDFLoader."
    )
    parser.add_argument("pdf_path", type=Path, help="Chemin du PDF à inspecter")
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
        "--chunks",
        type=int,
        default=DEFAULT_CHUNKS_TO_DISPLAY,
        help=f"Nombre de chunks à afficher (défaut : {DEFAULT_CHUNKS_TO_DISPLAY})",
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

    if not arguments.pdf_path.is_file():
        raise SystemExit(f"PDF introuvable : {arguments.pdf_path}")
    if arguments.chunk_size < 1:
        raise SystemExit("--chunk-size doit être supérieur ou égal à 1")
    if arguments.chunk_overlap < 0:
        raise SystemExit("--chunk-overlap doit être supérieur ou égal à 0")
    if arguments.chunk_overlap >= arguments.chunk_size:
        raise SystemExit("--chunk-overlap doit être inférieur à --chunk-size")
    if arguments.chunks < 1:
        raise SystemExit("--chunks doit être supérieur ou égal à 1")
    if arguments.characters < 1:
        raise SystemExit("--characters doit être supérieur ou égal à 1")

    documents = PyPDFLoader(str(arguments.pdf_path)).load()
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=arguments.chunk_size,
        chunk_overlap=arguments.chunk_overlap,
    )
    chunks = text_splitter.split_documents(documents)

    print(f"PDF : {arguments.pdf_path}")
    print(f"Chunk size : {arguments.chunk_size}")
    print(f"Chunk overlap : {arguments.chunk_overlap}")
    print(f"Nombre de Documents avant chunking : {len(documents)}")
    print(f"Nombre de chunks après chunking : {len(chunks)}")

    for index, chunk in enumerate(chunks[: arguments.chunks], start=1):
        excerpt = chunk.page_content[: arguments.characters].strip()
        print(f"\n--- Chunk {index} ({len(chunk.page_content)} caractères) ---")
        print(f"Metadata : {chunk.metadata}")
        print("Contenu :")
        print(excerpt or "[Aucun texte extrait]")


if __name__ == "__main__":
    main()
