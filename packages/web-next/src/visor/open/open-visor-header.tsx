/**
 * Open visor header.
 *
 * Shell-level header for open visor mode. Owns app context display and
 * close control so individual apps can stay focused on their own content.
 */

interface OpenVisorHeaderProps {
  readonly appLabel: string;
  readonly appDescription: string;
  readonly isExpanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onRequestClose: () => void;
}

export function OpenVisorHeader({
  appLabel,
  appDescription,
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
