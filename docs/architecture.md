# AeroSpec AI — Architecture

## Purpose

This document describes the architecture and repository organization of AeroSpec AI.

It is intentionally concise.

Rules:
- `AGENTS.md` defines how the project must be developed.
- This file defines where responsibilities belong.
- `docs/decisions/` contains Architecture Decision Records explaining important technical decisions.
- Do not create future modules or directories before they are needed.

---

## System Architecture

AeroSpec AI is composed of a React frontend and a FastAPI backend.

Target application flow:

```text
┌─────────────────┐
│ React Frontend  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ FastAPI Backend │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Application Workflow│
└──────┬─────────┬────┘
       │         │
       ▼         ▼
 Retrieval     Tools
       │
       ▼
   Vector DB
       │
       ▼
 Retrieved context
       │
       ▼
      LLM
       │
       ▼
 Answer + Sources
```

LangChain may be used for RAG/LLM integrations.

LangGraph is introduced only if stateful workflow or agent orchestration
is actually required.

A deterministic workflow is preferred when an agent is unnecessary.

---

## RAG Architecture

Document ingestion and user queries are separate flows.

### Ingestion

```text
PDF
 ↓
Parsing
 ↓
Documents + metadata
 ↓
Chunking
 ↓
Embeddings
 ↓
Vector DB
```

### Query

```text
Question
 ↓
Retrieval
 ↓
Relevant chunks
 ↓
Optional reranking
 ↓
LLM
 ↓
Grounded answer + sources
```

Each step must be introduced incrementally.

Do not implement later stages automatically when working on an earlier stage.

---

## Repository Structure

```text
AEROSPEC-AI/
│
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── scripts/
│   └── tests/
│
├── frontend/
│   └── src/
│
├── data/
│   └── sample_docs/
│
├── evaluation/
│
├── docs/
│   ├── architecture.md
│   └── decisions/
│       ├── ADR-001-<decision>.md
│       ├── ADR-002-<decision>.md
│       └── ...
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── README.md
└── .env.example
```

This is the project structure, not a requirement to populate every
directory immediately.

Create files only when the current feature requires them.

---

## Backend

The backend uses:

- Python 3.12
- FastAPI
- Pydantic
- LangChain when useful
- LangGraph only when justified
- ChromaDB for the initial vector store

Keep HTTP concerns separate from application logic when application
logic becomes significant.

Expected responsibilities may eventually include:

```text
API
 ↓
Application logic
 ↓
Retrieval / LLM / Tools
 ↓
External dependencies
```

These are responsibility boundaries, not mandatory directories.

Do not create `services/`, `repositories/`, `interfaces/`, `adapters/`
or similar layers until the code actually requires them.

---

## Frontend

The frontend uses:

- React
- TypeScript
- Vite

Start simple.

As the application grows, the frontend may evolve toward:

```text
src/
├── components/
├── features/
├── services/
├── types/
├── App.tsx
└── main.tsx
```

Do not create these directories in advance.

Rules:

- components have focused responsibilities;
- API calls should not be duplicated across components;
- API contracts should be typed;
- prefer local state when sufficient;
- no global state library unless justified;
- avoid large components with unrelated responsibilities.

---

## Data and Metadata

Retrieved information must remain traceable to its source.

A document or chunk may carry metadata such as:

```text
filename
source
page
manufacturer
document_type
chunk_id
```

The exact metadata model will be decided from real ingestion needs.

Do not introduce fields only because they appear in this example.

At minimum, retrieved evidence must eventually be traceable to its
original document and location.

---

## Dependency Rules

Prefer this dependency direction:

```text
Frontend
   ↓ HTTP
API
   ↓
Application logic
   ↓
Retrieval / LLM / Tools
   ↓
External libraries and services
```

Avoid reverse dependencies.

Examples:

```text
application logic → FastAPI Request       NO
retrieval code    → React concerns        NO
LLM integration   → HTTP response models  NO
API               → application logic     YES
application logic → retrieval             YES
```

Keep these rules pragmatic.

Do not add abstractions solely to satisfy a diagram.

---

## Architecture Decision Records

Important technical decisions are documented in:

```text
docs/decisions/
```

Naming convention:

```text
ADR-001-short-decision-name.md
ADR-002-short-decision-name.md
ADR-003-short-decision-name.md
```

Use an ADR for decisions with meaningful alternatives or trade-offs.

Likely examples during AeroSpec development:

```text
ADR-001-pdf-parsing-strategy.md
ADR-002-chunking-strategy.md
ADR-003-vector-store.md
ADR-004-agent-vs-workflow.md
```

These are examples only.

Do not create them until the corresponding decision is actually made.

ADR format:

```text
# ADR-XXX — Decision title

## Status
Accepted

## Context
What problem required a decision?

## Options
What realistic alternatives were considered?

## Decision
What was chosen?

## Consequences
What trade-offs does the decision introduce?
```

`architecture.md` describes how the system is structured.

ADRs explain why important architectural choices were made.

---

## Testing and Evaluation

Keep conventional software testing and AI evaluation distinct.

```text
tests/
    deterministic software behavior

evaluation/
    retrieval and RAG quality
```

Tests should not make real paid LLM calls.

Evaluation will eventually measure aspects such as:

- retrieval relevance;
- source correctness;
- grounded answers;
- abstention behavior;
- latency.

Only introduce evaluation infrastructure when the project reaches that stage.

---

## Security

Treat both user input and document content as untrusted.

Never commit secrets.

Validate external input and tool arguments.

Retrieved document content must not automatically be treated as trusted
LLM instructions.

Security mechanisms should remain proportional to the current project scope.

---

## Architecture Evolution

The architecture evolves with the project.

The intended progression is:

```text
PDF parsing
    ↓
Chunking
    ↓
Embeddings
    ↓
Vector storage
    ↓
Retrieval
    ↓
RAG generation
    ↓
Evaluation
    ↓
Tools / workflow
    ↓
React integration
    ↓
Containerization / deployment
```

A future step in this diagram is not permission to implement it early.

When architecture changes:

1. keep the solution as simple as possible;
2. create an ADR if a meaningful technical decision was made;
3. update this file if the system structure changed.

Do not redesign unrelated parts of the project.