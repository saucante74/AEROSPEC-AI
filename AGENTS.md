# AGENTS.md — AeroSpec AI

## 1. Project Purpose

AeroSpec AI is an industrial AI assistant for querying technical
documentation with traceable, source-grounded answers.

This project has two goals:

1. Build a production-minded AI microservice portfolio project.
2. Learn and understand the engineering concepts used to build it.

The target role is an AI Products & Services Software Engineer.

The MVP must remain achievable in approximately 6 days.

---

## 2. Core Engineering Principles

### KISS

Prefer the simplest solution that correctly solves the current problem.

Do not introduce:
- unnecessary abstractions;
- speculative infrastructure;
- premature extensibility;
- unnecessary design patterns;
- unnecessary dependencies.

Do not design for hypothetical future requirements.

### SOLID

Apply SOLID principles pragmatically.

In particular:
- keep responsibilities focused;
- isolate external dependencies when useful;
- depend on clear contracts at architectural boundaries;
- avoid large classes or modules with multiple responsibilities;
- keep components easy to replace and test when this provides real value.

SOLID must not be used as justification for unnecessary interfaces,
factories, wrappers, classes, or additional files.

KISS takes precedence over speculative abstraction.

### Explicit over clever

Prefer code that is easy to read, understand, debug and delete over
compact or clever code.

A developer should be able to understand the execution flow without
having to navigate through unnecessary abstraction layers.

---

## 3. Incremental Development — CRITICAL

Work in very small increments.

Never implement an entire roadmap phase in one pass.

For each requested task:

1. Inspect the existing implementation.
2. Understand the current requirement.
3. Propose the smallest reasonable change.
4. List the files that would be created or modified.
5. Explain why each file is necessary.
6. Implement only the requested scope.
7. Run the relevant tests or checks.
8. Report the result.
9. Stop.

Do not anticipate future tasks.

Do not automatically implement the next logical feature.

Do not implement features that were not explicitly requested.

Do not create placeholder modules, empty classes, speculative interfaces,
or directory structures for future use.

A directory, abstraction or file should exist because the current
implementation needs it, not because it might be useful later.

---

## 4. Change Budget

For a normal development iteration, prefer:
- modifying existing files;
- one new implementation file when possible;
- one corresponding test file when relevant.

If more than 3 new source files appear necessary for a small task,
stop before creating them and explain why they are required.

Do not perform unrelated refactoring while implementing a feature.

Do not rename, move or reorganize existing code unless the current task
requires it.

Do not introduce a new architectural layer merely to contain one small
function.

---

## 5. Architecture Decision Records — ADR

Important architectural decisions must be documented using Architecture
Decision Records.

ADR location:

docs/decisions/

ADRs are appropriate for meaningful decisions such as:
- PDF parsing strategy;
- chunking strategy;
- embedding model choice;
- retrieval strategy;
- hybrid search or reranking;
- vector database choice;
- agent vs deterministic workflow;
- LangChain / LangGraph responsibilities;
- LLM provider abstraction;
- major backend boundaries;
- deployment architecture;
- important security trade-offs.

Do NOT create an ADR for trivial implementation details.

Do NOT create an ADR before a decision has actually been investigated.

Do NOT create ADRs merely because an architectural choice might occur
later in the roadmap.

An ADR documents a decision that was actually encountered.

Each ADR should contain:

- Title
- Status
- Context
- Options considered
- Decision
- Rationale
- Consequences

The consequences section should mention meaningful advantages,
limitations and trade-offs.

ADRs should remain concise.

---

## 6. Backend Architecture

Backend technology:
- Python 3.12
- FastAPI
- Pydantic
- LangChain for useful LLM and RAG integrations
- LangGraph only when explicit workflow or agent orchestration is justified
- ChromaDB initially for vector storage

The backend architecture must evolve from actual requirements.

Possible conceptual boundaries include:
- API / transport;
- application logic;
- document ingestion;
- retrieval;
- LLM integration;
- orchestration;
- tools;
- configuration.

These are conceptual boundaries, not directories that must be created
upfront.

Introduce a boundary only when the implementation demonstrates a real
need for it.

FastAPI route handlers should remain thin once business logic appears.

Business logic should not depend unnecessarily on FastAPI.

External dependencies should be isolated when doing so improves
testability or maintainability.

