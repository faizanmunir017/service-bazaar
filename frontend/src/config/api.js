import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = 8000;

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

/**
 * Backend base URL for ServiceBazaar API.
 * Override with EXPO_PUBLIC_BACKEND_URL in frontend/.env (e.g. http://192.168.1.5:8000).
 */
export function getBackendBase() {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  const lanHost = getExpoDevHost();
  if (lanHost) {
    return `http://${lanHost}:${DEFAULT_PORT}`;
  }

  if (Platform.OS === 'android') {
    // Android emulator → host machine
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

export const API_PATHS = {
  health: '/api/health',
  request: '/api/request',
  poll: '/api/poll',
  dispute: '/api/dispute',
};
