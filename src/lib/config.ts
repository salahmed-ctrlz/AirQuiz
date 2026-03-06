/**
 * AirQuiz — Frontend configuration.
 * Auto-detects LAN IP for mobile connectivity.
 *
 * Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
 */

// port 8000 matches backend BACKEND_PORT default — override via VITE_API_URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }
  return 'http://localhost:8000';
};

// Helper to sanitize Env URLs
// If Env URL is localhost but we are on a different IP, we must ignore Env and use dynamic
const getSmartUrl = (envUrl?: string) => {
  const dynamicUrl = getBaseUrl();

  // If no env var, use dynamic
  if (!envUrl) return dynamicUrl;

  // If env var is localhost, but we are NOT on localhost (e.g. 192.168.x.x), stick to dynamic
  if (envUrl.includes('localhost') && !dynamicUrl.includes('localhost')) {
    return dynamicUrl;
  }

  // Otherwise trust env (e.g. production URL)
  return envUrl;
}

export const config = {
  // API Base URL
  // We wrap the env var in our smart helper to fix LAN issues
  apiUrl: getSmartUrl(import.meta.env.VITE_API_URL),

  // Socket.IO connection
  socketUrl: getSmartUrl(import.meta.env.VITE_SOCKET_URL),

  // Admin password (in production, this should come from environment)
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || 'airquiz2024',

  // Demo mode
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true' || false,

  // Reconnection settings
  reconnection: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
  },

  // Groups available for students
  groups: ['G1', 'G2', 'G3', 'G4', 'G5'] as const,
};

export type Group = typeof config.groups[number];
