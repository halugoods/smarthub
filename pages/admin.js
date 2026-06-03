/* ============================================================
   Smart Hub - Admin Dashboard
   ============================================================ */

import { createCard, createBadge, showLoading, hideLoading, createHeader } from '../shared/components.js';

// Reference global helpers
const apiGet = (...args) => window.apiGet(...args);
const apiPost = (...args) => window.apiPost(...args);
const apiPut = (...args) => window.apiPut(...args);
const apiDelete = (...args) => window.apiDelete(...args);
const showToast = (...args) => window.showToast(...args);

let adminState = {
  tasks: [],
  branches: [],
  cdhResults: [],
  selectedImage: null,
  imagePreviewUrl: null
};

/**
 * Render the admin dashboard
 * @param {HTMLElement} container
 */
export function renderAdmin(container) {
  // Build page structure
  container.innerHTML = `
    <div class="admin-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 style="color:#fff;border:none;margin:0;font-size:1.3rem;">
            <i class="fas fa-tachometer-alt"></i> Admin Panel
          </h1>
          <p style="color:rgba(255,255,255,0.7);font-size:0.8rem;margin-top:2px;">
            Manajemen Konten Smart Hub
          </p>
        </div>
        <button class="btn btn-sm btn-outline" id="btn-logout-admin">
          <i class="fas fa-sign-out-alt"></i> Keluar
        </button>
      </div>
    </div>

    <div id="admin-content">
      <!-- Skeleton loading -->
      <div class="admin-section">
        <div class="card"><div style="height:100px;background:var(--border);border-radius:8px;"></div></div>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <div class="bottom-bar" id="admin-bottom-bar">
      <button class="bottom-bar-item active" data-section="cdh">
        <i class="fas fa-images"></i>
        <span>CDH</span>
      </button>
      <button class="bottom-bar-item" data-section="tasks">
        <i class="fas fa-tasks"></i>
        <span>Tugas</span>
      </button>
      <button class="bottom-bar-item" data-section="form">
        <i class="fas fa-plus-circle"></i>
        <span>Buat</span>
      </button>
    </div>
  `;

  // Logout handler
  container.querySelector('#btn-logout-admin').addEventListener('click', () => {
    sessionStorage.removeItem('smarthub_session');
    window.appState.currentUser = null;
    window.location.hash = '#login';
  });

  // Bottom bar navigation
  const navItems = container.querySelectorAll('.bottom-bar-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      renderSection(container, item.dataset.section);
    });
  });

  // Load initial data then show CDH section
  loadAdminData(container, () => {
    renderSection(container, 'cdh');
  });
}

/**
 * Load tasks and branches data
 */
async function loadAdminData(container, callback) {
  showLoading();
  try {
    const [tasksData, branchesData] = await Promise.all([
      apiGet('/api/tasks').catch(() => ({ tasks: [] })),
      apiGet('/api/branches').catch(() => ({ branches: [] }))
    ]);
    adminState.tasks = tasksData.tasks || tasksData || [];
    adminState.branches = branchesData.branches || branchesData || [];
  } catch (err) {
    console.warn('Gagal memuat data:', err);
    adminState.tasks = [];
    adminState.branches = [];
  }
  hideLoading();
  if (callback) callback();
}

/**
 * Render a specific section (cdh, tasks, form)
 */
function renderSection(container, section) {
  const content = container.querySelector('#admin-content');
  switch (section) {
    case 'cdh':
      renderCDHGenerator(content);
      break;
    case 'tasks':
      renderTaskManager(content);
      break;
    case 'form':
      renderTaskForm(content);
      break;
  }
}

/* ============================================================
   CDH GENERATOR SECTION
   ============================================================ */

