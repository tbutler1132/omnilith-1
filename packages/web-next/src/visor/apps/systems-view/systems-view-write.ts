/**
 * Systems view write helpers.
 *
 * Encapsulates create-and-compose mutations so the systems view app can
 * threshold new child organisms and compose them into the current boundary
 * without coupling request shape details to rendering state.
 */

import type {
  ComposeChildRequest,
  ComposeChildResponse,
  ThresholdOrganismRequest,
  ThresholdOrganismResponse,
} from '@omnilith/api-contracts';
import { apiFetch } from '../../../api/api-client.js';

export type SystemsViewTextFormat = 'markdown' | 'plaintext';

export interface ThresholdTextSystemsOrganismInput {
  readonly name: string;
  readonly content: string;
  readonly format: SystemsViewTextFormat;
  readonly openTrunk: boolean;
}

export interface ComposeSystemsChildInput {
  readonly parentOrganismId: string;
  readonly childId: string;
  readonly position?: number;
}

export function thresholdTextSystemsOrganism(
  input: ThresholdTextSystemsOrganismInput,
): Promise<ThresholdOrganismResponse> {
  const body: ThresholdOrganismRequest = {
    name: input.name,
    contentTypeId: 'text',
    payload: {
      content: input.content,
      format: input.format,
    },
    openTrunk: input.openTrunk,
  };

  return apiFetch<ThresholdOrganismResponse>('/organisms', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function composeSystemsChild(input: ComposeSystemsChildInput): Promise<ComposeChildResponse> {
  const body: ComposeChildRequest = {
    childId: input.childId,
    position: input.position,
  };

  return apiFetch<ComposeChildResponse>(`/organisms/${input.parentOrganismId}/children`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