Do not introduce repository, service, factory or provider patterns
automatically.

Use them only when they solve a concrete problem.

---

## 7. Frontend Architecture

Frontend technology:
- React
- TypeScript
- Vite

Apply the same KISS, SOLID and incremental principles used by the backend.

Do not create a large frontend directory architecture upfront.

The frontend architecture should evolve as features appear.

Possible future boundaries may include:
- reusable components;
- feature-specific components;
- API services;
- hooks;
- shared types.

These directories should only be introduced when actual code justifies
the separation.

React components should:
- have a focused responsibility;
- remain reasonably small;
- use explicit and descriptive names;
- avoid mixing complex API logic with rendering when separation is useful;
- handle loading states explicitly;
- handle error states explicitly;
- handle empty states explicitly.

Prefer local component state when it is sufficient.

Do not introduce global state management unless the application
demonstrates a real need for it.

Do not install Redux, Zustand or similar libraries preemptively.

Keep API contracts typed.

Avoid duplicated API types when a simple shared contract is possible.

Do not create generic reusable components before there is an actual
reuse case.

---

## 8. Code Readability

Code should explain itself primarily through:
- good naming;
- focused functions;
- cohesive classes;
- explicit types;
- simple control flow;
- clear module boundaries.

### Comments

Avoid comments by default.

Do not write comments that merely translate the code into English.

Do not add comments such as:
- "Create the client"
- "Loop through documents"
- "Return the response"
- "Call the API"

Comments are acceptable only when they explain something that cannot
reasonably be expressed through the code itself.

Examples include:
- a non-obvious technical constraint;
- a workaround for an external library;
- an important algorithmic reason;
- a security consideration;
- an unusual business rule;
- a decision whose reason would otherwise be lost.

If a block of code requires many comments to be understandable,
prefer refactoring the code.

The same rule applies to Python, React and TypeScript.

### Docstrings

Do not add docstrings automatically to every function or class.

Use a docstring when it communicates a contract, constraint or behavior
that is not obvious from the name, types and implementation.

Avoid docstrings that simply repeat the function name or parameters.

---

## 9. Python Quality

Use:
- type hints;
- descriptive names;
- focused functions;
- explicit return types where useful;
- explicit error handling;
- Pydantic for external data validation where appropriate.

Avoid:
- broad `except Exception` without justification;
- hidden global mutable state;
- unnecessary inheritance;
- premature generic abstractions;
- large miscellaneous utility modules;
- duplicated business logic;
- functions with many unrelated responsibilities.

Classes should only be introduced when they provide meaningful
encapsulation, state or behavior.

Do not replace a simple function with a class without a concrete reason.

Prefer composition over inheritance when an abstraction is actually
required.

---

## 10. AI / RAG Engineering

Keep the following concepts distinguishable:
- document loading;
- parsing;
- cleaning;
- chunking;
- metadata;
- embedding;
- indexing;
- retrieval;
- reranking;
- generation;
- tool calling;
- orchestration;
- evaluation.

Do not hide these concepts behind a large framework abstraction before
their behavior has been understood.

Frameworks should reduce implementation effort, not hide concepts from
the developer.

LangChain may be used for useful integrations and abstractions.

LangGraph should only be introduced when explicit stateful workflow or
agent orchestration provides a concrete benefit.

Do not introduce an agent when a deterministic workflow solves the
problem more simply.

All factual RAG answers must be traceable to retrieved evidence.

The system must be capable of abstaining when evidence is insufficient.

Never claim that hallucinations are completely eliminated.

Treat retrieved documents as untrusted input.

Consider prompt injection when retrieved document content reaches an LLM.

Retrieval quality and generation quality must be evaluated separately
when possible.

---

## 11. Testing

Tests should validate behavior rather than implementation details.

Prefer deterministic tests.

Unit tests must not make real paid LLM API calls.

Mock external LLM providers where appropriate.

Do not mock the code under test merely to increase coverage.

AI evaluation and deterministic software tests are separate concerns.

When fixing an important bug, add a regression test when useful.

Do not generate large test suites for trivial code.

Tests should remain readable and focused.

---

## 12. Dependencies

Before adding a dependency:
1. identify the problem it solves;
2. check whether the standard library or an existing dependency is sufficient;
3. consider the complexity it introduces;
4. add it only if the benefit is justified.