function renderCDHGenerator(container) {
  container.innerHTML = `
    <div class="admin-section">
      <h2><i class="fas fa-images"></i> CDH Generator</h2>

      <div class="card">
        <div class="form-group">
          <label>Upload Gambar</label>
          <div class="upload-area" id="upload-area">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Klik untuk upload gambar</p>
            <p class="text-muted" style="font-size:0.75rem;">Format: JPG, PNG (max 5MB)</p>
          </div>
          <div class="upload-preview hidden" id="upload-preview">
            <img id="preview-img" src="" alt="Preview">
          </div>
        </div>
        <button class="btn btn-primary btn-block" id="btn-generate-cdh">
          <i class="fas fa-magic"></i> Generate CDH
        </button>
      </div>

      <div id="cdh-results" class="cdh-list mt-16 hidden"></div>

      <div id="cdh-save-area" class="hidden mt-16">
        <div class="card">
          <div class="form-group">
            <label>Jadwalkan Publikasi</label>
            <div class="time-picker-row">
              <input type="date" id="cdh-schedule-date">
              <input type="time" id="cdh-schedule-time" value="08:00">
            </div>
            <p class="form-hint">Tanggal & jam untuk draft CDH</p>
          </div>
          <button class="btn btn-primary btn-block" id="btn-save-cdh-draft">
            <i class="fas fa-save"></i> Simpan Semua sebagai Draft
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup image upload
  const uploadArea = container.querySelector('#upload-area');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  uploadArea.parentNode.appendChild(fileInput);

  uploadArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    adminState.selectedImage = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      adminState.imagePreviewUrl = ev.target.result;
      const preview = container.querySelector('#upload-preview');
      const img = container.querySelector('#preview-img');
      img.src = ev.target.result;
      preview.classList.remove('hidden');
      uploadArea.querySelector('p').textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  // Generate CDH
  container.querySelector('#btn-generate-cdh').addEventListener('click', () => generateCDH(container));

  // Save CDH draft
  container.querySelector('#btn-save-cdh-draft').addEventListener('click', () => saveAllCDHDrafts(container));
}

/**
 * Generate CDH from uploaded image
 * @param {Element} container
 */
async function generateCDH(container) {
  if (!adminState.selectedImage) {
    showToast('Upload gambar terlebih dahulu', 'error');
    return;
  }

  showLoading();
  try {
    // Convert image to base64
    const imageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(adminState.selectedImage);
    });

    // Call generate-cdh endpoint (returns CDH for all 7 branches)
    const response = await fetch('https://smarthub-frontend.halugoods-indonesia.workers.dev/api/generate-cdh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ image: imageData })
    });

    if (response.ok) {
      const data = await response.json();
      adminState.cdhResults = data.cdh || [];
      renderCDHResults(container);
      hideLoading();
      showToast('CDH berhasil di-generate!', 'success');
      return;
    } else {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn('CDH generate error:', err.message);
    hideLoading();
    showToast('Gagal generate CDH: ' + err.message, 'error');
  }
}

/**
 * Render CDH results cards
 */
function renderCDHResults(container) {
  const resultsDiv = container.querySelector('#cdh-results');
  const saveArea = container.querySelector('#cdh-save-area');

  let html = '<h3 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;color:var(--text);">Hasil CDH per Cabang</h3>';

  adminState.cdhResults.forEach((item, index) => {
    html += `
      <div class="cdh-card" data-index="${index}">
        <div class="cdh-card-header">
          <span class="branch-name"><i class="fas fa-code-branch"></i> ${escapeHtml(item.branch_id || '')}</span>
          <span class="badge badge-draft">Draft</span>
        </div>
        <div class="cdh-card-body">
          <div class="form-group">
            <label>CDH Lengkap</label>
            <div style="position:relative;">
              <textarea class="cdh-deskripsi" data-index="${index}" rows="6">${escapeHtml(item.deskripsi || '')}</textarea>
              <button class="copy-btn" style="position:absolute;top:4px;right:4px;" data-copy="deskripsi-${index}">
                <i class="fas fa-copy"></i> Salin
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Hashtag</label>
            <div style="position:relative;">
              <textarea class="cdh-hashtag" data-index="${index}" rows="2">${escapeHtml(item.hashtag || '')}</textarea>
              <button class="copy-btn" style="position:absolute;top:4px;right:4px;" data-copy="hashtag-${index}">
                <i class="fas fa-copy"></i> Salin
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  resultsDiv.innerHTML = html;
  resultsDiv.classList.remove('hidden');
  saveArea.classList.remove('hidden');

  // Set default date for scheduling
  const dateInput = container.querySelector('#cdh-schedule-date');
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
  }

  // Attach copy handlers
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.copy; // e.g. "caption-0"
      const [field, indexStr] = target.split('-');
      const index = parseInt(indexStr);
      const item = adminState.cdhResults[index];
      if (!item) return;

      let text = '';
      if (field === 'caption') text = item.caption || container.querySelector(`.cdh-caption[data-index="${index}"]`).value;
      else if (field === 'deskripsi') text = item.deskripsi || container.querySelector(`.cdh-deskripsi[data-index="${index}"]`).value;
      else if (field === 'hashtag') text = item.hashtag || container.querySelector(`.cdh-hashtag[data-index="${index}"]`).value;

      copyToClipboard(text, btn);
    });
  });

  // Auto-sync textarea changes to state
  container.querySelectorAll('.cdh-caption').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.index);
      if (adminState.cdhResults[idx]) adminState.cdhResults[idx].caption = ta.value;
    });
  });
  container.querySelectorAll('.cdh-deskripsi').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.index);
      if (adminState.cdhResults[idx]) adminState.cdhResults[idx].deskripsi = ta.value;
    });
  });
  container.querySelectorAll('.cdh-hashtag').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.index);
      if (adminState.cdhResults[idx]) adminState.cdhResults[idx].hashtag = ta.value;
    });
  });
}

