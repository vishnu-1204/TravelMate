/**
 * Single source of truth for backend URL resolution across the TravelMate application.
 * Resolves environmental mismatches and prevents port differences (e.g. 3000, 3003, 5000)
 * in different components.
 */
export const resolveBackendUrl = (): string => {
  // 1. Try environment variables first (set during build-time by Vite/Vercel)
  const configured = (
    import.meta.env.VITE_AUTH_BACKEND_URL || 
    import.meta.env.VITE_BACKEND_URL || 
    ''
  ).trim();
  
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // 2. Dynamic fallback based on browser address bar
  const { hostname, origin } = window.location;
  
  // Check if running on localhost/local network loopback
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  // Local development backend defaults to port 3003 (Express backend)
  if (isLocal) {
    return 'http://localhost:3003';
  }

  // In production/Vercel, if VITE_AUTH_BACKEND_URL is not set, 
  // warn in console and fallback to origin (useful if deployed as monorepo)
  console.warn(
    '⚠️ TravelMate Warning: VITE_AUTH_BACKEND_URL env variable is not defined!\n' +
    'API calls are falling back to the frontend origin: ' + origin + '\n' +
    'If you deployed your backend separately, please configure VITE_AUTH_BACKEND_URL on Vercel.'
  );
  
  return origin;
};

export const BACKEND_URL = resolveBackendUrl();
