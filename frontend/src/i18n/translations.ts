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