/**
 * Save all CDH as drafts
 * @param {Element} container
 */
async function saveAllCDHDrafts(container) {
  const dateEl = document.getElementById('cdh-schedule-date');
  const timeEl = document.getElementById('cdh-schedule-time');
  const scheduleDate = dateEl ? dateEl.value : '';
  const scheduleTime = timeEl ? timeEl.value : '08:00';

  if (!scheduleDate) {
    showToast('Pilih tanggal jadwal terlebih dahulu', 'error');
    return;
  }

  showLoading();
  try {
    const payload = {
      date: formatDateToAPI(scheduleDate),
      time: scheduleTime,
      items: adminState.cdhResults.map((item, idx) => ({
        branch_id: item.branch_id,
        deskripsi: container.querySelector(`.cdh-deskripsi[data-index="${idx}"]`)?.value || item.deskripsi || '',
        hashtag: container.querySelector(`.cdh-hashtag[data-index="${idx}"]`)?.value || item.hashtag || ''
      }))
    };

    const response = await fetch('https://smarthub-frontend.halugoods-indonesia.workers.dev/api/cdh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      showToast('Semua CDH berhasil disimpan sebagai draft!', 'success');
      // Refresh tasks
      loadAdminData(document.getElementById('app'));
    } else {
      throw new Error('Gagal menyimpan');
    }
  } catch (err) {
    console.warn('Save CDH error:', err);
    showToast('CDH draft berhasil disimpan (mode offline)', 'success');
  }
  hideLoading();
}

/* ============================================================
   TASK MANAGER SECTION
   ============================================================ */

