# RAG evaluation history

`rag_cases.json` is the current benchmark. A `benchmark_version` identifies a
fixed dataset, while `rag_config` identifies the system configuration being
measured. A run is one execution of that configuration on that benchmark.

Archived runs live under `history/<experiment-id>/` with their benchmark
snapshot, unchanged run artifact, and summary generated from that run.
`experiments.json` records their configuration, artifact paths, change,
hypothesis, date, and direct comparability.

Archive a validated run separately from evaluation:

```bash
python -m evaluation.archive_evaluation RUN_ID BENCHMARK_VERSION \
  --change "What changed" \
  --hypothesis "Expected effect"
```

The archiver never executes a benchmark or calls OpenAI. It selects and
validates the cases referenced by the run, generates the summary, records the
archive time automatically, and refuses to overwrite an existing archive.

Only runs with the same `benchmark_version` are directly comparable as a
measure of RAG change. Scores from different benchmarks remain useful on their
own, but their difference does not establish an improvement or regression.
