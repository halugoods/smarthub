/* ============================================================
   Smart Hub - Main Application
   SPA with hash routing, global state, and API helpers
   ============================================================ */

// Import page renderers
import { renderLogin } from './pages/login.js';
import { renderAdmin } from './pages/admin.js';
import { renderCrew } from './pages/crew.js';
import { showLoading, hideLoading } from './shared/components.js';

/* ============================================================
   GLOBAL STATE
   ============================================================ */

window.appState = {
  currentUser: null,
  tasks: [],
  branches: []
};

/* ============================================================
   API BASE URL
   ============================================================ */

const API_BASE = 'https://smarthub-frontend.halugoods-indonesia.workers.dev'; // Same origin — smarthub-frontend worker handles both frontend + API // Cloudflare Worker API

/* ============================================================
   SESSION MANAGEMENT
   ============================================================ */

/**
 * Load session from sessionStorage
 */
function loadSession() {
  try {
    const data = sessionStorage.getItem('smarthub_session');
    if (data) {
      const session = JSON.parse(data);
      window.appState.currentUser = session;
      return session;
    }
  } catch (e) {
    console.warn('Failed to load session:', e);
  }
  return null;
}

/**
 * Get auth token from session
 */
function getAuthToken() {
  try {
    const session = JSON.parse(sessionStorage.getItem('smarthub_session') || '{}');
    return session.token || '';
  } catch {
    return '';
  }
}

/**
 * Get auth headers for API calls
 */
function authHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/* ============================================================
   API HELPERS
   ============================================================ */

/**
 * Generic fetch wrapper
 */
async function apiRequest(method, path, body = null) {
  const url = `${API_BASE}${path}`;
  const options = {
    method: method,
    headers: method === 'GET' ? {
      'Authorization': `Bearer ${getAuthToken()}`
    } : authHeaders()
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.message || errData.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {};
  }

  return await response.json();
}

/**
 * GET request
 * @param {string} path - API path (e.g. '/api/tasks')
 * @returns {Promise<object>}
 */
window.apiGet = async function(path) {
  return apiRequest('GET', path);
};

/**
 * POST request
 * @param {string} path - API path
 * @param {object} body - Request body
 * @returns {Promise<object>}
 */
window.apiPost = async function(path, body) {
  return apiRequest('POST', path, body);
};

/**
 * PUT request
 * @param {string} path - API path
 * @param {object} body - Request body
 * @returns {Promise<object>}
 */
window.apiPut = async function(path, body) {
  return apiRequest('PUT', path, body);
};

/**
 * DELETE request
 * @param {string} path - API path
 * @returns {Promise<object>}
 */
window.apiDelete = async function(path) {
  return apiRequest('DELETE', path);
};

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {'success'|'error'|'info'} type - Toast type
 */
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle'
  };

  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
};

/* ============================================================
   SPA ROUTER
   ============================================================ */

/**
 * Main router - handles hash-based navigation
 */
function router() {
  const hash = window.location.hash || '#login';
  const app = document.getElementById('app');

  if (!app) {
    console.error('App root element not found');
    return;
  }

  // Determine route
  let route = hash.split('?')[0].toLowerCase();

  // Check authentication for protected routes
  const session = loadSession();

  // Route handling
  switch (route) {
    case '#admin':
      if (!session || session.role !== 'admin') {
        window.location.hash = '#login';
        return;
      }
      renderAdmin(app);
      break;

    case '#crew':
      if (!session || session.role !== 'crew') {
        window.location.hash = '#login';
        return;
      }
      renderCrew(app);
      break;

    case '#login':
    default:
      // If already logged in, redirect to appropriate dashboard
      if (session) {
        if (session.role === 'admin') {
          window.location.hash = '#admin';
        } else if (session.role === 'crew') {
          window.location.hash = '#crew';
        }
        return;
      }
      renderLogin(app);
      break;
  }
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

/**
 * Initialize the application
 */
function init() {
  // Initial render
  router();

  // Listen for hash changes
  window.addEventListener('hashchange', router);

  // Handle browser back/forward
  window.addEventListener('popstate', router);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('🔧 Smart Hub App initialized');
console.log(`📍 Current route: ${window.location.hash || '#login'}`);