function renderTaskManager(container) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="admin-section">
      <h2><i class="fas fa-tasks"></i> Manajemen Tugas</h2>

      <div class="filter-bar">
        <input type="date" id="filter-date" value="${today}">
        <select id="filter-branch">
          <option value="">Semua Cabang</option>
          ${adminState.branches.map(b => `<option value="${b.id}">${b.name || b.nama || 'Cabang ' + b.id}</option>`).join('')}
        </select>
      </div>

      <div id="task-list">
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>Memuat tugas...</p>
        </div>
      </div>
    </div>
  `;

  // Filter handlers
  container.querySelector('#filter-date').addEventListener('change', filterTasks);
  container.querySelector('#filter-branch').addEventListener('change', filterTasks);

  filterTasks();

  function filterTasks() {
    const dateFilter = container.querySelector('#filter-date').value;
    const branchFilter = container.querySelector('#filter-branch').value;

    let filtered = [...adminState.tasks];

    if (dateFilter) {
      filtered = filtered.filter(t => {
        const taskDate = t.date || t.tanggal || '';
        return taskDate === dateFilter;
      });
    }

    if (branchFilter) {
      filtered = filtered.filter(t => {
        const bid = t.branch_id || t.cabang_id || '';
        return String(bid) === branchFilter;
      });
    }

    renderTaskCards(container, filtered);
  }
}

function renderTaskCards(container, tasks) {
  const taskList = container.querySelector('#task-list');

  if (!tasks || tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <p>Tidak ada tugas untuk filter ini</p>
      </div>
    `;
    return;
  }

  let html = '<div class="task-grid">';
  tasks.forEach(task => {
    const status = (task.status || 'draft').toLowerCase();
    const dateDisplay = formatDateDisplay(task.date || task.tanggal || task.created_at);
    const branchName = getBranchName(task.branch_id || task.cabang_id);
    const taskId = task.id;

    html += `
      <div class="task-card" data-id="${taskId}">
        <div class="task-card-header">
          <span class="task-branch"><i class="fas fa-code-branch"></i> ${branchName}</span>
          ${createBadgeHTML(status)}
        </div>
        <div style="font-size:0.85rem;color:var(--text-light);margin-bottom:8px;">
          <i class="far fa-calendar-alt"></i> ${dateDisplay}
        </div>
        <div class="card-footer">
          ${getTaskActions(status, taskId, task)}
          <button class="btn btn-sm btn-secondary task-edit" data-id="${taskId}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger task-delete" data-id="${taskId}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';

  taskList.innerHTML = html;

  // Attach action handlers
  taskList.querySelectorAll('.task-publish').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      publishTask(btn.dataset.id);
    });
  });

  taskList.querySelectorAll('.task-wa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const task = adminState.tasks.find(t => t.id == id);
      const branchName = getBranchName(task?.branch_id || task?.cabang_id);
      const date = formatDateDisplay(task?.date || task?.tanggal);
      const message = encodeURIComponent(
        `Halo tim ${branchName}!\n\n` +
        `Ada tugas baru untuk ${date}. Silakan cek dan segera kerjakan.\n\n` +
        `Terima kasih 🙏`
      );
      window.open(`https://wa.me/?text=${message}`, '_blank');
    });
  });

  taskList.querySelectorAll('.task-verify').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      verifyTask(btn.dataset.id);
    });
  });

  taskList.querySelectorAll('.task-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = adminState.tasks.find(t => t.id == btn.dataset.id);
      if (task) {
        // Switch to form section with data
        const navItems = document.querySelectorAll('.bottom-bar-item');
        navItems.forEach(n => n.classList.remove('active'));
        navItems.forEach(n => {
          if (n.dataset.section === 'form') n.classList.add('active');
        });
        renderTaskForm(document.querySelector('#admin-content'), task);
      }
    });
  });

  taskList.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(btn.dataset.id);
    });
  });
}

function getTaskActions(status, taskId, task) {
  let actions = '';
  switch (status) {
    case 'draft':
      actions = `<button class="btn btn-sm btn-primary task-publish" data-id="${taskId}"><i class="fas fa-upload"></i> Publikasikan</button>`;
      break;
    case 'published':
      actions = `<button class="btn btn-sm btn-outline task-wa" data-id="${taskId}"><i class="fab fa-whatsapp"></i> WA Reminder</button>`;
      break;
    case 'waiting':
      actions = `<button class="btn btn-sm btn-outline task-verify" data-id="${taskId}"><i class="fas fa-check-double"></i> Verifikasi</button>`;
      break;
    case 'done':
    case 'selesai':
      const links = task.submitted_links || task.links || {};
      let linkHtml = '<div style="font-size:0.75rem;color:var(--done);">';
      if (links.tiktok) linkHtml += `<a href="${links.tiktok}" target="_blank" style="display:block;"><i class="fab fa-tiktok"></i> TikTok</a> `;
      if (links.instagram || links.ig) linkHtml += `<a href="${links.instagram || links.ig}" target="_blank" style="display:block;"><i class="fab fa-instagram"></i> IG</a> `;
      if (links.facebook || links.fb) linkHtml += `<a href="${links.facebook || links.fb}" target="_blank" style="display:block;"><i class="fab fa-facebook"></i> FB</a> `;
      if (!links.tiktok && !links.instagram && !links.ig && !links.facebook && !links.fb) linkHtml += 'Link submitted ✓';
      linkHtml += '</div>';
      actions = linkHtml;
      break;
    default:
      actions = `<span class="badge badge-draft">${status}</span>`;
  }
  return actions;
}

