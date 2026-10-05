// Central API wrapper for Eventify frontend
const API_BASE = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('eventify_token');
}
function setToken(token) {
  localStorage.setItem('eventify_token', token);
}
function clearToken() {
  localStorage.removeItem('eventify_token');
  localStorage.removeItem('eventify_user');
}
function getUser() {
  const raw = localStorage.getItem('eventify_user');
  return raw ? JSON.parse(raw) : null;
}
function setUser(user) {
  localStorage.setItem('eventify_user', JSON.stringify(user));
}
function isLoggedIn() {
  return !!getToken();
}

async function apiRequest(path, { method = 'GET', body = null, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      // token invalid/expired
      clearToken();
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' }),
};

function imageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:5000${path}`;
}
