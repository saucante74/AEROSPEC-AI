export const content = {
  nav: {
    brand: 'AeroSpec AI',
    subtitle: 'Technical Documentation Assistant',
    primaryLabel: 'Primary navigation',
    homeLabel: 'AeroSpec AI home',
    assistant: 'Assistant',
    documents: 'Documents',
    evaluation: 'Evaluation',
    help: 'Help',
  },
  hero: {
    eyebrow: 'Technical document intelligence',
    title: 'Ask. Find. Engineer with confidence.',
    description:
      'Search technical documentation and receive focused answers backed by citations validated against the source material.',
    capabilitiesLabel: 'Assistant capabilities',
    benefits: [
      'Semantic document search',
      'Validated citations',
      'Grounded answers',
      'Engineering-focused',
    ],
  },
  search: {
    eyebrow: 'Document query',
    title: 'Ask a technical question',
    precision: 'Use precise engineering terminology',
    label: 'Technical question',
    placeholder:
      'e.g. What helium leak rate is specified for the MIL-DTL-38999 connector?',
    hint: 'Enter adds a new line. Use the Ask button to submit.',
    submit: 'Ask',
    searching: 'Searching…',
    loading: 'Searching technical documentation…',
    seconds: 's elapsed',
  },
  examples: {
    eyebrow: 'Explore the corpus',
    title: 'Example questions',
    instruction: 'Select an example to edit it before asking.',
    abstentionLabel: 'Abstention example',
    abstentionDescription:
      "This example is intentionally unsupported by the indexed documents and demonstrates the assistant's abstention behavior.",
    questions: [
      'What helium leak rate is specified for the hermetic MIL-DTL-38999 connectors?',
      'What sealing material is specified for the Douglas hermetic MIL-DTL-38999 connectors?',
      'What is the maximum operating temperature of the Molex .093 Series 03-09 nylon connectors?',
    ],
  },
  tools: {
    eyebrow: 'Engineering tools',
    title: 'Unit conversion',
    description:
      'Convert supported engineering units with a deterministic API calculation.',
    value: 'Value',
    from: 'From',
    to: 'To',
    convert: 'Convert',
    converting: 'Converting…',
    result: 'Conversion result',
    emptyValue: 'Enter a value to convert.',
    invalidValue: 'Enter a valid numeric value.',
    apiError: 'The conversion could not be completed. Try again.',
  },
  results: {
    eyebrow: 'Document answer',
    title: 'Result',
    status: 'Sources checked',
    questionAsked: 'Question asked',
  },
  citations: {
    eyebrow: 'Traceability',
    title: 'Validated citations',
    description: 'References resolved by the API against source documents.',
    page: 'Page',
    pdfIndex: 'PDF index',
    empty: 'No validated citations were returned for this answer.',
  },
  documents: {
    eyebrow: 'Source library',
    title: 'Technical documents',
    introduction:
      'Open the five PDF datasheets used by the AeroSpec AI document corpus.',
    listLabel: 'Available technical documents',
    open: 'Open PDF',
    openDocument: 'Open PDF document',
    items: [
      'Amphenol connector datasheet',
      'Harwin connector datasheet',
      'MIL connector datasheet',
      'Molex connector datasheet',
      'Samtec connector datasheet',
    ],
  },
  help: {
    eyebrow: 'Product guide',
    title: 'How AeroSpec AI works',
    introduction:
      'AeroSpec AI helps engineers question a technical document corpus and trace answers back to the retrieved evidence.',
    workflowTitle: 'From question to traceable answer',
    steps: [
      {
        title: 'Ask',
        description:
          'Enter a focused technical question using precise product terminology.',
      },
      {
        title: 'Retrieve',
        description:
          'AeroSpec searches the documentation for the most relevant passages.',
      },
      {
        title: 'Answer & cite',
        description:
          'An answer is generated from the retrieved context and validated citations are displayed.',
      },
    ],
    citations: {
      title: 'Understanding citations',
      description:
        '[S1], [S2], and similar identifiers mark the sources used in the answer.',
      detailsIntroduction: 'A validated citation helps you locate:',
      fields: ['the document', 'the page', 'the PDF index'],
      caveat:
        'A structurally valid citation does not by itself guarantee that an answer is semantically or technically correct.',
    },
    cannotAnswer: {
      title: 'When AeroSpec cannot answer',
      description:
        'When the available information is insufficient, AeroSpec can abstain instead of presenting an unsupported answer.',
    },
    tips: {
      title: 'Tips for better questions',
      items: [
        'Mention the product or connector family.',
        'Ask for one specific characteristic.',
        'Include a known reference when available.',
        'Avoid questions that are excessively broad or vague.',
      ],
    },
    scope: {
      title: 'Current prototype scope',
      introduction:
        'AeroSpec AI is an engineering prototype with a deliberately bounded scope.',
      capabilitiesTitle: 'Current capabilities',
      capabilities: [
        'Semantic search across the document corpus.',
        'Answers grounded in retrieved passages.',
        'Document and page citations.',
        'Unit conversions are calculated by deterministic API code, not generated by the language model.',
      ],
      limitationsTitle: 'Current limitations',
      limitations: [
        'The document corpus is limited.',
        'This prototype is not a certified system.',
        'A structurally valid citation is not a business validation of the answer.',
        'Complex PDF structures can reduce extraction and retrieval quality.',
      ],
    },
  },
  evaluation: {
    eyebrow: 'Measured prototype performance',
    title: 'RAG Evaluation',
    introduction: 'These results were measured on the current benchmark:',
    cases: 'cases',
    answerable: 'answerable',
    unanswerable: 'unanswerable',
    warning:
      'Results measured on a small manually curated benchmark. They characterize this prototype on this dataset and are not production-wide performance guarantees.',
    measuredResults: 'Measured results',
    responseBehavior: 'Response behavior',
    traceability: 'Traceability review',
    provenance: 'Recorded provenance',
    notApplicable: 'Not applicable',
    retrieval: {
      title: 'Retrieval',
      description:
        'Source metrics locate the expected document; evidence metrics require every expected fact to appear in the retrieved passages.',
    },
    abstention: {
      title: 'Abstention',
      description:
        'Abstention behavior is evaluated separately for answerable and unanswerable cases.',
      correctDescription:
        'The system withheld an answer when the benchmark marked the question unanswerable.',
      falseDescription:
        'The system withheld an answer even though the benchmark contained the required evidence.',
    },
    grounding: {
      title: 'Citations & grounding',
      description:
        'Citation structure is measured automatically. Answer correctness, grounding, coverage, and support come from the recorded human review.',
    },
    insight: {
      eyebrow: 'Retrieval insight',
      title: 'Finding the source is not the same as finding the evidence',
      description:
        'The expected source document is often present in the top three results, while the precise passages containing all required facts are retrieved less often. This comparison describes the current benchmark and does not identify a single exclusive cause.',
    },
    metrics: {
      correctAbstentions: 'Correct abstentions',
      falseAbstentions: 'False abstentions',
      responsesWithCitations: 'Responses with citations',
      validEmittedCitationIds: 'Valid emitted citation IDs',
      resolvedCitationIds: 'Resolved citation IDs',
      unknownCitationIds: 'Unknown citation IDs',
      answerCorrectness: 'Answer correctness',
      fullyGrounded: 'Fully grounded substantive responses',
      citationCoverage: 'Citation coverage',
      citationSupport: 'Citation support',
    },
    context: {
      title: 'Evaluation context',
      description:
        'Configuration and dataset metadata recorded with this benchmark run.',
      benchmark: 'Benchmark',
      benchmarkSize: 'Benchmark size',
      manualBenchmark: 'Manually curated RAG benchmark',
      smallScope: 'Small scope',
      dataset: 'Dataset',
      model: 'Generation model',
      provider: 'Provider',
      embeddingModel: 'Embedding model',
      retrievalConfiguration: 'Retrieval configuration',
      corpus: 'Indexed corpus',
      documents: 'documents',
      chunks: 'chunks',
      sourceArtifact: 'Source artifact',
    },
  },
  errors: {
    emptyQuestion: 'Enter a question before searching the documentation.',
    api: 'The answer could not be retrieved. Check that the API is available and try again.',
  },
  footer: {
    subtitle: 'Technical documentation assistant',
    groundedAnswers: 'Grounded answers',
    validatedCitations: 'Validated citations',
    deterministicTools: 'Deterministic tools',
  },
} as const