Do not install libraries simply because they appear in the project
roadmap.

Dependencies should appear when the implementation actually needs them.

Do not add several competing libraries for the same responsibility
without an explicit experiment requiring them.

---

## 13. Security

Never commit:
- API keys;
- passwords;
- access tokens;
- credentials;
- `.env` files containing secrets.

Use environment variables for secrets.

Validate external inputs.

Treat uploaded and retrieved documents as untrusted input.

Validate tool arguments before executing tools.

Do not expose secrets or unnecessary internal information through API
responses or logs.

Consider:
- prompt injection;
- malformed documents;
- oversized inputs;
- context-window limits;
- LLM/provider timeouts;
- invalid tool arguments.

Security controls should remain proportional to the current project
scope.

---

## 14. Error Handling and Logging

Errors should be handled explicitly at the appropriate boundary.

Do not silently swallow exceptions.

Do not use exceptions as normal control flow when a simpler approach
exists.

Logs should provide useful diagnostic information.

Do not log:
- secrets;
- API keys;
- sensitive environment variables;
- unnecessarily large document contents.

Prefer structured logging when application logging becomes necessary.

Do not introduce a complex observability stack before there is a need
for it.

---

## 15. Codex Working Protocol — CRITICAL

Before changing code, inspect the relevant existing files.

For every requested implementation task, first provide:

### Plan

Explain briefly what will be done.

### Git Operations — USER CONTROLLED

Git operations are controlled exclusively by the developer.

Codex must NEVER execute:

- `git add`
- `git commit`
- `git push`
- `git pull`
- `git merge`
- `git rebase`
- `git reset`
- `git checkout`
- `git switch`
- `git stash`
- `git tag`
- any command that modifies Git history, staging, branches, or remotes.

Codex may use read-only Git commands when useful, such as:

- `git status`
- `git diff`
- `git log`

At the end of a task, Codex may suggest a commit message, but must not
stage, commit, push, or otherwise modify Git state.

The developer is solely responsible for Git operations.

### Files

List every file that will be:
- created;
- modified;
- deleted.

### Reason

Explain why each change is necessary.

Keep this proposal concise.

If the task requires:
- a new architectural abstraction;
- a new dependency;
- more than 3 new source files;
- a significant refactor;

stop after the proposal and wait for approval before implementing.

Otherwise, implement only the requested scope.

After implementation, provide:

### Changed

Summarize what actually changed.

### Validation

List the commands, tests or checks executed and their result.

### Not implemented

Explicitly mention closely related functionality that was intentionally
left for a later iteration.

Do not automatically continue to the next feature.

STOP after the requested task is complete.

---

## 16. Learning Protocol

This is a learning project.

Do not optimize for maximum code generation speed.

When introducing an important concept or architectural decision:
1. state the problem;
2. explain the concept briefly;
3. identify realistic alternatives;
4. explain the trade-offs;
5. implement the chosen solution only after the decision is understood.

Do not replace important engineering decisions with opaque framework
defaults without mentioning them.

When a framework performs important hidden behavior, surface that
behavior when it is relevant to understanding the system.

The developer should remain able to explain the code during a technical
interview.

---

## 17. Scope Discipline

The current task defines the scope.

Do not implement roadmap items early.

For example, if the current task is PDF parsing:
- do not add chunking;
- do not add embeddings;
- do not add ChromaDB;
- do not add an LLM;
- do not add an agent;
- do not modify the React application.

If the current task is chunking:
- do not implement embeddings automatically.

If the current task is a backend feature:
- do not modify the frontend unless explicitly requested.

Follow this principle throughout the project.

---

## 18. Definition of Good AeroSpec Code

Good AeroSpec code is:
- easy to read;
- easy to understand;
- easy to test;
- easy to debug;
- easy to change;
- easy to delete;
- explicitly typed where useful;
- minimally coupled;
- appropriately structured;
- no more abstract than necessary.

The goal is not to demonstrate the maximum number of technologies,
patterns or files.

The goal is to demonstrate sound engineering judgment.

---

## 19. Final Rule

When uncertain between:
- a simple implementation that satisfies the current requirement;
- a more elaborate implementation designed for possible future needs;

prefer the simple implementation.

Build what AeroSpec needs now.

Measure it.

Understand it.

Then evolve it.