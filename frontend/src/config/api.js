import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 8000;

const BACKEND_NOT_CONFIGURED_MSG =
  'App is not connected to the server. Rebuild the APK with EXPO_PUBLIC_BACKEND_URL set to your deployed backend URL (see frontend/eas.env.example).';

/**
 * Resolves the machine running Expo (LAN IP on physical device, localhost on simulators).
 */
function getExpoDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost;

  if (!hostUri) return null;

  const host = String(hostUri).split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  return host;
}

function isStandaloneBuild() {
  return (
    Constants.executionEnvironment === 'standalone' ||
    Constants.appOwnership === 'standalone'
  );
}

function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  // Common mistake: including /api in the base URL
  if (trimmed.endsWith('/api')) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
}

/**
 * Backend base URL for ServiceBazaar API.
 * - Dev: EXPO_PUBLIC_BACKEND_URL in frontend/.env or Expo LAN host
 * - APK/EAS: must set EXPO_PUBLIC_BACKEND_URL at build time (EAS env or .env during eas build)
 */
export function getBackendBase() {
  const fromEnv = normalizeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  if (fromEnv) return fromEnv;

  const fromExtra = normalizeBaseUrl(Constants.expoConfig?.extra?.backendUrl);
  if (fromExtra) return fromExtra;

  // Installed APK/AAB — do not fall back to localhost or emulator-only hosts
  if (isStandaloneBuild()) {
    return null;
  }

  const lanHost = getExpoDevHost();
  if (lanHost) {
    return `http://${lanHost}:${DEFAULT_PORT}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:${DEFAULT_PORT}`;
    }
  }

  return `http://localhost:${DEFAULT_PORT}`;
}

export function getBackendConfigError() {
  if (getBackendBase()) return null;
  return BACKEND_NOT_CONFIGURED_MSG;
}

export const API_PATHS = {
  health: '/api/health',
  request: '/api/request',
  poll: '/api/poll',
  dispute: '/api/dispute',
  bookingConfirm: '/api/booking/confirm',
  bookingCancel: '/api/booking/cancel',
};