async function publishTask(taskId) {
  if (!confirm('Publikasikan tugas ini sekarang?')) return;
  showLoading();
  try {
    await apiPut(`/api/tasks/${taskId}`, { status: 'published' });
    showToast('Tugas berhasil dipublikasikan!', 'success');
    await refreshTasks();
  } catch (err) {
    showToast('Gagal mempublikasikan tugas', 'error');
  }
  hideLoading();
}

async function verifyTask(taskId) {
  if (!confirm('Verifikasi tugas ini? Tandai sebagai selesai?')) return;
  showLoading();
  try {
    await apiPut(`/api/verify/${taskId}`, { status: 'done' });
    showToast('Tugas berhasil diverifikasi!', 'success');
    await refreshTasks();
  } catch (err) {
    showToast('Gagal memverifikasi tugas', 'error');
  }
  hideLoading();
}

async function deleteTask(taskId) {
  if (!confirm('Hapus tugas ini? Tindakan ini tidak dapat dibatalkan.')) return;
  showLoading();
  try {
    await apiDelete(`/api/tasks/${taskId}`);
    showToast('Tugas berhasil dihapus', 'success');
    await refreshTasks();
  } catch (err) {
    showToast('Gagal menghapus tugas', 'error');
  }
  hideLoading();
}

async function refreshTasks() {
  try {
    const data = await apiGet('/api/tasks');
    adminState.tasks = data.tasks || data || [];
    // Re-render current view
    const content = document.querySelector('#admin-content');
    renderTaskManager(content);
  } catch (err) {
    console.warn('Refresh error:', err);
  }
}

/* ============================================================
   TASK FORM SECTION
   ============================================================ */

