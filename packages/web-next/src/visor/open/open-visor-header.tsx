/**
 * Open visor header.
 *
 * Shell-level header for open visor mode. Owns app context display and
 * close control so individual apps can stay focused on their own content.
 */

interface OpenVisorHeaderProps {
  readonly appLabel: string;
  readonly appDescription: string;
  readonly onRequestClose: () => void;
}

export function OpenVisorHeader({ appLabel, appDescription, onRequestClose }: OpenVisorHeaderProps) {
  return (
    <header className="open-visor-shell-header">
      <div>
        <p className="open-visor-shell-kicker">App</p>
        <h1 className="open-visor-shell-title">{appLabel}</h1>
        <p className="open-visor-shell-description">{appDescription}</p>
      </div>
      <button type="button" className="open-visor-close-button" onClick={onRequestClose}>
        Close
      </button>
    </header>
  );
}
