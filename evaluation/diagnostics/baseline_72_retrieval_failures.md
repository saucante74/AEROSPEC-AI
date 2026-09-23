# Baseline-72 retrieval failure diagnosis

This analysis covers all 22 answerable cases where baseline-72 has
`Evidence Hit@3=false`. It uses the frozen benchmark, archived Top 3 passages,
reconstructed 1000/200 chunks, extracted PDF text, and the three archived
controlled experiments. It does not introduce new evaluation results.

## Primary diagnoses

| Category | Cases | Share |
|---|---:|---:|
| A — Correct document, wrong page/chunk | 5 | 22.7% |
| C — Wrong document / source retrieval failure | 5 | 22.7% |
| G — Table / structured content | 5 | 22.7% |
| B — Correct page/context, incomplete evidence | 4 | 18.2% |
| F — Semantic / terminology mismatch | 2 | 9.1% |
| D — Evidence split across chunks or pages | 1 | 4.5% |
| E, H, uncertain | 0 | 0.0% |

The correct source appears in the Top 3 for 17 failures. Five are true source
retrieval failures. Eight have a primary or secondary table/structured-content
factor, five have chunk-related evidence, and four have a primary or secondary
terminology/semantic factor.

## Main findings

- Dense retrieval commonly finds the correct document but ranks the wrong page
  or section. This accounts for categories A and B and affects nine cases.
- Wrong-page/chunk ranking, true source failures, and tables are tied as the
  largest primary groups. Product codes, shell arrangements, and numeric rows
  often compete with similar pages and related documents.
- The previous chunking experiments provide mixed evidence. Smaller chunks
  recover `rag-040`, `rag-046`, and `rag-054`; increased overlap recovers
  `rag-005`, `rag-046`, `rag-052`, and `rag-056`. Most baseline failures remain.
- `rag-007` requires facts from two separate Harwin pages. It is the only case
  primarily classified as split evidence.
- The evidence anchors all exist in reconstructed baseline chunks. No case is
  primarily classified as missing text or an extraction failure, although
  linearized tables are a major retrieval problem.

Cases `rag-008`, `rag-042`, `rag-043`, `rag-051`, `rag-057`, `rag-058`, and
`rag-060` deserve manual benchmark review because their answers depend on
linearized table headers, rows, or dimension callouts. The review should verify
the anchors and source/page interpretation; it should not silently change the
frozen benchmark.

## Experiment 04 candidates

1. **Hybrid dense and lexical retrieval.** Change only the retrieval strategy,
   with a fixed fusion method and Top 3 output. This directly targets the 12
   table/structured and terminology cases where exact identifiers or technical
   terms are weakly represented by dense similarity. The benchmark can measure
   it without changing evidence semantics. Main risks are lexical noise and the
   need to choose a fusion setting before the controlled run.
2. **Cross-encoder reranking.** Add one fixed reranker over a fixed dense
   candidate pool, retaining three final results. It could plausibly address the
   17 failures where an expected source is already represented or likely to be
   present in a wider candidate set. The benchmark can measure the final Top 3;
   risks are latency, another model dependency, and failure when the candidate
   pool misses the evidence.
3. **Layout-aware table extraction.** Change only the PDF parsing strategy for
   structured pages. It targets the eight table/layout cases. The likely benefit
   is preserving row/header relationships; the risks are added ingestion
   complexity and anchor incompatibility. The frozen benchmark can measure it
   only after confirming that its anchors remain valid under the new extraction.

Hybrid retrieval is the most directly supported next experiment because the
dominant failures involve exact model numbers, arrangement codes, numeric table
rows, and technical labels, and it can be evaluated with the current frozen
anchors and unchanged Top 3 metric definitions.
