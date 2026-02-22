/**
 * RegulationSection — lists visible regulatory organisms in one boundary.
 *
 * Shows direct children whose current state content types participate in
 * the regulator runtime: sensor, variable, response-policy, and action.
 */

import { useEffect, useMemo, useState } from 'react';
import { useActionExecutions, useChildren, useOrganismMarkersByIds } from '../../../../hooks/use-organism.js';
import { usePlatformActions } from '../../../../platform/index.js';
import { PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection, PanelTabs } from '../../core/panel-ux.js';
import {
  groupRegulatoryChildrenByContentType,
  presentRegulatoryChildren,
  type RegulatoryContentTypeId,
} from './regulation-presenter.js';

interface RegulationSectionProps {
  organismId: string;
  refreshKey: number;
}

const REGULATION_OVERVIEW_TAB_ID = 'overview';

const REGULATION_OVERVIEW_STEPS: ReadonlyArray<{
  readonly contentTypeId: RegulatoryContentTypeId;
  readonly title: string;
  readonly description: string;
}> = [
  {
    contentTypeId: 'sensor',
    title: 'Sensors',
    description: 'Observe boundary signals.',
  },
  {
    contentTypeId: 'variable',
    title: 'Variables',
    description: 'Compute meaning from sensor readings.',
  },
  {
    contentTypeId: 'response-policy',
    title: 'Response Policies',
    description: 'Evaluate conditions and choose decisions.',
  },
  {
    contentTypeId: 'action',
    title: 'Actions',
    description: 'Execute or propose follow-up changes.',
  },
];

interface RegulationConnection {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly relationLabel: string;
  readonly wiring: 'explicit' | 'inferred';
}

