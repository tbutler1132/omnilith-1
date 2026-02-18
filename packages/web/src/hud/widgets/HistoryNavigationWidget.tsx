/**
 * HistoryNavigationWidget — widget-lane navigation for main panel history.
 *
 * Presents previous/next controls using the shared widget slot dimensions so
 * history navigation aligns with the rest of the visor widget lane.
 */

interface HistoryNavigationWidgetProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  onGoPrevious: () => void;
  onGoNext: () => void;
}

export function HistoryNavigationWidget({
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
}: HistoryNavigationWidgetProps) {
  return (
    <div className="visor-history-nav" role="toolbar" aria-label="Visor history navigation">
      <button
        type="button"
        className="hud-action-btn visor-history-btn"
        onClick={onGoPrevious}
        disabled={!canGoPrevious}
        aria-label="Previous panel"
        title="Previous panel"
      >
        {'<'}
      </button>
      <button
        type="button"
        className="hud-action-btn visor-history-btn"
        onClick={onGoNext}
        disabled={!canGoNext}
        aria-label="Next panel"
        title="Next panel"
      >
        {'>'}
      </button>
    </div>
  );
}
