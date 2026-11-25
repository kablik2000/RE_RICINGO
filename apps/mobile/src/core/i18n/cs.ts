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
    home: 'Domů',
    learn: 'Lekce',
    vocabulary: 'Slovník',
    practice: 'Procvičování',
    profile: 'Profil',
  },
  greeting: {
    appName: 'Italština RICI',
    day: 'Buongiorno!',
    evening: 'Buonasera!',
  },
  home: {
    pending: {
      title: 'Úvodní stránka se připravuje',
      message: 'Co tady bude, teprve navrhujeme. Lekce najdete v záložce Lekce.',
    },
  },
  lessons: {
    title: 'Lekce',
    featured: 'Vaše první lekce',
    startLesson: 'Začít lekci',
    allLessons: 'Všechny lekce',
    count: { one: '{count} lekce', few: '{count} lekce', other: '{count} lekcí' },
    sentenceCount: { one: '{count} věta', few: '{count} věty', other: '{count} vět' },
    upcoming: 'Další lekce připravujeme. Objeví se tady, jakmile budou hotové.',
    loading: 'Načítám lekce…',
    openHint: 'Otevře úvod lekce',
    empty: {
      title: 'Zatím žádné lekce',
      message: 'Jakmile vám lektor přiřadí první tematický celek, najdete ho tady.',
    },
  },
  lessonIntro: {
    back: 'Zpět',
    grammar: 'Gramatika v lekci',
    exchanges: { one: 'výměna', few: 'výměny', other: 'výměn' },
    sentences: { one: 'věta', few: 'věty', other: 'vět' },
    grammarTopics: { one: 'gramatika', few: 'gramatiky', other: 'gramatik' },
    start: 'Začít rozbor vět',
    fullDialogue: 'Poslechnout celý dialog',
    demoNote: 'Ukázková lekce. Vysvětlení zatím neprošla kontrolou lektora.',
    loading: 'Načítám lekci…',
  },
  study: {
    progress: 'Věta {current} z {total}',
    close: 'Zavřít rozbor',
    analysis: 'Rozbor věty',
    tapWord: 'Klepněte na slovo',
    segmentHint: 'Zobrazí rozbor této části věty',
    grammar: 'Gramatika',
    depth: 'Souvislosti',
    word: 'Slovíčko',
    previous: 'Předchozí',
    next: 'Další věta',
    finish: 'Celý dialog',
  },
  dialogue: {
    title: 'Celý dialog',
    translation: 'Překlad',
    playAll: 'Přehrát celý dialog',
  },
  audio: {
    play: 'Přehrát',
    playSlow: 'Pomalu',
    playLabel: 'Přehrát výslovnost',
    playWordLabel: 'Přehrát výslovnost: {text}',
    playSlowLabel: 'Přehrát pomalu',
    sourceNote: 'Výslovnost zatím čte hlas zařízení; nahrávky doplní lektor.',
    voiceMissing: {
      title: 'Chybí italský hlas',
      message: 'Bez něj by výslovnost zněla špatně, proto je přehrávání vypnuté.',
      androidHint: 'Ve stahování hlasů vyberte Italština (Italiano) a pak se vraťte.',
      androidSteps:
        'Stáhněte ho v Nastavení → Systém → Jazyky → Převod textu na řeč → Instalovat hlasová data → Italiano.',
      iosSteps: 'Stáhněte ho v Nastavení → Zpřístupnění → Mluvený obsah → Hlasy → Italština.',
      webSteps: 'Zkuste jiný prohlížeč nebo přidejte italský hlas v nastavení systému.',
      download: 'Stáhnout hlas',
      recheck: 'Zkontrolovat',
      checking: 'Kontroluji…',
      openFailed:
        'Stahování hlasů se nepodařilo otevřít. Najdete ho v Nastavení → Systém → Jazyky → Převod textu na řeč.',
    },
  },
  vocabulary: {
    title: 'Slovník',
    loading: 'Načítám slovník…',
    search: 'Hledat italské nebo české slovo',
    searchLabel: 'Hledat ve slovníku',
    clearSearch: 'Vymazat hledání',
    fromLesson: '{lesson}: {sentence}',
    filtersLabel: 'Filtry slovníku',
    filters: {
      all: 'Vše · {count}',
      nouns: 'Podstatná jména',
      verbs: 'Slovesa',
      phrases: 'Fráze a ostatní',
    },
    noResults: {
      title: 'Nic nenalezeno',
      message: 'Zkuste jiné slovo nebo zrušte filtr.',
    },
    gender: {
      masculine: 'm. r.',
      feminine: 'ž. r.',
    },
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
  lessonUpdates: {
    offer: {
      title: 'Nové lekce k dispozici',
      newLessons: {
        one: '{count} nová lekce',
        few: '{count} nové lekce',
        other: '{count} nových lekcí',
      },
      changedLessons: {
        one: '{count} upravená lekce',
        few: '{count} upravené lekce',
        other: '{count} upravených lekcí',
      },
      hint: 'Po stažení budou fungovat i bez internetu.',
      download: 'Stáhnout',
      later: 'Později',
    },
    changes: {
      title: 'Lekce jsou aktualizované',
      added: 'Nové: {titles}',
      updated: 'Upravené: {titles}',
      removed: 'Odebrané: {titles}',
      removedHint: 'Odebrané lekce už nejsou v nabídce.',
      dismiss: 'OK',
    },
    settings: {
      title: 'Aktualizace lekcí',
      description:
        'Když přibude nebo se změní lekce, aplikace ji stáhne do telefonu. Lekce pak fungují i bez internetu.',
      policies: {
        wifi: {
          label: 'Automaticky přes Wi-Fi',
          supporting: 'Na mobilních datech se aplikace nejdřív zeptá',
        },
        always: { label: 'Vždy automaticky', supporting: 'I na mobilních datech' },
        ask: { label: 'Vždy se zeptat', supporting: 'Nic se nestáhne bez vašeho potvrzení' },
      },
      check: 'Zkontrolovat aktualizace',
      upToDate: 'Všechny lekce jsou aktuální.',
      lastChecked: 'Naposledy zkontrolováno {time}',
      unavailable: 'Tato verze aplikace používá jen lekce, které jsou v ní přibalené.',
    },
  },
  account: {
    title: 'Účet studenta',
    signedOut:
      'Učíte se s lektorkou? Přihlaste se a uvidíte lekce a okruhy, které vám doporučí. Bez účtu můžete dál používat všechny veřejné lekce.',
    haveInvitation: 'Mám pozvánku',
    signIn: 'Přihlásit se',
    signedInAs: 'Přihlášeni jako {name}',
    devicesTitle: 'Moje zařízení · {count} z {max}',
    thisDevice: 'Toto zařízení',
    unnamedDevice: 'Zařízení',
    lastSeen: 'Naposledy {date}',
    removeDevice: 'Odhlásit',
    removeDeviceLabel: 'Odhlásit zařízení {name}',
    signOut: 'Odhlásit se',
    loading: 'Načítám účet…',
    retry: 'Zkusit znovu',
    invitation: {
      title: 'Přijmout pozvánku',
      intro:
        'Zadejte kód z e-mailu od lektorky a zvolte si heslo. Pak se jím přihlásíte na kterémkoli zařízení (nejvýš na třech najednou).',
      code: 'Kód pozvánky',
      codeHint: 'Je v e-mailu, např. 8CMT-GY2G-A13V.',
      password: 'Heslo',
      passwordHint: 'Aspoň 12 znaků. Pokud už účet máte, zadejte své současné heslo.',
      passwordAgain: 'Heslo znovu',
      submit: 'Vytvořit účet',
      mismatch: 'Hesla se neshodují.',
      missing: 'Vyplňte kód i heslo.',
    },
    signInScreen: {
      title: 'Přihlášení',
      intro: 'Přihlaste se e-mailem a heslem, které jste si zvolili při přijetí pozvánky.',
      email: 'E-mail',
      password: 'Heslo',
      submit: 'Přihlásit se',
      missing: 'Vyplňte e-mail i heslo.',
    },
    deviceLimit: {
      title: 'Jste přihlášeni na 3 zařízeních',
      message:
        'Vyberte zařízení, které chcete odhlásit. Pokud žádné z nich nemáte u sebe, požádejte lektorku, ať vás odhlásí ze všech zařízení.',
      replace: 'Odhlásit {name}',
    },
    errors: {
      invalid_invitation: 'Kód neplatí. Zkontrolujte ho, nebo požádejte lektorku o novou pozvánku.',
      weak_password: 'Heslo musí mít aspoň 12 znaků a nesmí být stejné jako e-mail.',
      existing_account: 'S tímto e-mailem už účet máte. Zadejte jeho současné heslo.',
      invalid_credentials: 'Nesprávný e-mail nebo heslo.',
      too_many_attempts: 'Příliš mnoho pokusů. Zkuste to znovu za {minutes} min.',
      device_limit: 'Jste přihlášeni na 3 zařízeních.',
      unauthorized: 'Přihlášení vypršelo. Přihlaste se znovu.',
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
