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

export function PanelSection({ label, children }: PanelSectionProps) {
  return (
    <div className="hud-info-section">
      <span className="hud-info-label">{label}</span>
      {children}
    </div>
  );
}
