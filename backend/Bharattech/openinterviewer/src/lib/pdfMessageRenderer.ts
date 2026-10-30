import jsPDF from 'jspdf';
import { autoFenceUnwrappedCode } from './formatChatMarkdown';

// Shared layout constants for the "Download Report" PDF (InterviewDetail.tsx).
export const PDF_PAGE_BOTTOM = 280;
export const PDF_LEFT_X = 10;
export const PDF_CONTENT_WIDTH = 180;

export interface PdfRenderState {
  y: number;
  pageNumber: number;
}

// Starts a fresh page (with a footer page number on the page being left)
// whenever the next chunk of content wouldn't fit above PDF_PAGE_BOTTOM.
export function ensurePdfSpace(doc: jsPDF, state: PdfRenderState, neededHeight: number) {
  if (state.y + neededHeight > PDF_PAGE_BOTTOM) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Page ${state.pageNumber}`, 180, 290);

    doc.addPage();
    state.pageNumber += 1;
    state.y = 20;
  }
}

export function splitPdfContentSegments(content: string): Array<{ type: 'text' | 'code'; content: string }> {
  const segments: Array<{ type: 'text' | 'code'; content: string }> = [];
  const normalized = autoFenceUnwrappedCode(content);
  const codeFenceRegex = /```[a-zA-Z0-9]*\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeFenceRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: normalized.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', content: match[1].replace(/\n$/, '') });
    lastIndex = codeFenceRegex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    segments.push({ type: 'text', content: normalized.slice(lastIndex) });
  }

  return segments.filter(seg => seg.type === 'code' || seg.content.trim().length > 0);
}

function renderPdfTextSegment(doc: jsPDF, state: PdfRenderState, text: string) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(20);

  const paragraphs = text.split('\n').map(line => line.trim()).filter(Boolean);

  paragraphs.forEach(paragraph => {
    const lines = doc.splitTextToSize(paragraph, PDF_CONTENT_WIDTH);
    ensurePdfSpace(doc, state, lines.length * 6);
    doc.text(lines, PDF_LEFT_X, state.y);
    state.y += lines.length * 6 + 2;
  });
}

// --- Lightweight approximate syntax coloring for the PDF code box -----
// jsPDF can't reuse the browser's Prism/CSS theme, so this is a simple
// regex-based tokenizer that colors the same broad categories the website
// theme does (keywords, strings, numbers, comments) - close visual parity,
// not full grammar-accurate highlighting.
const KEYWORD_COLOR: [number, number, number] = [4, 81, 165];     // blue
const STRING_COLOR: [number, number, number] = [22, 140, 80];     // green
const NUMBER_COLOR: [number, number, number] = [176, 96, 12];     // orange
const COMMENT_COLOR: [number, number, number] = [130, 130, 130];  // gray
const DEFAULT_COLOR: [number, number, number] = [30, 30, 30];     // near-black

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else',
  'for', 'while', 'new', 'throw', 'try', 'catch', 'class', 'extends', 'import',
  'export', 'default', 'from', 'of', 'in', 'typeof', 'instanceof', 'null',
  'undefined', 'true', 'false', 'this', 'switch', 'case', 'break', 'continue',
  'def', 'print', 'self', 'None', 'True', 'False'
]);

const TOKEN_REGEX = /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d+(\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)|(\s+)|([^\s]+)/gm;

function drawHighlightedLine(doc: jsPDF, text: string, x: number, y: number) {
  TOKEN_REGEX.lastIndex = 0;
  let cursorX = x;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const [full, comment, str, num] = match;
    const word = full;

    if (comment) {
      doc.setTextColor(...COMMENT_COLOR);
    } else if (str) {
      doc.setTextColor(...STRING_COLOR);
    } else if (num) {
      doc.setTextColor(...NUMBER_COLOR);
    } else if (KEYWORDS.has(word)) {
      doc.setTextColor(...KEYWORD_COLOR);
    } else {
      doc.setTextColor(...DEFAULT_COLOR);
    }

    doc.text(word, cursorX, y);
    cursorX += doc.getTextWidth(word);

    if (comment) break; // rest of the line is the comment, already drawn
  }
}

function renderPdfCodeSegment(doc: jsPDF, state: PdfRenderState, code: string) {
  const gutterWidth = 10;
  const lineHeight = 5;
  const codeWidth = PDF_CONTENT_WIDTH - gutterWidth - 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);

  const rawLines = code.split('\n').map(line => line.replace(/^\s*\d+[.)]\s?/, ''));

  const rows: Array<{ num: number | null; text: string }> = [];
  rawLines.forEach((line, idx) => {
    const wrapped = doc.splitTextToSize(line.length ? line : ' ', codeWidth);
    wrapped.forEach((wrappedLine: string, wi: number) => {
      rows.push({ num: wi === 0 ? idx + 1 : null, text: wrappedLine });
    });
  });

  state.y += 2;

  // Reserve the whole box up front so it never starts on one page and
  // silently loses its background on the next - if it can't fully fit,
  // move the entire block to a fresh page rather than splitting the box.
  const boxHeight = rows.length * lineHeight + 9;
  ensurePdfSpace(doc, state, boxHeight);


  rows.forEach(row => {
    ensurePdfSpace(doc, state, lineHeight);
    doc.setTextColor(150);
    if (row.num !== null) {
      doc.text(String(row.num), PDF_LEFT_X, state.y);
    }
    drawHighlightedLine(doc, row.text, PDF_LEFT_X + gutterWidth, state.y);
    state.y += lineHeight;
  });

  state.y += 7;
  doc.setFontSize(11);
  doc.setTextColor(20);
}

// Renders one full transcript message: a bold role label, followed by its
// body split into text/code segments.
export function renderPdfMessage(doc: jsPDF, state: PdfRenderState, role: string, content: string) {
  // Reserve room for the label AND the start of its content together -
  // reserving only the label's own height (as before) let a page break
  // land right after the label, stranding "Interviewer:" alone at the
  // bottom of one page with the actual message starting fresh on the next.
  ensurePdfSpace(doc, state, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`${role}:`, PDF_LEFT_X, state.y);
  state.y += 6;

  const segments = splitPdfContentSegments(content);

  if (segments.length === 0) {
    return;
  }

  segments.forEach(segment => {
    if (segment.type === 'code') {
      renderPdfCodeSegment(doc, state, segment.content);
    } else {
      renderPdfTextSegment(doc, state, segment.content);
    }
  });
}