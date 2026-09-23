# AeroSpec AI

AeroSpec AI is a demonstration RAG application for asking questions about a
small corpus of technical connector documentation. It returns focused answers
with document and page citations, exposes the source PDFs in the frontend, and
includes deterministic unit conversion and a measured evaluation view.

The current UI, corpus, and query workflow are primarily English. This is a
portfolio prototype rather than a certified engineering system.

## Architecture

```text
React/Vite frontend
        ↓ HTTP
FastAPI backend
        ↓
PDF retrieval + Chroma vector store
        ↓
Grounded OpenAI generation + validated citations
```

See [the architecture guide](docs/architecture.md) and
[architecture decisions](docs/decisions/) for the design details.

## Repository structure

```text
backend/           FastAPI application, scripts, and tests
frontend/          React/Vite application and frontend tests
data/sample_docs/  Five sample technical PDFs used by the RAG corpus
evaluation/        Benchmarks, evaluation scripts, results, and tests
docs/              Architecture, deployment, and decision records
```

The frontend **Documents** page opens the same five PDFs stored in
`data/sample_docs`; the files are not duplicated under `frontend`.

## Prerequisites

- Python 3.12
- Node.js 24 or newer and npm
- `OPENAI_API_KEY` for `/ask` and end-to-end RAG evaluation

Copy the environment template and replace placeholder values as needed:

```bash
cp .env.example .env
```

`FRONTEND_ORIGINS`, `ASK_RATE_LIMIT_PER_MINUTE`, and `ASK_DAILY_LIMIT` have
local defaults. `VITE_API_BASE_URL` defaults to `http://localhost:8000` in the
frontend build. Do not commit `.env` or real credentials.

## Run locally

Run commands from the repository root unless a step changes directory.

### Backend

```bash
python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install --requirement backend/requirements-dev.txt
python -m uvicorn backend.app.main:app --reload --env-file .env
```

The embedding model is downloaded on first use. The first `/ask` or `/search`
request also builds the in-memory index from the sample PDFs.

### Frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Local endpoints:

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- Health check: <http://localhost:8000/health>

## Tests and quality checks

With the backend virtual environment active, run from the repository root:

```bash
python -m unittest discover -s backend/tests
python -m ruff check backend/app backend/scripts backend/tests evaluation
python -m mypy
```

Run frontend checks from `frontend/`:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## RAG evaluation

Measure retrieval without an LLM call:

```bash
python -m evaluation.scripts.evaluate_rag_retrieval \
  data/sample_docs evaluation/benchmarks/rag_cases.json
```

Run the end-to-end benchmark with `OPENAI_API_KEY` set:

```bash
python -m evaluation.scripts.evaluate_rag \
  data/sample_docs evaluation/benchmarks/rag_cases.json
```

Regenerate the frontend summary from the current saved run without calling an
LLM:

```bash
python -m evaluation.scripts.evaluation_summary
```

See [evaluation/README.md](evaluation/README.md) for artifact and archival
details. The benchmark is small and manually curated. Retrieval quality is
measured separately, but evaluation results apply only to this bounded dataset.
The system is designed to reduce and measure unsupported answers, not guarantee
their absence.

## Docker

Both images use the repository root as their build context:

```bash
docker build --file backend/Dockerfile --tag aerospec-backend .
docker run --rm --publish 8000:8000 --env-file .env aerospec-backend
```

```bash
docker build --file frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  --tag aerospec-frontend .
docker run --rm --publish 8080:80 aerospec-frontend
```

The containerized frontend is then available at <http://localhost:8080>.

## Production deployment

The static frontend is deployed to Vercel and the Dockerized backend to Render.
See [docs/deployment.md](docs/deployment.md) for the required build settings,
environment variables, CORS configuration, rate limits, and cold-start notes.
