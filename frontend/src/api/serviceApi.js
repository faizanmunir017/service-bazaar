import { getBackendBase, API_PATHS } from '../config/api';

const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function formatNetworkError(error) {
  if (error?.name === 'AbortError') {
    return 'We could not complete your request in time. Please check your internet connection and try again.';
  }
  const msg = error?.message || String(error);
  if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
    return 'Unable to connect to the service. Please check your internet connection and try again.';
  }
  return msg;
}

export async function checkBackendHealth() {
  const base = getBackendBase();
  try {
    const response = await fetchWithTimeout(`${base}${API_PATHS.health}`, {}, 8000);
    if (!response.ok) {
      return { ok: false, error: `Health check failed (${response.status})` };
    }
    const data = await response.json();
    return { ok: data?.status === 'ok', data };
  } catch (error) {
    return { ok: false, error: formatNetworkError(error) };
  }
}

export async function submitServiceRequest(message, locale = 'en') {
  const base = getBackendBase();
  try {
    const response = await fetchWithTimeout(`${base}${API_PATHS.request}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message, locale }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || data?.message || `Request failed (${response.status})`);
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: formatNetworkError(error) };
  }
}

export async function pollServiceResponse() {
  const base = getBackendBase();
  const response = await fetchWithTimeout(`${base}${API_PATHS.poll}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, 30000);

  if (!response.ok) {
    throw new Error(`Poll failed (${response.status})`);
  }
  return await response.json();
}

export async function submitDispute(payload) {
  const base = getBackendBase();
  try {
    const response = await fetchWithTimeout(`${base}${API_PATHS.dispute}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || data?.message || `Dispute failed (${response.status})`);
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: formatNetworkError(error) };
  }
}
