/** Czech UI copy of the Teacher Studio (formal "vy", as in the student app). */
export const cs = {
  app: {
    name: 'Italština RICI',
    product: 'Teacher Studio',
  },
  nav: {
    overview: 'Přehled',
  },
  overview: {
    title: 'Přehled',
    intro: 'Tady budete tvořit lekce, zvát studenty a sledovat jejich postup.',
    sections: {
      lessons: {
        title: 'Lekce',
        description: 'Dialogy, rozbor vět, gramatika a slovíčka; náhled a zveřejnění.',
        status: 'Připravujeme',
      },
      students: {
        title: 'Studenti',
        description: 'Pozvánky, úrovně a přidělené lekce.',
        status: 'Později',
      },
      results: {
        title: 'Výsledky',
        description: 'Postup studentů a nejčastější chyby.',
        status: 'Později',
      },
    },
  },
  apiStatus: {
    title: 'Stav serveru',
    online: 'Server je připojený, databáze v pořádku.',
    degraded: 'Server běží, ale databáze nedostupná.',
    offline: 'Server nedostupný. Spusťte backend (VS Code úloha „Backend: start (Docker)“).',
  },
} as const;
