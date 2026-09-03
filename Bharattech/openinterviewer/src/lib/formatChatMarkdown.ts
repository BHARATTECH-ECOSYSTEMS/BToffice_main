// Detects code that was never wrapped in ``` fences at all - this matters
// because not every message goes through the AI response pipeline. Admin
// hand-typed "core questions" (stored verbatim in the study config and
// injected into the interview turn unprocessed - see coreQuestions[nextIndex]
// in src/app/api/interview/route.ts) skip that pipeline entirely, so if an
// admin pasted in a snippet as a "language name" line followed by manually
// numbered lines (e.g. "javascript\n1. app.post(...)\n2. ...") without
// wrapping it in backticks themselves, there was never a fence for anything
// upstream to preserve or strip. We detect that shape here and wrap it in a
// real fenced block so it renders as code instead of a re-flowed list -
// same fix applied whether the code came from the AI or from a human.

const KNOWN_LANGUAGES = new Set([
  'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'python', 'py',
  'java', 'c', 'cpp', 'c++', 'csharp', 'c#', 'go', 'golang', 'rust', 'ruby',
  'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'json', 'yaml', 'yml',
  'bash', 'shell', 'sh', 'plaintext', 'text', 'txt'
]);

// A line "looks like code" once its numbering prefix is stripped off, if it
// contains common code punctuation/keywords a plain English sentence
// wouldn't have.
const CODE_LINE_PATTERN =
  /[{}();=<>]|=>|::|\bfunction\b|\bconst\b|\blet\b|\bvar\b|\breturn\b|\bimport\b|\bclass\b|\bdef\b/;

function stripNumberPrefix(line: string): string | null {
  const match = line.match(/^\s*\d+[.)]\s(.*)$/);
  return match ? match[1] : null;
}

function looksLikeNumberedCodeLine(line: string): boolean {
  const stripped = stripNumberPrefix(line);
  if (stripped === null) return false;
  return CODE_LINE_PATTERN.test(stripped);
}

export function autoFenceUnwrappedCode(content: string): string {
  if (!content) return content;

  const lines = content.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Already a real fenced block - copy through untouched until the
    // matching close, so we never double-wrap or otherwise touch it.
    if (/^```/.test(trimmed)) {
      output.push(line);
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        output.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        output.push(lines[i]); // closing fence
        i++;
      }
      continue;
    }

    // An unfenced "language name" line (optionally followed by blank lines)
    // immediately before a run of manually-numbered, code-looking lines.
    const isLangLine = KNOWN_LANGUAGES.has(trimmed.toLowerCase());
    let language = '';
    let scanStart = i;

    if (isLangLine) {
      let lookahead = i + 1;
      while (lines[lookahead] !== undefined && lines[lookahead].trim() === '') {
        lookahead++;
      }
      if (lines[lookahead] !== undefined && looksLikeNumberedCodeLine(lines[lookahead])) {
        language = trimmed.toLowerCase();
        scanStart = lookahead;
      } else {
        output.push(line);
        i++;
        continue;
      }
    } else if (looksLikeNumberedCodeLine(line)) {
      scanStart = i;
    } else {
      output.push(line);
      i++;
      continue;
    }

    // Collect the consecutive run of numbered code-like lines.
    const codeLines: string[] = [];
    let j = scanStart;
    while (j < lines.length) {
      const stripped = stripNumberPrefix(lines[j]);
      if (stripped === null || !CODE_LINE_PATTERN.test(stripped)) break;
      codeLines.push(stripped);
      j++;
    }

    // Require at least 2 lines so a single stray sentence that happens to
    // start with "1." and contain a stray parenthesis isn't mis-wrapped.
    if (codeLines.length >= 2) {
      output.push('```' + language);
      output.push(...codeLines);
      output.push('```');
      i = j;
    } else {
      output.push(line);
      i++;
    }
  }

  return output.join('\n');
}

// ReactMarkdown follows standard Markdown rules, where a single "\n" is
// rendered as a space (same paragraph/line) - only a BLANK line (\n\n)
// starts a new paragraph. Left alone, multi-line AI messages (and long
// questions) render as one long line even though the AI is instructed to
// send short lines.
//
// This turns every "real" line break into its own paragraph so each line
// actually renders on its own line/wraps naturally within the chat bubble
// - EXCEPT inside a fenced code block ("```...```"), where lines must stay
// glued together with single newlines or the fence stops parsing as one
// code block (and instead gets torn into separate, broken paragraphs).
export function formatMessageForMarkdown(content: string): string {
  const withFences = autoFenceUnwrappedCode(content);
  const lines = withFences.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      // Collect the fence verbatim (line breaks preserved) until the
      // closing fence, or the end of the message if the AI never closed it.
      const fenceLines = [line.trim()];
      i += 1;

      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        fenceLines.push(lines[i]);
        i += 1;
      }

      if (i < lines.length) {
        fenceLines.push(lines[i].trim()); // closing ```
        i += 1;
      }

      blocks.push(fenceLines.join('\n'));
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.length > 0) {
      blocks.push(trimmed);
    }
    i += 1;
  }

  return blocks.join('\n\n');
}
