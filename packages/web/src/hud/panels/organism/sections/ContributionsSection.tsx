/**
 * ContributionsSection — displays credited contribution signals per user.
 *
 * Uses the organism contributions read model so rendering stays decoupled
 * from proposal/state/event query internals.
 */

import { useContributions } from '../../../../hooks/use-organism.js';
import { PanelInfoEmpty, PanelInfoError, PanelInfoLoading, PanelSection } from '../../core/panel-ux.js';
import { formatDate } from './format-date.js';

interface ContributionsSectionProps {
  organismId: string;
  refreshKey: number;
}

const ALIAS_ADJECTIVES = [
  'Amber',
  'Bright',
  'Calm',
  'Clear',
  'Golden',
  'Kind',
  'Luminous',
  'Quiet',
  'Solar',
  'Steady',
] as const;

const ALIAS_NOUNS = [
  'Atlas',
  'Comet',
  'Grove',
  'Harbor',
  'Lantern',
  'Meadow',
  'River',
  'Signal',
  'Studio',
  'Voyager',
] as const;

function hashUserId(userId: string): number {
  // FNV-1a 32-bit hash for stable, deterministic alias mapping.
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function contributorAlias(userId: string): string {
  const hash = hashUserId(userId);
  const adjective = ALIAS_ADJECTIVES[hash % ALIAS_ADJECTIVES.length];
  const noun = ALIAS_NOUNS[Math.floor(hash / ALIAS_ADJECTIVES.length) % ALIAS_NOUNS.length];
  const suffix = (hash % 1000).toString().padStart(3, '0');
  return `Steward ${adjective} ${noun} ${suffix}`;
}

function summarizeContribution(entry: {
  stateCount: number;
  proposalCount: number;
  integrationCount: number;
  declineCount: number;
  eventCount: number;
}): string {
  const parts: string[] = [];
  if (entry.stateCount > 0) parts.push(`${entry.stateCount} states`);
  if (entry.proposalCount > 0) parts.push(`${entry.proposalCount} proposals`);
  if (entry.integrationCount > 0) parts.push(`${entry.integrationCount} integrations`);
  if (entry.declineCount > 0) parts.push(`${entry.declineCount} declines`);
  if (entry.eventCount > 0) parts.push(`${entry.eventCount} actions`);
  return parts.join(' · ');
}

export function ContributionsSection({ organismId, refreshKey }: ContributionsSectionProps) {
  const { data: contributions, loading, error } = useContributions(organismId, refreshKey);

  if (loading) {
    return <PanelInfoLoading label="Contributions" message="Loading contributions..." />;
  }

  if (error) {
    return <PanelInfoError label="Contributions" message="Failed to load contributions." />;
  }

  if (!contributions || contributions.contributors.length === 0) {
    return <PanelInfoEmpty label="Contributions" message="No contributions yet." />;
  }

  return (
    <PanelSection label="Contributions">
      {contributions.contributors.map((entry) => (
        <div key={entry.userId} className="hud-info-state">
          <span className="hud-info-state-num">{contributorAlias(entry.userId)}</span>
          <span className="hud-info-state-detail">
            id {entry.userId.slice(0, 8)} · {summarizeContribution(entry)}
            {entry.lastContributedAt ? ` · ${formatDate(entry.lastContributedAt)}` : ''}
          </span>
        </div>
      ))}
    </PanelSection>
  );
}
