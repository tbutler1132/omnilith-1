import { describe, expect, it, vi } from 'vitest';
import { createSpatialContextChannel } from './spatial-context-channel.js';
import { createEmptySpatialContext } from './spatial-context-contract.js';

describe('spatial context channel', () => {
  it('pushes the current snapshot immediately on subscribe', () => {
    const initial = createEmptySpatialContext();
    const channel = createSpatialContextChannel(initial);
    const listener = vi.fn();

    const unsubscribe = channel.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(initial);
    unsubscribe();
  });

  it('publishes updates and stops notifying unsubscribed listeners', () => {
    const channel = createSpatialContextChannel(createEmptySpatialContext());
    const listener = vi.fn();
    const unsubscribe = channel.subscribe(listener);

    const next = {
      ...createEmptySpatialContext(),
      mapOrganismId: 'map-root',
      focusedOrganismId: 'organism-7',
      surfaceSelection: ['organism-7'],
      boundaryPath: ['community-root'],
      timestamp: '2026-02-24T00:00:00.000Z',
    };
    channel.publish(next);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(next);

    unsubscribe();
    channel.publish({
      ...next,
      mapOrganismId: 'map-child',
      timestamp: '2026-02-24T00:00:01.000Z',
    });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
