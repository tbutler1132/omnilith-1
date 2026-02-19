/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string;
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_DEV_PORT?: string;
  readonly VITE_GUEST_ACCESS_STRATEGY?: 'interest' | 'login';
}
