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
        'Deterministic unit conversion available through the API.',
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
        'Conversion déterministe d’unités disponible via l’API.',
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
        'Conversione deterministica delle unità disponibile tramite API.',
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
