import React from 'react';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Shared code-block renderer used by both the live interview chat
// (InterviewChat.tsx) and the admin transcript viewer (InterviewDetail.tsx).
export const markdownComponents: Components = {
  code(props) {
    const { className, children, ...rest } = props as any;
    const raw = String(children ?? '').replace(/\n$/, '');
    const isBlock = /\n/.test(raw) || Boolean(/language-/.exec(className || ''));

    if (!isBlock) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-800 font-mono text-[0.85em] break-all"
          {...rest}
        >
          {children}
        </code>
      );
    }

    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'javascript';

    // Strip any leftover manual "1. "/"2. " numbering - we render our own
    // gutter numbers below, so this prevents double numbering while keeping
    // the rest of each line's indentation exactly as-is.
    const displayCode = raw
      .split('\n')
      .map((line) => line.replace(/^\s*\d+[.)]\s?/, ''))
      .join('\n');

    return (
  <div className="my-2 overflow-hidden rounded-lg border border-slate-300 bg-slate-50 text-[13px] shadow-sm">
    <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-200 font-mono">
      {language}
    </div>
    <div className="overflow-x-auto">
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        showLineNumbers
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: '0.75rem 1rem',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: '1.5rem',
          color: '#1e1e1e'
        }}
        lineNumberStyle={{
          minWidth: '2.25em',
          paddingRight: '1em',
          color: '#a0a0a0',
          userSelect: 'none'
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#1e1e1e'
          }
        }}
      >
        {displayCode}
      </SyntaxHighlighter>
    </div>
  </div>
);
  },
  pre(props) {
    return <>{props.children}</>;
  },
  p(props) {
    return <p className="mb-2 last:mb-0 break-words">{props.children}</p>;
  },
  li(props) {
    return <li className="break-words">{props.children}</li>;
  }
};