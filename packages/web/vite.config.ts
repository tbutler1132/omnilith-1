import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function parsePort(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const webPort = parsePort(env.VITE_DEV_PORT, 5173);
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: webPort,
      proxy: {
        '/api': {
          target: apiTarget,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
