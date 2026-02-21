/**
 * Altitude contract — shared zoom-level vocabulary across web features.
 *
 * Keeps altitude typing independent from any single feature implementation
 * so orchestration and rendering can coordinate through one neutral contract.
 */

export type Altitude = 'high' | 'mid' | 'close';
