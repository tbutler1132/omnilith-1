/**
 * Runtime flags — centralized web behavior switches.
 *
 * Keeps demo-mode and guest-access strategy decisions in one place so
 * panel rendering can stay declarative and consistent.
 */

export type GuestAccessStrategy = 'interest' | 'login';

function readBooleanFlag(rawValue: unknown, fallback: boolean): boolean {
  if (typeof rawValue !== 'string') return fallback;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

function readGuestAccessStrategy(rawValue: unknown, fallback: GuestAccessStrategy): GuestAccessStrategy {
  if (rawValue === 'interest' || rawValue === 'login') return rawValue;
  return fallback;
}

const authEnabled = readBooleanFlag(import.meta.env.VITE_AUTH_ENABLED, false);
const defaultGuestAccessStrategy: GuestAccessStrategy = authEnabled ? 'login' : 'interest';
const guestAccessStrategy = readGuestAccessStrategy(
  import.meta.env.VITE_GUEST_ACCESS_STRATEGY,
  defaultGuestAccessStrategy,
);

export const runtimeFlags = {
  authEnabled,
  guestAccessStrategy,
} as const;
