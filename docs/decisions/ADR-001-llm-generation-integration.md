# ADR-001 — LLM generation integration

## Status

Accepted

## Context

The first grounded-generation component needs to send a question and retrieved
passages to an LLM. The prompt construction must remain testable without a
network call, and the provider integration must not leak into retrieval or the
FastAPI layer.

## Options considered

- Use the official OpenAI SDK with the Responses API behind an injectable text
  generation boundary.
- Use `langchain-openai` and LangChain chat-model abstractions.
- Call the OpenAI HTTP API directly.

## Decision

Use the official OpenAI Python SDK and the Responses API for the current
integration. The generation component depends on a small `TextGenerator`
protocol, and the OpenAI adapter implements that protocol in the same module.
The model is configurable when the adapter is created, with `gpt-5.4-mini` as
the default.

## Rationale

The official SDK provides the required API integration without adding a
framework abstraction around one model call. The injectable protocol makes
prompt and workflow tests deterministic and independent of OpenAI. Keeping the
adapter local avoids a provider or factory layer before the application needs
one.

## Consequences

- Production use currently requires the `openai` package and an
  `OPENAI_API_KEY`.
- Tests can replace the adapter with a local fake and make no network calls.
- OpenAI is the first adapter, not a permanent product-wide provider choice;
  another adapter can implement the same narrow protocol if a concrete need
  appears.
- Grounding is instructed by the prompt but must later be measured through RAG
  evaluation; the prompt alone cannot guarantee model behavior.