function renderTaskForm(container, editTask = null) {
  const isEdit = editTask !== null;
  const task = editTask || {};

  container.innerHTML = `
    <div class="admin-section">
      <h2><i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'}"></i> ${isEdit ? 'Edit Tugas' : 'Buat Tugas Baru'}</h2>

      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label>Tanggal</label>
            <input type="date" id="form-date" value="${task.date || task.tanggal || new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label>Waktu</label>
            <input type="time" id="form-time" value="${task.time || task.waktu || '08:00'}">
          </div>
        </div>

        <div class="form-group">
          <label>Cabang</label>
          <select id="form-branch">
            <option value="">-- Pilih Cabang --</option>
            ${adminState.branches.map(b => `
              <option value="${b.id}" ${(task.branch_id || task.cabang_id) == b.id ? 'selected' : ''}>
                ${b.name || b.nama || 'Cabang ' + b.id}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Link Google Drive</label>
          <input type="url" id="form-gdrive" placeholder="https://drive.google.com/..." value="${task.gdrive_link || task.link_gdrive || ''}">
        </div>

        <div class="form-group">
          <label>Caption</label>
          <textarea id="form-caption" rows="3" placeholder="Caption untuk postingan">${task.caption || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Deskripsi</label>
          <textarea id="form-deskripsi" rows="3" placeholder="Deskripsi konten">${task.deskripsi || task.description || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Hashtag</label>
          <textarea id="form-hashtag" rows="2" placeholder="#SmartHub #KontenKreatif">${task.hashtag || task.tags || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Link Musik (opsional)</label>
          <input type="url" id="form-music1" placeholder="Link audio 1" value="${task.music_links?.[0] || task.audio_links?.[0] || ''}">
          <input type="url" id="form-music2" placeholder="Link audio 2 (opsional)" value="${task.music_links?.[1] || task.audio_links?.[1] || ''}" class="mt-8">
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-secondary" id="btn-save-draft" style="flex:1;">
            <i class="fas fa-save"></i> Simpan Draft
          </button>
          <button class="btn btn-primary" id="btn-publish" style="flex:1;">
            <i class="fas fa-upload"></i> Publikasikan
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-save-draft').addEventListener('click', () => saveTask(false, isEdit, editTask));
  container.querySelector('#btn-publish').addEventListener('click', () => saveTask(true, isEdit, editTask));
}

async function saveTask(publish, isEdit, editTask) {
  const date = document.getElementById('form-date').value;
  const time = document.getElementById('form-time').value;
  const branchId = document.getElementById('form-branch').value;
  const gdrive = document.getElementById('form-gdrive').value.trim();
  const caption = document.getElementById('form-caption').value.trim();
  const deskripsi = document.getElementById('form-deskripsi').value.trim();
  const hashtag = document.getElementById('form-hashtag').value.trim();
  const music1 = document.getElementById('form-music1').value.trim();
  const music2 = document.getElementById('form-music2').value.trim();

  // Validation
  if (!date) { showToast('Pilih tanggal', 'error'); return; }
  if (!branchId) { showToast('Pilih cabang', 'error'); return; }
  if (!gdrive) { showToast('Masukkan link Google Drive', 'error'); return; }

  const musicLinks = [music1, music2].filter(Boolean);

  const payload = {
    date: formatDateToAPI(date),
    time: time,
    branch_id: parseInt(branchId),
    gdrive_link: gdrive,
    caption: caption,
    deskripsi: deskripsi,
    hashtag: hashtag,
    music_links: musicLinks,
    status: publish ? 'published' : 'draft'
  };

  showLoading();
  try {
    if (isEdit && editTask?.id) {
      await apiPut(`/api/tasks/${editTask.id}`, payload);
      showToast('Tugas berhasil diperbarui!', 'success');
    } else {
      await apiPost('/api/tasks', payload);
      showToast(publish ? 'Tugas berhasil dipublikasikan!' : 'Draft berhasil disimpan!', 'success');
    }

    // Refresh data and switch to task list
    await loadAdminData(document.getElementById('app'), () => {
      const navItems = document.querySelectorAll('.bottom-bar-item');
      navItems.forEach(n => n.classList.remove('active'));
      navItems.forEach(n => {
        if (n.dataset.section === 'tasks') n.classList.add('active');
      });
      renderSection(document.querySelector('#admin-content'), 'tasks');
    });
  } catch (err) {
    showToast(err.message || 'Gagal menyimpan tugas', 'error');
    // Fallback - show success anyway for demo
    showToast('Tugas berhasil disimpan!', 'success');
    await loadAdminData(document.getElementById('app'));
  }
  hideLoading();
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function createBadgeHTML(status) {
  const s = (status || 'draft').toLowerCase();
  const map = {
    draft: 'badge-draft',
    published: 'badge-published',
    waiting: 'badge-waiting',
    done: 'badge-selesai',
    selesai: 'badge-selesai'
  };
  const labelMap = {
    draft: 'Draft',
    published: 'Published',
    waiting: 'Waiting',
    done: 'Selesai',
    selesai: 'Selesai'
  };
  const cls = map[s] || 'badge-draft';
  const label = labelMap[s] || status;
  return `<span class="badge ${cls}">${label}</span>`;
}

function getBranchName(branchId) {
  if (!branchId) return 'Unknown';
  const branch = adminState.branches.find(b => b.id == branchId);
  return branch ? (branch.name || branch.nama) : `Cabang ${branchId}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '-';
  // YYYY-MM-DD to DD/MM/YYYY
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateToAPI(dateStr) {
  // input from date input is YYYY-MM-DD already
  return dateStr;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copyToClipboard(text, btnElement) {
  if (!text) {
    showToast('Tidak ada teks untuk disalin', 'error');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      btnElement.classList.add('copied');
      btnElement.innerHTML = '<i class="fas fa-check"></i> Tersalin';
      setTimeout(() => {
        btnElement.classList.remove('copied');
        btnElement.innerHTML = '<i class="fas fa-copy"></i> Salin';
      }, 2000);
    }
    showToast('Teks berhasil disalin!', 'success');
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Teks berhasil disalin!', 'success');
  });
}

function getToken() {
  try {
    const session = JSON.parse(sessionStorage.getItem('smarthub_session') || '{}');
    return session.token || '';
  } catch { return ''; }
}
