import argparse
from pathlib import Path

from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


DEFAULT_CHUNK_SIZE = 1_000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_TOP_K = 3
DEFAULT_CHARACTERS_TO_DISPLAY = 600
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspecte la recherche sémantique dans les chunks d'un PDF."
    )
    parser.add_argument("pdf_path", type=Path, help="Chemin du PDF à inspecter")
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

    if not arguments.pdf_path.is_file():
        raise SystemExit(f"PDF introuvable : {arguments.pdf_path}")
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

    documents = PyPDFLoader(str(arguments.pdf_path)).load()
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=arguments.chunk_size,
        chunk_overlap=arguments.chunk_overlap,
    )
    chunks = text_splitter.split_documents(documents)
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name="aerospec_retrieval_experiment",
        collection_metadata={"hnsw:space": "cosine"},
    )
    results = vector_store.similarity_search_with_score(
        arguments.question,
        k=arguments.top_k,
    )

    print(f"PDF : {arguments.pdf_path}")
    print(f"Modèle d'embeddings : {EMBEDDING_MODEL}")
    print(f"Chunk size : {arguments.chunk_size}")
    print(f"Chunk overlap : {arguments.chunk_overlap}")
    print(f"Nombre de Documents avant chunking : {len(documents)}")
    print(f"Nombre de chunks indexés : {len(chunks)}")
    print(f"Question : {arguments.question}")
    print(f"Top-k : {arguments.top_k}")

    for rank, (chunk, distance) in enumerate(results, start=1):
        excerpt = chunk.page_content[: arguments.characters].strip()
        source = chunk.metadata.get("source", "inconnue")
        page = chunk.metadata.get("page", "inconnue")
        page_label = chunk.metadata.get("page_label", "inconnue")
        print(f"\n--- Résultat {rank} ---")
        print(f"Source : {source}")
        print(f"Page : {page} (label PDF : {page_label})")
        print(f"Distance cosinus : {distance:.4f}")
        print("Extrait :")
        print(excerpt or "[Aucun texte extrait]")


if __name__ == "__main__":
    main()
