export const supportedLanguages = ['en', 'fr', 'it'] as const

export type Language = (typeof supportedLanguages)[number]

export const defaultLanguage: Language = 'en'
export const languageStorageKey = 'aerospec.language'

const english = {
  nav: {
    brand: 'AeroSpec AI',
    subtitle: 'Technical Documentation Assistant',
    primaryLabel: 'Primary navigation',
    homeLabel: 'AeroSpec AI home',
    assistant: 'Assistant',
    evaluation: 'Evaluation',
    help: 'Help',
    languageSelector: 'Language selection',
    selectLanguage: {
      en: 'Switch to English',
      fr: 'Passer au français',
      it: 'Passa all’italiano',
    },
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
    loading: 'Searching documents and preparing an answer…',
  },
  examples: {
    eyebrow: 'Explore the corpus',
    title: 'Example questions',
    instruction: 'Select an example to edit it before asking.',
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
  help: {
    eyebrow: 'Product guide',
    title: 'How AeroSpec AI works',
    introduction:
      'AeroSpec AI helps engineers question a technical document corpus and trace answers back to the retrieved evidence.',
    workflowTitle: 'From question to traceable answer',
    steps: [
      {
        title: 'Ask',
        description: 'Enter a focused technical question using precise product terminology.',
      },
      {
        title: 'Retrieve',
        description: 'AeroSpec searches the documentation for the most relevant passages.',
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

type TranslationShape<Value> = Value extends string
  ? string
  : Value extends readonly unknown[]
    ? { readonly [Index in keyof Value]: TranslationShape<Value[Index]> }
    : Value extends object
      ? { readonly [Key in keyof Value]: TranslationShape<Value[Key]> }
      : never

export type Translations = TranslationShape<typeof english>

const french = {
  nav: {
    brand: 'AeroSpec AI',
    subtitle: 'Assistant de documentation technique',
    primaryLabel: 'Navigation principale',
    homeLabel: 'Accueil AeroSpec AI',
    assistant: 'Assistant',
    evaluation: 'Évaluation',
    help: 'Aide',
    languageSelector: 'Sélection de la langue',
    selectLanguage: {
      en: 'Passer à l’anglais',
      fr: 'Passer au français',
      it: 'Passer à l’italien',
    },
  },
  hero: {
    eyebrow: 'Intelligence documentaire technique',
    title: 'Demandez. Trouvez. Concevez en toute confiance.',
    description:
      'Recherchez dans la documentation technique et obtenez des réponses ciblées, appuyées par des citations validées dans les sources.',
    capabilitiesLabel: 'Capacités de l’assistant',
    benefits: [
      'Recherche documentaire sémantique',
      'Citations validées',
      'Réponses fondées sur les sources',
      'Conçu pour l’ingénierie',
    ],
  },
  search: {
    eyebrow: 'Requête documentaire',
    title: 'Posez une question technique',
    precision: 'Utilisez une terminologie technique précise',
    label: 'Question technique',
    placeholder:
      'Ex. Quel taux de fuite à l’hélium est spécifié pour le connecteur MIL-DTL-38999 ?',
    hint: 'Entrée ajoute une nouvelle ligne. Utilisez le bouton Demander pour envoyer.',
    submit: 'Demander',
    searching: 'Recherche…',
    loading: 'Recherche dans les documents et préparation de la réponse…',
  },
  examples: {
    eyebrow: 'Explorer le corpus',
    title: 'Exemples de questions',
    instruction: 'Sélectionnez un exemple pour le modifier avant de l’envoyer.',
    questions: [
      'Quel taux de fuite à l’hélium est spécifié pour les connecteurs hermétiques MIL-DTL-38999 ?',
      'Quel matériau d’étanchéité est spécifié pour les connecteurs hermétiques Douglas MIL-DTL-38999 ?',
      'Quelle est la température maximale de fonctionnement des connecteurs nylon Molex .093 Series 03-09 ?',
    ],
  },
  tools: {
    eyebrow: 'Outils d’ingénierie',
    title: 'Conversion d’unités',
    description:
      'Convertissez les unités d’ingénierie prises en charge avec un calcul déterministe de l’API.',
    value: 'Valeur',
    from: 'Depuis',
    to: 'Vers',
    convert: 'Convertir',
    converting: 'Conversion…',
    result: 'Résultat de la conversion',
    emptyValue: 'Saisissez une valeur à convertir.',
    invalidValue: 'Saisissez une valeur numérique valide.',
    apiError: 'La conversion n’a pas pu être effectuée. Réessayez.',
  },
  results: {
    eyebrow: 'Réponse documentaire',
    title: 'Résultat',
    status: 'Sources vérifiées',
    questionAsked: 'Question posée',
  },
  citations: {
    eyebrow: 'Traçabilité',
    title: 'Citations validées',
    description: 'Références résolues par l’API dans les documents sources.',
    page: 'Page',
    pdfIndex: 'Index PDF',
    empty: 'Aucune citation validée n’a été retournée pour cette réponse.',
  },
  help: {
    eyebrow: 'Guide du produit',
    title: 'Comment fonctionne AeroSpec AI',
    introduction:
      'AeroSpec AI aide les ingénieurs à interroger un corpus documentaire technique et à relier les réponses aux éléments retrouvés.',
    workflowTitle: 'De la question à une réponse traçable',
    steps: [
      {
        title: 'Demander',
        description:
          'Saisissez une question technique ciblée avec une terminologie produit précise.',
      },
      {
        title: 'Rechercher',
        description:
          'AeroSpec recherche les passages les plus pertinents dans la documentation.',
      },
      {
        title: 'Répondre et citer',
        description:
          'Une réponse est générée depuis le contexte récupéré et les citations validées sont affichées.',
      },
    ],
    citations: {
      title: 'Comprendre les citations',
      description:
        '[S1], [S2] et les identifiants similaires signalent les sources utilisées dans la réponse.',
      detailsIntroduction: 'Une citation validée permet de retrouver :',
      fields: ['le document', 'la page', 'l’index PDF'],
      caveat:
        'Une citation structurellement valide ne garantit pas à elle seule qu’une réponse est correcte sur le plan sémantique ou technique.',
    },
    cannotAnswer: {
      title: 'Quand AeroSpec ne peut pas répondre',
      description:
        'Lorsque les informations disponibles sont insuffisantes, AeroSpec peut s’abstenir plutôt que de présenter une réponse non fondée.',
    },
    tips: {
      title: 'Conseils pour de meilleures questions',
      items: [
        'Mentionnez le produit ou la famille de connecteurs.',
        'Demandez une caractéristique précise.',
        'Incluez une référence connue lorsqu’elle est disponible.',
        'Évitez les questions excessivement larges ou vagues.',
      ],
    },
    scope: {
      title: 'Périmètre actuel du prototype',
      introduction:
        'AeroSpec AI est un prototype d’ingénierie dont le périmètre est volontairement limité.',
      capabilitiesTitle: 'Capacités actuelles',
      capabilities: [
        'Recherche sémantique dans le corpus documentaire.',
        'Réponses fondées sur les passages récupérés.',
        'Citations avec document et page.',
        'Les conversions d’unités sont calculées par du code API déterministe, et non générées par le modèle de langage.',
      ],
      limitationsTitle: 'Limites actuelles',
      limitations: [
        'Le corpus documentaire est limité.',
        'Ce prototype n’est pas un système certifié.',
        'Une citation structurellement valide ne constitue pas une validation métier de la réponse.',
        'Les structures PDF complexes peuvent réduire la qualité de l’extraction et de la recherche.',
      ],
    },
  },
  evaluation: {
    eyebrow: 'Performance mesurée du prototype',
    title: 'Évaluation RAG',
    introduction: 'Ces résultats ont été mesurés sur le benchmark actuel :',
    cases: 'cas',
    answerable: 'answerable',
    unanswerable: 'unanswerable',
    warning:
      'Résultats mesurés sur un petit benchmark constitué manuellement. Ils caractérisent ce prototype sur ce jeu de données et ne garantissent pas les performances générales ou en production.',
    measuredResults: 'Résultats mesurés',
    responseBehavior: 'Comportement de réponse',
    traceability: 'Revue de traçabilité',
    provenance: 'Provenance enregistrée',
    notApplicable: 'Non applicable',
    retrieval: {
      title: 'Retrieval',
      description:
        'Les métriques Source localisent le document attendu ; les métriques Evidence exigent que tous les faits attendus figurent dans les passages récupérés.',
    },
    abstention: {
      title: 'Abstention',
      description:
        'Le comportement d’abstention est évalué séparément pour les cas answerable et unanswerable.',
      correctDescription:
        'Le système n’a pas répondu lorsque le benchmark indiquait que la question était unanswerable.',
      falseDescription:
        'Le système n’a pas répondu alors que le benchmark contenait les éléments nécessaires.',
    },
    grounding: {
      title: 'Citations et grounding',
      description:
        'La structure des citations est mesurée automatiquement. La justesse, le grounding, la couverture et le support proviennent de la revue humaine enregistrée.',
    },
    insight: {
      eyebrow: 'Enseignement du retrieval',
      title: 'Retrouver la source ne signifie pas retrouver la preuve',
      description:
        'Le document source attendu figure souvent dans les trois premiers résultats, tandis que les passages précis contenant tous les faits requis sont retrouvés moins souvent. Cette comparaison décrit le benchmark actuel et n’attribue pas ce résultat à une cause unique.',
    },
    metrics: {
      correctAbstentions: 'Abstentions correctes',
      falseAbstentions: 'Fausses abstentions',
      responsesWithCitations: 'Réponses avec citations',
      validEmittedCitationIds: 'IDs de citation émis valides',
      resolvedCitationIds: 'IDs de citation résolus',
      unknownCitationIds: 'IDs de citation inconnus',
      answerCorrectness: 'Justesse des réponses',
      fullyGrounded: 'Réponses substantielles entièrement fondées',
      citationCoverage: 'Couverture des citations',
      citationSupport: 'Support des citations',
    },
    context: {
      title: 'Contexte de l’évaluation',
      description:
        'Configuration et métadonnées du jeu de données enregistrées avec cette campagne.',
      benchmark: 'Benchmark',
      benchmarkSize: 'Taille du benchmark',
      manualBenchmark: 'Benchmark RAG constitué manuellement',
      smallScope: 'Petit périmètre',
      dataset: 'Jeu de données',
      model: 'Modèle de génération',
      provider: 'Fournisseur',
      embeddingModel: 'Modèle d’embeddings',
      retrievalConfiguration: 'Configuration du retrieval',
      corpus: 'Corpus indexé',
      documents: 'documents',
      chunks: 'chunks',
      sourceArtifact: 'Artefact source',
    },
  },
  errors: {
    emptyQuestion: 'Saisissez une question avant de lancer la recherche.',
    api: 'La réponse n’a pas pu être obtenue. Vérifiez que l’API est disponible, puis réessayez.',
  },
  footer: {
    subtitle: 'Assistant de documentation technique',
    groundedAnswers: 'Réponses fondées sur les sources',
    validatedCitations: 'Citations validées',
    deterministicTools: 'Outils déterministes',
  },
} as const satisfies Translations

const italian = {
  nav: {
    brand: 'AeroSpec AI',
    subtitle: 'Assistente per la documentazione tecnica',
    primaryLabel: 'Navigazione principale',
    homeLabel: 'Home AeroSpec AI',
    assistant: 'Assistente',
    evaluation: 'Valutazione',
    help: 'Aiuto',
    languageSelector: 'Selezione della lingua',
    selectLanguage: {
      en: 'Passa all’inglese',
      fr: 'Passa al francese',
      it: 'Passa all’italiano',
    },
  },
  hero: {
    eyebrow: 'Intelligenza per documenti tecnici',
    title: 'Chiedi. Trova. Progetta con fiducia.',
    description:
      'Cerca nella documentazione tecnica e ottieni risposte mirate supportate da citazioni convalidate nelle fonti.',
    capabilitiesLabel: 'Funzionalità dell’assistente',
    benefits: [
      'Ricerca semantica nei documenti',
      'Citazioni convalidate',
      'Risposte basate sulle fonti',
      'Pensato per l’ingegneria',
    ],
  },
  search: {
    eyebrow: 'Interrogazione documentale',
    title: 'Fai una domanda tecnica',
    precision: 'Usa una terminologia tecnica precisa',
    label: 'Domanda tecnica',
    placeholder:
      'Es. Quale tasso di perdita di elio è specificato per il connettore MIL-DTL-38999?',
    hint: 'Invio aggiunge una nuova riga. Usa il pulsante Chiedi per inviare.',
    submit: 'Chiedi',
    searching: 'Ricerca…',
    loading: 'Ricerca nei documenti e preparazione della risposta…',
  },
  examples: {
    eyebrow: 'Esplora il corpus',
    title: 'Esempi di domande',
    instruction: 'Seleziona un esempio per modificarlo prima di inviarlo.',
    questions: [
      'Quale tasso di perdita di elio è specificato per i connettori ermetici MIL-DTL-38999?',
      'Quale materiale di tenuta è specificato per i connettori ermetici Douglas MIL-DTL-38999?',
      'Qual è la temperatura massima di esercizio dei connettori in nylon Molex .093 Series 03-09?',
    ],
  },
  tools: {
    eyebrow: 'Strumenti di ingegneria',
    title: 'Conversione di unità',
    description:
      'Converti le unità di ingegneria supportate con un calcolo deterministico dell’API.',
    value: 'Valore',
    from: 'Da',
    to: 'A',
    convert: 'Converti',
    converting: 'Conversione…',
    result: 'Risultato della conversione',
    emptyValue: 'Inserisci un valore da convertire.',
    invalidValue: 'Inserisci un valore numerico valido.',
    apiError: 'Non è stato possibile completare la conversione. Riprova.',
  },
  results: {
    eyebrow: 'Risposta documentale',
    title: 'Risultato',
    status: 'Fonti verificate',
    questionAsked: 'Domanda posta',
  },
  citations: {
    eyebrow: 'Tracciabilità',
    title: 'Citazioni convalidate',
    description: 'Riferimenti risolti dall’API nei documenti di origine.',
    page: 'Pagina',
    pdfIndex: 'Indice PDF',
    empty: 'Non sono state restituite citazioni convalidate per questa risposta.',
  },
  help: {
    eyebrow: 'Guida del prodotto',
    title: 'Come funziona AeroSpec AI',
    introduction:
      'AeroSpec AI aiuta gli ingegneri a interrogare un corpus di documenti tecnici e a ricondurre le risposte alle evidenze recuperate.',
    workflowTitle: 'Dalla domanda a una risposta tracciabile',
    steps: [
      {
        title: 'Chiedi',
        description:
          'Inserisci una domanda tecnica mirata usando una terminologia di prodotto precisa.',
      },
      {
        title: 'Recupera',
        description:
          'AeroSpec cerca nella documentazione i passaggi più pertinenti.',
      },
      {
        title: 'Rispondi e cita',
        description:
          'Una risposta viene generata dal contesto recuperato e vengono mostrate le citazioni convalidate.',
      },
    ],
    citations: {
      title: 'Comprendere le citazioni',
      description:
        '[S1], [S2] e identificatori simili indicano le fonti utilizzate nella risposta.',
      detailsIntroduction: 'Una citazione convalidata consente di ritrovare:',
      fields: ['il documento', 'la pagina', 'l’indice PDF'],
      caveat:
        'Una citazione strutturalmente valida non garantisce da sola che una risposta sia semanticamente o tecnicamente corretta.',
    },
    cannotAnswer: {
      title: 'Quando AeroSpec non può rispondere',
      description:
        'Quando le informazioni disponibili non sono sufficienti, AeroSpec può astenersi invece di presentare una risposta non fondata.',
    },
    tips: {
      title: 'Suggerimenti per domande migliori',
      items: [
        'Indica il prodotto o la famiglia di connettori.',
        'Richiedi una caratteristica specifica.',
        'Includi un riferimento noto quando disponibile.',
        'Evita domande eccessivamente ampie o vaghe.',
      ],
    },
    scope: {
      title: 'Ambito attuale del prototipo',
      introduction:
        'AeroSpec AI è un prototipo ingegneristico con un ambito volutamente limitato.',
      capabilitiesTitle: 'Funzionalità attuali',
      capabilities: [
        'Ricerca semantica nel corpus documentale.',
        'Risposte basate sui passaggi recuperati.',
        'Citazioni con documento e pagina.',
        'Le conversioni di unità sono calcolate da codice API deterministico, non generate dal modello linguistico.',
      ],
      limitationsTitle: 'Limiti attuali',
      limitations: [
        'Il corpus documentale è limitato.',
        'Questo prototipo non è un sistema certificato.',
        'Una citazione strutturalmente valida non costituisce una validazione professionale della risposta.',
        'Le strutture PDF complesse possono ridurre la qualità dell’estrazione e della ricerca.',
      ],
    },
  },
  evaluation: {
    eyebrow: 'Prestazioni misurate del prototipo',
    title: 'Valutazione RAG',
    introduction: 'Questi risultati sono stati misurati sul benchmark attuale:',
    cases: 'casi',
    answerable: 'answerable',
    unanswerable: 'unanswerable',
    warning:
      'Risultati misurati su un piccolo benchmark curato manualmente. Caratterizzano questo prototipo su questo dataset e non garantiscono le prestazioni generali o in produzione.',
    measuredResults: 'Risultati misurati',
    responseBehavior: 'Comportamento delle risposte',
    traceability: 'Revisione della tracciabilità',
    provenance: 'Provenienza registrata',
    notApplicable: 'Non applicabile',
    retrieval: {
      title: 'Retrieval',
      description:
        'Le metriche Source individuano il documento atteso; le metriche Evidence richiedono che tutti i fatti attesi compaiano nei passaggi recuperati.',
    },
    abstention: {
      title: 'Astensione',
      description:
        'Il comportamento di astensione viene valutato separatamente per i casi answerable e unanswerable.',
      correctDescription:
        'Il sistema non ha risposto quando il benchmark indicava che la domanda era unanswerable.',
      falseDescription:
        'Il sistema non ha risposto anche se il benchmark conteneva le evidenze necessarie.',
    },
    grounding: {
      title: 'Citazioni e grounding',
      description:
        'La struttura delle citazioni è misurata automaticamente. Correttezza, grounding, copertura e supporto provengono dalla revisione umana registrata.',
    },
    insight: {
      eyebrow: 'Indicazione dal retrieval',
      title: 'Trovare la fonte non equivale a trovare l’evidenza',
      description:
        'Il documento sorgente atteso compare spesso nei primi tre risultati, mentre i passaggi precisi contenenti tutti i fatti richiesti vengono recuperati meno spesso. Questo confronto descrive il benchmark attuale e non attribuisce il risultato a una sola causa.',
    },
    metrics: {
      correctAbstentions: 'Astensioni corrette',
      falseAbstentions: 'Astensioni errate',
      responsesWithCitations: 'Risposte con citazioni',
      validEmittedCitationIds: 'ID di citazione emessi validi',
      resolvedCitationIds: 'ID di citazione risolti',
      unknownCitationIds: 'ID di citazione sconosciuti',
      answerCorrectness: 'Correttezza delle risposte',
      fullyGrounded: 'Risposte sostanziali interamente fondate',
      citationCoverage: 'Copertura delle citazioni',
      citationSupport: 'Supporto delle citazioni',
    },
    context: {
      title: 'Contesto della valutazione',
      description:
        'Configurazione e metadati del dataset registrati con questa esecuzione.',
      benchmark: 'Benchmark',
      benchmarkSize: 'Dimensione del benchmark',
      manualBenchmark: 'Benchmark RAG curato manualmente',
      smallScope: 'Ambito ridotto',
      dataset: 'Dataset',
      model: 'Modello di generazione',
      provider: 'Provider',
      embeddingModel: 'Modello di embedding',
      retrievalConfiguration: 'Configurazione del retrieval',
      corpus: 'Corpus indicizzato',
      documents: 'documenti',
      chunks: 'chunk',
      sourceArtifact: 'Artefatto sorgente',
    },
  },
  errors: {
    emptyQuestion: 'Inserisci una domanda prima di cercare nella documentazione.',
    api: 'Non è stato possibile ottenere la risposta. Verifica che l’API sia disponibile e riprova.',
  },
  footer: {
    subtitle: 'Assistente per la documentazione tecnica',
    groundedAnswers: 'Risposte basate sulle fonti',
    validatedCitations: 'Citazioni convalidate',
    deterministicTools: 'Strumenti deterministici',
  },
} as const satisfies Translations

export const translations: Record<Language, Translations> = {
  en: english,
  fr: french,
  it: italian,
}

export function isLanguage(value: string | null): value is Language {
  return (
    typeof value === 'string' &&
    (supportedLanguages as readonly string[]).includes(value)
  )
}
