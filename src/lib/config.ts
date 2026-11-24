/**
 * AirQuiz — Frontend configuration.
 * In production the backend serves this app, so the API lives on the same origin.
 * Only the Vite dev server (port 5173) needs to be pointed at port 8000.
 */

const resolveBase = (override?: string): string => {
  if (override) return override;
  if (typeof window === 'undefined') return 'http://localhost:8000';
  const { protocol, hostname, port, origin } = window.location;
  return port === '5173' ? `${protocol}//${hostname}:8000` : origin;
};

export const config = {
  apiUrl: resolveBase(import.meta.env.VITE_API_URL),
  socketUrl: resolveBase(import.meta.env.VITE_SOCKET_URL),

  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',

  reconnection: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
  },

  groups: ['G1', 'G2', 'G3', 'G4', 'G5'] as const,
};

export type Group = typeof config.groups[number];
