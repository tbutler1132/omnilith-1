/**
 * Open visor header.
 *
 * Shell-level header for open visor mode. Owns app context display and
 * close control so individual apps can stay focused on their own content.
 */

export type OpenVisorTheme = 'monochrome' | 'colorful';

interface OpenVisorHeaderProps {
  readonly appLabel: string;
  readonly appDescription: string;
  readonly theme: OpenVisorTheme;
  readonly onToggleTheme: () => void;
  readonly isExpanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onRequestClose: () => void;
}

export function OpenVisorHeader({
  appLabel,
  appDescription,
  theme,
  onToggleTheme,
  isExpanded,
  onToggleExpanded,
  onRequestClose,
}: OpenVisorHeaderProps) {
  const expandLabel = isExpanded ? 'Restore' : 'Expand';

  return (
    <header className="open-visor-shell-header">
      <div>
        <p className="open-visor-shell-kicker">App</p>
        <h1 className="open-visor-shell-title">{appLabel}</h1>
        <p className="open-visor-shell-description">{appDescription}</p>
      </div>
      <div className="open-visor-shell-actions">
        <button
          type="button"
          className="open-visor-theme-toggle"
          data-theme={theme}
          aria-label="Open visor theme"
          aria-pressed={theme === 'monochrome'}
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'monochrome' ? 'colorful' : 'monochrome'}`}
        >
          <span className="open-visor-theme-option open-visor-theme-option--monochrome">Monochrome</span>
          <span className="open-visor-theme-option open-visor-theme-option--colorful">Colorful</span>
        </button>
        <button
          type="button"
          className="open-visor-expand-button"
          onClick={onToggleExpanded}
          aria-pressed={isExpanded}
          aria-label={`${expandLabel} visor app`}
        >
          {expandLabel}
        </button>
        <button type="button" className="open-visor-close-button" onClick={onRequestClose}>
          Close
        </button>
      </div>
    </header>
  );
}
