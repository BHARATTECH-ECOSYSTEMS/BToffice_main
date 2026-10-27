import { useLocation } from 'react-router';
import { nextThemeChoice, pageAddress, resolveTheme, setThemeChoice, THEME_CHOICES, THEME_LABEL, useThemeState, type ThemeChoice } from '../theme';

/** Sun for Light, moon for Dark, a half-filled circle for Auto (whatever the device says). */
function ThemeIcon({ choice }: { choice: ThemeChoice }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {choice === 'light' ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </>
      ) : choice === 'dark' ? (
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/**
 * The round key in the site's nav and the portal's top bar: one press steps Auto → Light → Dark. Its label names
 * the current choice and the next one, and says when the open page stays dark whatever is chosen.
 */
export function ThemeButton() {
  const { choice } = useThemeState();
  const { pathname } = useLocation();
  const next = nextThemeChoice(choice);
  const alwaysDark = resolveTheme({ choice: 'light', systemDark: false, pathname, ...pageAddress() }) === 'dark';
  const label = `Theme: ${THEME_LABEL[choice]}${choice === 'auto' ? ' (follows your device)' : ''}${alwaysDark ? ', but this page is always dark' : ''}. Switch to ${THEME_LABEL[next]}.`;
  return (
    <button type="button" className="nav-theme" onClick={() => setThemeChoice(next)} aria-label={label} title={label}>
      <ThemeIcon choice={choice} />
    </button>
  );
}

/** All three choices side by side, for portal Settings. */
export function ThemeChoices() {
  const { choice } = useThemeState();
  return (
    <div className="segmented p-theme-choices" role="group" aria-label="Theme">
      {THEME_CHOICES.map((c) => (
        <button key={c} type="button" aria-pressed={c === choice} onClick={() => setThemeChoice(c)}>
          <ThemeIcon choice={c} />
          {THEME_LABEL[c]}
        </button>
      ))}
    </div>
  );
}