export function RegulationSection({ organismId, refreshKey }: RegulationSectionProps) {
  const { data: children, loading: childrenLoading, error: childrenError } = useChildren(organismId, refreshKey);
  const {
    data: actionExecutions,
    loading: actionExecutionsLoading,
    error: actionExecutionsError,
  } = useActionExecutions(organismId, refreshKey, 25);
  const childIds = (children ?? []).map((child) => child.childId);
  const {
    data: markerDataById,
    loading: markerLoading,
    error: markerError,
  } = useOrganismMarkersByIds(childIds, refreshKey);
  const { openInVisor } = usePlatformActions();
  const regulatoryChildren = presentRegulatoryChildren(childIds, markerDataById);
  const regulatoryChildrenByContentType = useMemo(
    () => groupRegulatoryChildrenByContentType(regulatoryChildren),
    [regulatoryChildren],
  );
  const overviewConnections = useMemo(() => buildOverviewConnections(regulatoryChildren), [regulatoryChildren]);
  const regulatoryNamesById = useMemo(
    () => new Map(regulatoryChildren.map((child) => [child.childId, child.name] as const)),
    [regulatoryChildren],
  );
  const visibleActionExecutions = useMemo(() => {
    if (!actionExecutions) {
      return [];
    }

    return actionExecutions.filter((execution) => execution.status !== 'succeeded').slice(0, 8);
  }, [actionExecutions]);
  const [activeTabId, setActiveTabId] = useState<string>(REGULATION_OVERVIEW_TAB_ID);

  useEffect(() => {
    if (activeTabId === REGULATION_OVERVIEW_TAB_ID) {
      return;
    }

    const hasActiveContentType = regulatoryChildrenByContentType.some(
      (contentTypeGroup) => contentTypeGroup.contentTypeId === activeTabId,
    );
    if (!hasActiveContentType) {
      setActiveTabId(REGULATION_OVERVIEW_TAB_ID);
    }
  }, [activeTabId, regulatoryChildrenByContentType]);

  if (childrenLoading || (childIds.length > 0 && markerDataById === undefined && markerLoading)) {
    return <PanelInfoLoading label="Regulation" message="Loading regulation..." />;
  }

  if (childrenError) {
    return <PanelInfoError label="Regulation" message="Failed to load composed children." />;
  }

  if (markerError && markerDataById === undefined) {
    return <PanelInfoError label="Regulation" message="Failed to load regulation children." />;
  }

  if (regulatoryChildren.length === 0) {
    return <PanelInfoEmpty label="Regulation" message="No regulatory children are visible in this boundary." />;
  }

  const activeChildren =
    regulatoryChildrenByContentType.find((group) => group.contentTypeId === activeTabId)?.children ?? [];

  return (
    <PanelSection label="Regulation">
      <PanelTabs
        ariaLabel="Regulatory content type tabs"
        tabs={[
          { id: REGULATION_OVERVIEW_TAB_ID, label: 'Overview' },
          ...regulatoryChildrenByContentType.map((group) => ({
            id: group.contentTypeId,
            label: formatContentTypeLabel(group.contentTypeId),
            count: group.children.length,
          })),
        ]}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
      />

      {activeTabId === REGULATION_OVERVIEW_TAB_ID ? (
        <div className="hud-regulation-overview">
          <span className="hud-info-dim">
            Signals become variables, variables trigger policies, policies activate actions.
          </span>
          <div
            className="hud-regulation-overview-map"
            role="img"
            aria-label="Regulation loop from sensors through actions"
          >
            {REGULATION_OVERVIEW_STEPS.map((step, index) => {
              const stepChildren =
                regulatoryChildrenByContentType.find((group) => group.contentTypeId === step.contentTypeId)?.children ??
                [];
              return (
                <div key={step.contentTypeId} className="hud-regulation-overview-step">
                  <span className="hud-regulation-overview-step-title">{step.title}</span>
                  <span className="hud-regulation-overview-step-description">{step.description}</span>
                  <span className="hud-regulation-overview-step-count">{stepChildren.length}</span>
                  {index < REGULATION_OVERVIEW_STEPS.length - 1 && (
                    <span className="hud-regulation-overview-step-arrow">{'->'}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hud-regulation-overview-links">
            {REGULATION_OVERVIEW_STEPS.map((step) => {
              const stepChildren =
                regulatoryChildrenByContentType.find((group) => group.contentTypeId === step.contentTypeId)?.children ??
                [];
              if (stepChildren.length === 0) {
                return null;
              }

              return (
                <div key={step.contentTypeId} className="hud-regulation-overview-links-group">
                  <span className="hud-regulation-overview-links-label">{step.title}</span>
                  <div className="hud-regulation-overview-link-row">
                    {stepChildren.slice(0, 3).map((child) => (
                      <button
                        key={child.childId}
                        type="button"
                        className="hud-regulation-overview-link"
                        onClick={() => openInVisor(child.childId)}
                      >
                        {child.name}
                      </button>
                    ))}
                    {stepChildren.length > 3 && <span className="hud-info-dim">+{stepChildren.length - 3} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {overviewConnections.length > 0 && (
            <div className="hud-regulation-overview-connections">
              <span className="hud-regulation-overview-links-label">Connections</span>
              {overviewConnections.map((connection) => (
                <div key={connection.id} className="hud-regulation-overview-connection-row">
                  <button
                    type="button"
                    className="hud-regulation-overview-link"
                    onClick={() => openInVisor(connection.fromId)}
                  >
                    {connection.fromLabel}
                  </button>
                  <span className="hud-regulation-overview-connection-arrow">
                    {connection.relationLabel}
                    {' -> '}
                    {connection.wiring === 'explicit' ? '(ID)' : '(label)'}
                  </span>
                  <button
                    type="button"
                    className="hud-regulation-overview-link"
                    onClick={() => openInVisor(connection.toId)}
                  >
                    {connection.toLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="hud-regulation-overview-connections">
            <span className="hud-regulation-overview-links-label">Action execution queue</span>
            {actionExecutionsLoading && <span className="hud-info-dim">Loading action executions...</span>}
            {actionExecutionsError && !actionExecutionsLoading && (
              <span className="hud-info-error">Failed to load action executions.</span>
            )}
            {!actionExecutionsLoading && !actionExecutionsError && visibleActionExecutions.length === 0 && (
              <span className="hud-info-dim">No pending action executions.</span>
            )}
            {!actionExecutionsLoading &&
              !actionExecutionsError &&
              visibleActionExecutions.map((execution) => (
                <div key={execution.id} className="hud-regulation-overview-connection-row">
                  <button
                    type="button"
                    className="hud-regulation-overview-link"
                    onClick={() => openInVisor(execution.actionOrganismId)}
                  >
                    {regulatoryNamesById.get(execution.actionOrganismId) ?? execution.actionOrganismId.slice(0, 8)}
                  </button>
                  <span className="hud-regulation-overview-connection-arrow">
                    {execution.status}
                    {typeof getFanOutSlot(execution.result) === 'number'
                      ? ` [slot ${getFanOutSlot(execution.result)}]`
                      : ''}
                  </span>
                  <span className="hud-info-dim">{formatExecutionTime(execution.createdAt)}</span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        activeChildren.map((child) => (
          <div key={child.childId} className="hud-info-child-row">
            <button type="button" className="hud-info-child" onClick={() => openInVisor(child.childId)}>
              <span className="hud-info-child-badge">{child.contentTypeId}</span>
              <span className="hud-info-child-name">{child.name}</span>
            </button>
          </div>
        ))
      )}
    </PanelSection>
  );
}

function formatExecutionTime(timestamp: number): string {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getFanOutSlot(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = (value as { fanOutSlot?: unknown }).fanOutSlot;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

function formatContentTypeLabel(contentTypeId: string): string {
  return contentTypeId
    .split('-')
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildOverviewConnections(
  regulatoryChildren: ReadonlyArray<{
    readonly childId: string;
    readonly name: string;
    readonly contentTypeId: RegulatoryContentTypeId;
    readonly payload: unknown;
  }>,
): ReadonlyArray<RegulationConnection> {
  const sensorsByLabel = new Map<string, { id: string; name: string }>();
  const sensorsById = new Map<string, { id: string; name: string }>();
  const variablesByLabel = new Map<string, { id: string; name: string }>();
  const variablesById = new Map<string, { id: string; name: string }>();
  const policiesById = new Map<string, { id: string; name: string }>();
  const connections: RegulationConnection[] = [];

  for (const child of regulatoryChildren) {
    if (child.contentTypeId !== 'sensor') {
      continue;
    }

    const label = getNonEmptyString(getObjectProperty(child.payload, 'label'));
    sensorsById.set(child.childId, { id: child.childId, name: child.name });
    if (label) {
      sensorsByLabel.set(label, { id: child.childId, name: child.name });
    }
  }

  for (const child of regulatoryChildren) {
    if (child.contentTypeId !== 'variable') {
      continue;
    }

    const label = getNonEmptyString(getObjectProperty(child.payload, 'label'));
    const computation = getObject(getObjectProperty(child.payload, 'computation'));
    const sensorOrganismId = getNonEmptyString(getObjectProperty(computation, 'sensorOrganismId'));
    const sensorLabel = getNonEmptyString(getObjectProperty(computation, 'sensorLabel'));
    const matchedSensor =
      (sensorOrganismId ? sensorsById.get(sensorOrganismId) : undefined) ??
      (sensorLabel ? sensorsByLabel.get(sensorLabel) : undefined);

    variablesById.set(child.childId, { id: child.childId, name: child.name });
    if (label) {
      variablesByLabel.set(label, { id: child.childId, name: child.name });
    }

    if (!matchedSensor) {
      continue;
    }

    connections.push({
      id: `${matchedSensor.id}->${child.childId}:sensor-variable`,
      fromId: matchedSensor.id,
      toId: child.childId,
      fromLabel: matchedSensor.name,
      toLabel: child.name,
      relationLabel: 'feeds',
      wiring: sensorOrganismId ? 'explicit' : 'inferred',
    });
  }

  for (const child of regulatoryChildren) {
    if (child.contentTypeId !== 'response-policy') {
      continue;
    }

    const variableOrganismId = getNonEmptyString(getObjectProperty(child.payload, 'variableOrganismId'));
    const variableLabel = getNonEmptyString(getObjectProperty(child.payload, 'variableLabel'));
    const matchedVariable =
      (variableOrganismId ? variablesById.get(variableOrganismId) : undefined) ??
      (variableLabel ? variablesByLabel.get(variableLabel) : undefined);
    policiesById.set(child.childId, { id: child.childId, name: child.name });

    if (!matchedVariable) {
      continue;
    }

    connections.push({
      id: `${matchedVariable.id}->${child.childId}:variable-policy`,
      fromId: matchedVariable.id,
      toId: child.childId,
      fromLabel: matchedVariable.name,
      toLabel: child.name,
      relationLabel: 'triggers',
      wiring: variableOrganismId ? 'explicit' : 'inferred',
    });
  }

  for (const child of regulatoryChildren) {
    if (child.contentTypeId !== 'action') {
      continue;
    }

    const trigger = getObject(getObjectProperty(child.payload, 'trigger'));
    const responsePolicyOrganismId = getNonEmptyString(getObjectProperty(trigger, 'responsePolicyOrganismId'));
    if (!responsePolicyOrganismId) {
      continue;
    }

    const matchedPolicy = policiesById.get(responsePolicyOrganismId);
    if (!matchedPolicy) {
      continue;
    }

    connections.push({
      id: `${matchedPolicy.id}->${child.childId}:policy-action`,
      fromId: matchedPolicy.id,
      toId: child.childId,
      fromLabel: matchedPolicy.name,
      toLabel: child.name,
      relationLabel: 'executes',
      wiring: 'explicit',
    });
  }

  return connections;
}

function getObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getObjectProperty(object: Record<string, unknown> | unknown, key: string): unknown {
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    return undefined;
  }

  return (object as Record<string, unknown>)[key];
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
