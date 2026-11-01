/** A piece of a legal section's text: plain words, an email address, or the phrase that links to another page. */
export type LegalPart = { kind: 'text' | 'email' | 'phrase'; text: string };

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/**
 * Splits a section's text so its email addresses (every one) and `phrase` (its first mention only) can become links.
 * Joined back together, the parts are exactly the original text.
 */
export function legalParts(text: string, phrase?: string): LegalPart[] {
  let phraseDone = !phrase;
  const parts: LegalPart[] = [];
  text.split(EMAIL).forEach((piece, i) => {
    if (i % 2 === 1) return void parts.push({ kind: 'email', text: piece });
    const at = phraseDone || !phrase ? -1 : piece.indexOf(phrase);
    if (at === -1) return void (piece && parts.push({ kind: 'text', text: piece }));
    phraseDone = true;
    if (at > 0) parts.push({ kind: 'text', text: piece.slice(0, at) });
    parts.push({ kind: 'phrase', text: phrase! });
    const rest = piece.slice(at + phrase!.length);
    if (rest) parts.push({ kind: 'text', text: rest });
  });
  return parts;
}
