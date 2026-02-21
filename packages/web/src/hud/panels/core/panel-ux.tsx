/**
 * Panel UX primitives — consistent status and empty-state surfaces for panels.
 *
 * Centralizes loading/empty/error/auth-required rendering so panel features
 * share one predictable interaction contract.
 */

import type { ReactNode } from 'react';

interface PanelInfoStateProps {
  label: string;
  message: string;
}

interface PanelInfoErrorProps {
  label: string;
  message: string;
}

interface PanelInfoErrorWithActionProps extends PanelInfoErrorProps {
  actionLabel: string;
  onAction: () => void;
}

export function PanelInfoLoading({ label, message }: PanelInfoStateProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      <span className="hud-info-dim">{message}</span>
    </div>
  );
}

export function PanelInfoEmpty({ label, message }: PanelInfoStateProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      <span className="hud-info-dim">{message}</span>
    </div>
  );
}

export function PanelInfoAuthRequired({ label, message }: PanelInfoStateProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      <span className="hud-info-dim">{message}</span>
    </div>
  );
}

export function PanelInfoError({ label, message }: PanelInfoErrorProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      <span className="hud-info-error">{message}</span>
    </div>
  );
}

export function PanelInfoErrorWithAction({ label, message, actionLabel, onAction }: PanelInfoErrorWithActionProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      <span className="hud-info-error">{message}</span>
      <button type="button" className="hud-action-btn" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

interface PanelCardStateProps {
  title: string;
  message: string;
}

interface PanelCardErrorWithActionProps extends PanelCardStateProps {
  actionLabel: string;
  onAction: () => void;
}

export function PanelCardLoading({ title, message }: PanelCardStateProps) {
  return (
    <div className="hud-my-organisms-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function PanelCardEmpty({ title, message }: PanelCardStateProps) {
  return (
    <div className="hud-my-organisms-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export function PanelCardErrorWithAction({ title, message, actionLabel, onAction }: PanelCardErrorWithActionProps) {
  return (
    <div className="hud-my-organisms-state">
      <h3>{title}</h3>
      <p>{message}</p>
      <button type="button" className="hud-map-btn" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

interface PanelSectionProps {
  label: string;
  children?: ReactNode;
}

interface PanelTab {
  id: string;
  label: string;
  count?: number;
}

interface PanelTabsProps {
  ariaLabel: string;
  tabs: ReadonlyArray<PanelTab>;
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
}

export function PanelSection({ label, children }: PanelSectionProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      {children}
    </div>
  );
}

export function PanelTabs({ ariaLabel, tabs, activeTabId, onSelectTab }: PanelTabsProps) {
  return (
    <div className="hud-panel-tab-strip" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const tabClassName = isActive ? 'hud-panel-tab hud-panel-tab--active' : 'hud-panel-tab';

        return (
          <button
            key={tab.id}
            type="button"
            className={tabClassName}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelectTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className="hud-panel-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
