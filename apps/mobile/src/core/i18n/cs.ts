/**
 * Czech UI copy. Learning content (Italian text and its translations) is data, never stored here.
 *
 * Tone: formal "vy" (provisional — open question Q-17 in DEVELOPMENT_PLAN).
 */
export const cs = {
  common: {
    retry: 'Zkusit znovu',
    loading: 'Načítám…',
    goHome: 'Zpět na úvod',
  },
  tabs: {
    learn: 'Lekce',
    vocabulary: 'Slovník',
    practice: 'Procvičování',
    profile: 'Profil',
  },
  lessons: {
    title: 'Lekce',
    empty: {
      title: 'Zatím žádné lekce',
      message: 'Jakmile vám lektor přiřadí první tematický celek, najdete ho tady.',
    },
  },
  vocabulary: {
    title: 'Slovník',
    empty: {
      title: 'Slovník je zatím prázdný',
      message: 'Slovíčka a fráze z probraných dialogů se vám budou ukládat sem.',
    },
  },
  practice: {
    title: 'Procvičování',
    empty: {
      title: 'Zatím není co procvičovat',
      message: 'Po dokončení prvního dialogu tu najdete cvičení z vět, které už znáte.',
    },
  },
  profile: {
    title: 'Profil',
    appVersion: 'Verze aplikace',
    environment: 'Prostředí',
    environments: {
      development: 'Vývojové',
      preview: 'Testovací',
      production: 'Produkční',
    },
  },
  notFound: {
    title: 'Stránka nenalezena',
    message: 'Tato obrazovka neexistuje.',
  },
  errors: {
    network: {
      title: 'Nepodařilo se připojit',
      message: 'Zkontrolujte připojení k internetu a zkuste to znovu.',
    },
    auth: {
      title: 'Přihlášení vypršelo',
      message: 'Přihlaste se prosím znovu.',
    },
    forbidden: {
      title: 'Sem nemáte přístup',
      message: 'Tento obsah vám zatím nebyl zpřístupněn.',
    },
    notFound: {
      title: 'Obsah nenalezen',
      message: 'Požadovaný obsah už neexistuje nebo byl přesunut.',
    },
    validation: {
      title: 'Obsah nelze zobrazit',
      message: 'Data se nepodařilo zpracovat. Zkuste aplikaci aktualizovat.',
    },
    conflict: {
      title: 'Data se mezitím změnila',
      message: 'Zkuste to prosím znovu.',
    },
    unexpected: {
      title: 'Něco se pokazilo',
      message: 'Omlouváme se, došlo k neočekávané chybě.',
    },
  },
} as const;
