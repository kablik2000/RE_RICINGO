import type { LessonBundle } from '@ricingo/domain';

import type { LessonIssue } from './studio-api';

/** An API validation issue, described for the lecturer, with where to jump in the editor. */
export interface DescribedIssue {
  location: string;
  message: string;
  sentenceId?: string;
  tab: 'dialog' | 'vocabulary' | 'grammar' | 'info';
}

const FIELD_NAMES: Readonly<Record<string, string>> = {
  italian: 'italský text',
  czech: 'český překlad',
  meaning: 'význam',
  segments: 'části věty',
  sentences: 'věty',
  turns: 'repliky dialogu',
  titleItalian: 'italský název',
  titleCzech: 'český název',
  goal: 'cíl lekce',
  lemma: 'slovo',
  translation: 'překlad',
  title: 'název',
  summary: 'vysvětlení',
  label: 'jméno mluvčího',
};

const INDEXED = /^(\w+)\[(\d+)\]$/;

/** Turns the API's English schema messages into short Czech ones where the pattern is known. */
export function translateIssueMessage(message: string): string {
  const required = /^'(\w+)' is a required property$/.exec(message);
  if (required?.[1] !== undefined) {
    return `Chybí ${FIELD_NAMES[required[1]] ?? required[1]}.`;
  }
  if (/should be non-empty|is too short|does not have enough properties/.test(message)) {
    return message.startsWith('[]') ? 'Seznam je prázdný.' : 'Pole je prázdné.';
  }
  const notFound = /^segment "(.+)" is not found in "(.+)" after position \d+$/.exec(message);
  if (notFound?.[1] !== undefined) {
    return `Část „${notFound[1]}“ ve větě není nebo je ve špatném pořadí.`;
  }
  const unknownLexeme = /^unknown lexeme "(.+)"$/.exec(message);
  if (unknownLexeme?.[1] !== undefined) {
    return `Odkaz na neexistující slovíčko „${unknownLexeme[1]}“.`;
  }
  const unknownTopic = /^unknown grammar topic "(.+)"$/.exec(message);
  if (unknownTopic?.[1] !== undefined) {
    return `Odkaz na neexistující gramatické téma „${unknownTopic[1]}“.`;
  }
  if (message.startsWith('duplicate')) {
    return 'Opakující se identifikátor (vytvořte položku znovu).';
  }
  if (/does not match/.test(message)) {
    return 'Identifikátor smí obsahovat jen malá písmena, číslice a pomlčky.';
  }
  return message;
}

/** Location and editor target of an issue path such as `$.lesson.turns[1].sentences[0]`. */
export function describeIssue(issue: LessonIssue, bundle: LessonBundle): DescribedIssue {
  const parts = issue.path
    .replace(/^\$\.?/, '')
    .split('.')
    .filter(Boolean);
  const message = translateIssueMessage(issue.message);
  const [first, second, third, fourth] = parts;

  const lexeme = first === undefined ? null : INDEXED.exec(first);
  if (lexeme?.[1] === 'lexemes') {
    return { location: `Slovíčko ${String(Number(lexeme[2]) + 1)}`, message, tab: 'vocabulary' };
  }
  if (lexeme?.[1] === 'grammarTopics') {
    return {
      location: `Gramatické téma ${String(Number(lexeme[2]) + 1)}`,
      message,
      tab: 'grammar',
    };
  }
  if (first === 'lexemes') return { location: 'Slovíčka', message, tab: 'vocabulary' };
  if (first === 'grammarTopics') return { location: 'Gramatika', message, tab: 'grammar' };

  const turnMatch = second === undefined ? null : INDEXED.exec(second);
  if (first === 'lesson' && turnMatch?.[1] === 'turns') {
    const turnIndex = Number(turnMatch[2]);
    const turn = bundle.lesson.turns[turnIndex];
    const sentenceMatch = third === undefined ? null : INDEXED.exec(third);
    let location = `Replika ${String(turnIndex + 1)}`;
    let sentenceId = turn?.sentences[0]?.id;
    if (sentenceMatch?.[1] === 'sentences') {
      const sentenceIndex = Number(sentenceMatch[2]);
      sentenceId = turn?.sentences[sentenceIndex]?.id ?? sentenceId;
      location += ` · věta ${String(sentenceIndex + 1)}`;
      const segmentMatch = fourth === undefined ? null : INDEXED.exec(fourth);
      if (segmentMatch?.[1] === 'segments') {
        location += ` · část ${String(Number(segmentMatch[2]) + 1)}`;
      }
    }
    return { location, message, tab: 'dialog', ...(sentenceId !== undefined && { sentenceId }) };
  }
  if (first === 'lesson' && second !== undefined && !second.startsWith('turns')) {
    return { location: 'Informace o lekci', message, tab: 'info' };
  }
  return { location: 'Lekce', message, tab: first === 'lesson' ? 'dialog' : 'info' };
}
