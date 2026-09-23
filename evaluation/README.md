# RAG evaluation

The evaluation workspace separates source data, generated artifacts, immutable
history, diagnostics, tooling, tests, and the experiment registry.

```text
benchmarks/          Current RAG and retrieval datasets
runs/current/        Latest generated RAG run and summary
runs/history/        Immutable experiment snapshots
diagnostics/         Derived analyses that are not official metrics
scripts/             Evaluation, summary, and archival commands
tests/               Deterministic evaluation tests
experiments.json     Catalogue of archived experiments
```

`benchmarks/rag_cases.json` is the current benchmark. Run the complete RAG
evaluation from the repository root with:

```bash
python -m evaluation.scripts.evaluate_rag \
  data/sample_docs evaluation/benchmarks/rag_cases.json
```

This command writes the current run to `runs/current/rag_run.json` and the
frontend summary to `frontend/src/data/evaluation-summary.json`. The frontend
summary also joins registered experiments with their archived summaries to
expose evaluation history. To regenerate only the current internal summary or
synchronize the frontend without calling OpenAI:

```bash
python -m evaluation.scripts.evaluation_summary \
  --output evaluation/runs/current/summary.json
python -m evaluation.scripts.evaluation_summary
```

Archive a validated current run separately from evaluation:

```bash
python -m evaluation.scripts.archive_evaluation RUN_ID BENCHMARK_VERSION \
  --change "What changed" \
  --hypothesis "Expected effect"
```

The archiver validates the current benchmark and run, writes an immutable
snapshot under `runs/history/<experiment-id>/`, generates its summary, and
updates `experiments.json`. It never executes the benchmark or calls OpenAI.

`benchmark_version` identifies the fixed dataset used by a run. `rag_config`
records the system configuration measured on that dataset. Experiments are
directly comparable as a measure of RAG change only when their
`benchmark_version` values are identical.
