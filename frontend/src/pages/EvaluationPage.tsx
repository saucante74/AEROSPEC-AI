import evaluationSummary from '../data/evaluation-summary.json'
import { content } from '../content'

interface Metric {
  numerator: number
  denominator: number
  rate: number | null
}

interface MetricCardProps {
  description?: string
  label: string
  locale: string
  metric: Metric
  notApplicable: string
}

function formatPercentage(rate: number | null, locale: string): string {
  if (rate === null) {
    return ''
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate)
}

function MetricCard({
  description,
  label,
  locale,
  metric,
  notApplicable,
}: MetricCardProps) {
  const percentage = formatPercentage(metric.rate, locale)

  return (
    <article className="evaluation-metric-card" aria-label={label}>
      <h3>{label}</h3>
      <div className="metric-values">
        <strong className="metric-ratio">
          {metric.numerator} / {metric.denominator}
        </strong>
        <span className="metric-percentage">
          {percentage || notApplicable}
        </span>
      </div>
      {metric.rate !== null && (
        <div className="metric-track" aria-hidden="true">
          <span style={{ width: `${metric.rate * 100}%` }} />
        </div>
      )}
      {description && <p>{description}</p>}
    </article>
  )
}

export default function EvaluationPage() {
  const t = content
  const locale = 'en-US'
  const { benchmark, metrics, provenance } = evaluationSummary
  const configuration = provenance.campaign_configuration
  const benchmarkType =
    benchmark.type === 'manual_rag_benchmark'
      ? t.evaluation.context.manualBenchmark
      : benchmark.type
  const benchmarkScope =
    benchmark.scope === 'small'
      ? t.evaluation.context.smallScope
      : benchmark.scope

  const retrievalMetrics = [
    ['Source Hit@1', metrics.retrieval.source_hit_at_1],
    ['Source Hit@3', metrics.retrieval.source_hit_at_3],
    ['Evidence Hit@1', metrics.retrieval.evidence_hit_at_1],
    ['Evidence Hit@3', metrics.retrieval.evidence_hit_at_3],
  ] as const

  const abstentionMetrics = [
    {
      label: t.evaluation.metrics.correctAbstentions,
      metric: metrics.abstention.correct_abstentions,
      description: t.evaluation.abstention.correctDescription,
    },
    {
      label: t.evaluation.metrics.falseAbstentions,
      metric: metrics.abstention.false_abstentions,
      description: t.evaluation.abstention.falseDescription,
    },
  ] as const

  const citationMetrics = [
    [
      t.evaluation.metrics.responsesWithCitations,
      metrics.citations.responses_with_citations,
    ],
    [
      t.evaluation.metrics.validEmittedCitationIds,
      metrics.citations.valid_emitted_citation_ids,
    ],
    [
      t.evaluation.metrics.resolvedCitationIds,
      metrics.citations.resolved_citation_ids,
    ],
    [
      t.evaluation.metrics.unknownCitationIds,
      metrics.citations.unknown_citation_ids,
    ],
    [
      t.evaluation.metrics.answerCorrectness,
      metrics.human_review.answer_correctness,
    ],
    [
      t.evaluation.metrics.fullyGrounded,
      metrics.human_review.fully_grounded_substantive_responses,
    ],
    [
      t.evaluation.metrics.citationCoverage,
      metrics.human_review.citation_coverage,
    ],
    [
      t.evaluation.metrics.citationSupport,
      metrics.human_review.citation_support,
    ],
  ] as const

  return (
    <main className="evaluation-page">
      <section
        className="evaluation-hero content-width"
        aria-labelledby="evaluation-title"
      >
        <p className="eyebrow">{t.evaluation.eyebrow}</p>
        <h1 id="evaluation-title">{t.evaluation.title}</h1>
        <p className="evaluation-introduction">
          {t.evaluation.introduction}{' '}
          <strong>
            {benchmark.total_cases} {t.evaluation.cases}
          </strong>{' '}
          ({benchmark.answerable_cases} {t.evaluation.answerable},{' '}
          {benchmark.unanswerable_cases} {t.evaluation.unanswerable}).
        </p>
        <p className="evaluation-warning">{t.evaluation.warning}</p>
      </section>

      <div className="evaluation-content content-width">
        <section className="evaluation-section" aria-labelledby="retrieval-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="section-label">{t.evaluation.measuredResults}</p>
              <h2 id="retrieval-title">{t.evaluation.retrieval.title}</h2>
            </div>
            <p>{t.evaluation.retrieval.description}</p>
          </div>
          <div className="evaluation-metric-grid">
            {retrievalMetrics.map(([label, metric]) => (
              <MetricCard
                key={label}
                label={label}
                metric={metric}
                locale={locale}
                notApplicable={t.evaluation.notApplicable}
              />
            ))}
          </div>
        </section>

        <section className="evaluation-insight" aria-labelledby="insight-title">
          <div>
            <p className="section-label">{t.evaluation.insight.eyebrow}</p>
            <h2 id="insight-title">{t.evaluation.insight.title}</h2>
            <p>{t.evaluation.insight.description}</p>
          </div>
          <div className="insight-comparison">
            <MetricCard
              label="Source Hit@3"
              metric={metrics.retrieval.source_hit_at_3}
              locale={locale}
              notApplicable={t.evaluation.notApplicable}
            />
            <MetricCard
              label="Evidence Hit@3"
              metric={metrics.retrieval.evidence_hit_at_3}
              locale={locale}
              notApplicable={t.evaluation.notApplicable}
            />
          </div>
        </section>

        <section className="evaluation-section" aria-labelledby="abstention-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="section-label">{t.evaluation.responseBehavior}</p>
              <h2 id="abstention-title">{t.evaluation.abstention.title}</h2>
            </div>
            <p>{t.evaluation.abstention.description}</p>
          </div>
          <div className="evaluation-metric-grid evaluation-metric-grid-two">
            {abstentionMetrics.map(({ label, metric, description }) => (
              <MetricCard
                key={label}
                label={label}
                metric={metric}
                description={description}
                locale={locale}
                notApplicable={t.evaluation.notApplicable}
              />
            ))}
          </div>
        </section>

        <section className="evaluation-section" aria-labelledby="grounding-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="section-label">{t.evaluation.traceability}</p>
              <h2 id="grounding-title">{t.evaluation.grounding.title}</h2>
            </div>
            <p>{t.evaluation.grounding.description}</p>
          </div>
          <div className="evaluation-metric-grid">
            {citationMetrics.map(([label, metric]) => (
              <MetricCard
                key={label}
                label={label}
                metric={metric}
                locale={locale}
                notApplicable={t.evaluation.notApplicable}
              />
            ))}
          </div>
        </section>

        <section className="evaluation-context" aria-labelledby="context-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="section-label">{t.evaluation.provenance}</p>
              <h2 id="context-title">{t.evaluation.context.title}</h2>
            </div>
            <p>{t.evaluation.context.description}</p>
          </div>
          <dl className="context-grid">
            <div>
              <dt>{t.evaluation.context.benchmark}</dt>
              <dd>
                {benchmarkType} · {benchmarkScope}
              </dd>
            </div>
            <div>
              <dt>{t.evaluation.context.benchmarkSize}</dt>
              <dd>
                {benchmark.total_cases} {t.evaluation.cases} ·{' '}
                {benchmark.answerable_cases} {t.evaluation.answerable} ·{' '}
                {benchmark.unanswerable_cases} {t.evaluation.unanswerable}
              </dd>
            </div>
            <div>
              <dt>{t.evaluation.context.dataset}</dt>
              <dd>{provenance.dataset_file}</dd>
            </div>
            <div>
              <dt>{t.evaluation.context.model}</dt>
              <dd>{configuration.model}</dd>
            </div>
            <div>
              <dt>{t.evaluation.context.provider}</dt>
              <dd>{configuration.provider}</dd>
            </div>
            <div>
              <dt>{t.evaluation.context.embeddingModel}</dt>
              <dd>{configuration.embedding_model}</dd>
            </div>
            <div>
              <dt>{t.evaluation.context.retrievalConfiguration}</dt>
              <dd>
                Top {configuration.top_k} · {configuration.chunk_size} /{' '}
                {configuration.chunk_overlap}
              </dd>
            </div>
            <div>
              <dt>{t.evaluation.context.corpus}</dt>
              <dd>
                {configuration.pdf_count} PDF · {configuration.document_count}{' '}
                {t.evaluation.context.documents} · {configuration.chunk_count}{' '}
                {t.evaluation.context.chunks}
              </dd>
            </div>
            <div>
              <dt>{t.evaluation.context.sourceArtifact}</dt>
              <dd>{provenance.source_artifact}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  )
}
