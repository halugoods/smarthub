/* ============================================================
   Smart Hub - Login Page
   ============================================================ */

import { showLoading, hideLoading } from '../shared/components.js';

// Reference global helpers
const apiGet = (...args) => window.apiGet(...args);
const showToast = (...args) => window.showToast(...args);

let loginState = {
  mode: 'admin', // 'admin' | 'crew'
  branches: []
};

/**
 * Render the login page
 * @param {HTMLElement} container - App root element
 */
export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-logo">Smart Hub</div>
      <p class="login-subtitle">Portal Management Konten</p>

      <div class="login-card">
        <div class="login-tabs">
          <button class="login-tab active" data-tab="admin">
            <i class="fas fa-shield-alt"></i> Admin
          </button>
          <button class="login-tab" data-tab="crew">
            <i class="fas fa-users"></i> Crew
          </button>
        </div>

        <!-- Admin Login -->
        <form class="login-form active" id="form-admin" data-form="admin">
          <div class="form-group">
            <label><i class="fas fa-lock"></i> PIN Admin</label>
            <input type="password" id="pin-admin" placeholder="Masukkan PIN Admin" autocomplete="off" inputmode="numeric" pattern="[0-9]*" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fas fa-sign-in-alt"></i> Masuk sebagai Admin
          </button>
        </form>

        <!-- Crew Login -->
        <form class="login-form" id="form-crew" data-form="crew">
          <div class="form-group">
            <label><i class="fas fa-code-branch"></i> Pilih Cabang</label>
            <select id="select-branch" required>
              <option value="">-- Pilih Cabang --</option>
            </select>
          </div>
          <div class="form-group">
            <label><i class="fas fa-lock"></i> PIN Crew</label>
            <input type="password" id="pin-crew" placeholder="Masukkan PIN Crew" autocomplete="off" inputmode="numeric" pattern="[0-9]*" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fas fa-sign-in-alt"></i> Masuk sebagai Crew
          </button>
        </form>
      </div>

      <p class="text-muted" style="font-size:0.75rem;margin-top:16px;">
        <i class="fas fa-info-circle"></i> Hubungi admin untuk mendapatkan PIN
      </p>
    </div>
  `;

  // Cache elements
  const tabs = container.querySelectorAll('.login-tab');
  const forms = {
    admin: container.querySelector('#form-admin'),
    crew: container.querySelector('#form-crew')
  };
  const branchSelect = container.querySelector('#select-branch');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.tab;
      loginState.mode = mode;
      forms.admin.classList.toggle('active', mode === 'admin');
      forms.crew.classList.toggle('active', mode === 'crew');
    });
  });

  // Load branches for crew login
  loadBranches(branchSelect);

  // Admin form submit
  forms.admin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = container.querySelector('#pin-admin').value.trim();
    if (!pin) {
      showToast('Masukkan PIN Admin', 'error');
      return;
    }
    await handleLogin('admin', { pin, branchId: 'indonesia' });
  });

  // Crew form submit
  forms.crew.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = container.querySelector('#pin-crew').value.trim();
    const branchId = branchSelect.value;
    if (!pin) {
      showToast('Masukkan PIN Crew', 'error');
      return;
    }
    if (!branchId) {
      showToast('Pilih cabang terlebih dahulu', 'error');
      return;
    }
    await handleLogin('crew', { pin, branchId });
  });
}

/**
 * Load branches from API
 */
async function loadBranches(selectEl) {
  try {
    const data = await apiGet('https://smarthub-frontend.halugoods-indonesia.workers.dev/api/branches');
    const branches = data.branches || data || [];
    loginState.branches = branches;
    selectEl.innerHTML = '<option value="">-- Pilih Cabang --</option>';
    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name || b.nama || `Cabang ${b.id}`;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.warn('Gagal memuat cabang:', err);
    // Fallback data
    const fallback = [
      { id: 1, name: 'Cabang Utama' },
      { id: 2, name: 'Cabang Kedua' },
      { id: 3, name: 'Cabang Ketiga' },
      { id: 4, name: 'Cabang Keempat' },
      { id: 5, name: 'Cabang Kelima' },
      { id: 6, name: 'Cabang Keenam' },
      { id: 7, name: 'Cabang Ketujuh' }
    ];
    loginState.branches = fallback;
    selectEl.innerHTML = '<option value="">-- Pilih Cabang --</option>';
    fallback.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      selectEl.appendChild(opt);
    });
  }
}

/**
 * Handle login API call
 */
async function handleLogin(role, credentials) {
  showLoading();
  try {
    const payload = { pin: credentials.pin, branch_id: credentials.branchId };

    const response = await fetch('https://smarthub-frontend.halugoods-indonesia.workers.dev/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'PIN salah atau tidak valid');
    }

    const data = await response.json();
    const user = data.user || data;

    // Store session
    const session = {
      token: data.token || 'demo-token',
      role: role,
      user: user
    };
    if (role === 'crew') {
      session.branchId = credentials.branchId;
      session.branchName = getBranchName(credentials.branchId);
    }
    sessionStorage.setItem('smarthub_session', JSON.stringify(session));
    window.appState.currentUser = session;

    hideLoading();
    showToast(`Selamat datang, ${role === 'admin' ? 'Admin' : session.branchName}!`, 'success');

    // Redirect
    setTimeout(() => {
      window.location.hash = role === 'admin' ? '#admin' : '#crew';
    }, 300);

  } catch (err) {
    hideLoading();
    showToast(err.message || 'Login gagal. Coba lagi.', 'error');
  }
}

/**
 * Get branch name by ID
 */
function getBranchName(branchId) {
  const branch = loginState.branches.find(b => b.id == branchId);
  return branch ? (branch.name || branch.nama) : `Cabang ${branchId}`;
}


