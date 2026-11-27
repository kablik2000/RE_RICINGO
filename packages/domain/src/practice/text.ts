/** Lower case without punctuation or extra spaces; accents stay ("è" is not "e"). */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('it')
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sameText(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}
