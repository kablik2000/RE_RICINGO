import { tokenStylesheet } from '@ricingo/design-system/web';
import type { Metadata } from 'next';
import { Noto_Serif, Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { t } from '@/i18n';

import './globals.css';

// Same typefaces as the student app (ADR-0009); latin-ext for Czech and Italian diacritics.
const sans = Roboto({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  variable: '--rici-font-sans',
});
const serif = Noto_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--rici-font-serif',
});

export const metadata: Metadata = {
  title: `${t('app.product')} · ${t('app.name')}`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs" className={`${sans.variable} ${serif.variable}`}>
      <head>
        {/* Design tokens shared with the student app, as CSS custom properties. */}
        <style>{tokenStylesheet()}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
