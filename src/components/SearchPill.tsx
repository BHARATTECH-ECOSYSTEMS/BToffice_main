import { useId, useRef, type FormEvent } from 'react';

/**
 * The one search box used across the site and the portal (styles: styles/search-pill.css). A glass pill with a
 * violet edge: with a mouse an empty one rests folded to its lens and spreads open when the pointer arrives, on
 * keyboard focus, or while it holds text. Esc clears before it does anything else, × clears with a click, and a press
 * anywhere on the pill lands in the box.
 */
export function SearchPill({
  value,
  onChange,
  label,
  placeholder,
  showLabel = false,
  align = 'end',
  onSubmit,
  id: givenId,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  /** Print the label above the box instead of keeping it for screen readers only. */
  showLabel?: boolean;
  /** Which side it folds to and opens from: the right end of its row, or the middle of a centred layout. */
  align?: 'end' | 'center';
  /** When set, the pill is a search form and Enter submits it. */
  onSubmit?: () => void;
  id?: string;
}) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const input = useRef<HTMLInputElement>(null);

  const pill = (
    <div
      className="search-pill"
      data-filled={value ? '' : undefined}
      onPointerDown={(e) => {
        if (e.target instanceof HTMLInputElement || (e.target as Element).closest('button')) return;
        e.preventDefault();
        input.current?.focus();
      }}
    >
      <input
        ref={input}
        className="search-pill-field"
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Esc clears first; only an empty box lets Esc through, so a pop-up isn't closed mid-search
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }
        }}
      />
      {value && (
        <button type="button" className="search-pill-clear" aria-label={`Clear: ${label}`} onClick={() => (onChange(''), input.current?.focus())}>
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
      {/* the lens sits at the right end: the pill rests folded to it */}
      <svg className="search-pill-lens" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.6" />
        <path d="M10.5 10.5 14 14" />
      </svg>
    </div>
  );

  const labelEl = (
    <label htmlFor={id} className={showLabel ? 'search-pill-label' : 'sr-only'}>
      {label}
    </label>
  );

  return onSubmit ? (
    <form
      className="search-pill-wrap"
      data-align={align}
      role="search"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {labelEl}
      {pill}
    </form>
  ) : (
    <div className="search-pill-wrap" data-align={align}>
      {labelEl}
      {pill}
    </div>
  );
}
