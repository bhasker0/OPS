import { API_BASE } from '../config/api';

/**
 * Enhanced fetch client that automatically attaches JWT Bearer token and JSON headers.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('ops_token') || '';
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn('API returned 401 Unauthorized for:', url);
  }

  return response;
}

export async function apiGet(endpoint, options = {}) {
  const res = await apiFetch(endpoint, { ...options, method: 'GET' });
  return res.json();
}

export async function apiPost(endpoint, body = {}, options = {}) {
  const res = await apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiPut(endpoint, body = {}, options = {}) {
  const res = await apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiPatch(endpoint, body = {}, options = {}) {
  const res = await apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete(endpoint, options = {}) {
  const res = await apiFetch(endpoint, { ...options, method: 'DELETE' });
  return res.json();
}
