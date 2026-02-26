/**
 * Systems View presenter.
 *
 * Shapes composition records into deterministic lane-ready nodes so the app
 * can render structure without embedding sorting or selection logic.
 */

import type {
  FetchChildrenWithStateResponse,
  FetchOrganismResponse,
  FetchParentResponse,
} from '@omnilith/api-contracts';
import { ApiError } from '../../../api/api-client.js';

export type SystemsViewStatus = 'loading' | 'auth-required' | 'error' | 'empty' | 'ready';

export interface PresentSystemsViewStatusInput {
  readonly loading: boolean;
  readonly error: Error | null;
  readonly hasOrganism: boolean;
}

export interface PresentSystemsViewStatusResult {
  readonly status: SystemsViewStatus;
  readonly message: string;
}

export interface PresentSystemsViewStructureInput {
  readonly organism: FetchOrganismResponse['organism'];
  readonly currentState: FetchOrganismResponse['currentState'];
  readonly parent: FetchParentResponse['parent'];
  readonly children: FetchChildrenWithStateResponse['children'];
  readonly selectedChildId: string | null;
}

export interface PresentedSystemsChildNode {
  readonly id: string;
  readonly name: string;
  readonly contentTypeId: string;
  readonly positionLabel: string;
  readonly isSelected: boolean;
  readonly openTrunk: boolean;
}

export interface PresentSystemsViewStructureResult {
  readonly parentId: string | null;
  readonly targetNode: {
    readonly id: string;
    readonly name: string;
    readonly contentTypeId: string;
    readonly openTrunk: boolean;
  };
  readonly selectedChildId: string | null;
  readonly childCount: number;
  readonly children: ReadonlyArray<PresentedSystemsChildNode>;
}

function isAuthRequiredError(error: Error | null): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

export function presentSystemsViewStatus(input: PresentSystemsViewStatusInput): PresentSystemsViewStatusResult {
  if (input.loading) {
    return {
      status: 'loading',
      message: 'Loading systems view...',
    };
  }

  if (isAuthRequiredError(input.error)) {
    return {
      status: 'auth-required',
      message: 'Log in to inspect structural composition in this boundary.',
    };
  }

  if (input.error) {
    return {
      status: 'error',
      message: input.error.message ?? 'Failed to load systems view.',
    };
  }

  if (!input.hasOrganism) {
    return {
      status: 'empty',
      message: 'No organism is available in this boundary context.',
    };
  }

  return {
    status: 'ready',
    message: '',
  };
}

export function presentSystemsViewStructure(
  input: PresentSystemsViewStructureInput,
): PresentSystemsViewStructureResult {
  const sortedChildren = [...input.children].sort((a, b) => {
    const aPosition = a.composition.position;
    const bPosition = b.composition.position;

    if (aPosition !== undefined && bPosition !== undefined && aPosition !== bPosition) {
      return aPosition - bPosition;
    }

    if (aPosition !== undefined && bPosition === undefined) {
      return -1;
    }

    if (aPosition === undefined && bPosition !== undefined) {
      return 1;
    }

    if (a.composition.composedAt !== b.composition.composedAt) {
      return a.composition.composedAt - b.composition.composedAt;
    }

    return a.organism.id.localeCompare(b.organism.id);
  });

  const normalizedSelectedChildId = resolveSelectedChildId(sortedChildren, input.selectedChildId);

  return {
    parentId: input.parent?.parentId ?? null,
    targetNode: {
      id: input.organism.id,
      name: input.organism.name,
      contentTypeId: input.currentState?.contentTypeId ?? 'none',
      openTrunk: Boolean(input.organism.openTrunk),
    },
    selectedChildId: normalizedSelectedChildId,
    childCount: sortedChildren.length,
    children: sortedChildren.map((child) => ({
      id: child.organism.id,
      name: child.organism.name,
      contentTypeId: child.currentState?.contentTypeId ?? 'none',
      positionLabel:
        child.composition.position === undefined || child.composition.position === null
          ? 'position none'
          : `position ${child.composition.position}`,
      isSelected: normalizedSelectedChildId === child.organism.id,
      openTrunk: child.organism.openTrunk,
    })),
  };
}

function resolveSelectedChildId(
  children: ReadonlyArray<FetchChildrenWithStateResponse['children'][number]>,
  selectedChildId: string | null,
): string | null {
  if (children.length === 0) {
    return null;
  }

  if (selectedChildId && children.some((child) => child.organism.id === selectedChildId)) {
    return selectedChildId;
  }

  return children[0]?.organism.id ?? null;
}
