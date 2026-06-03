/* ============================================================
   Smart Hub - Crew Dashboard
   ============================================================ */

import { createCard, createBadge, showLoading, hideLoading, createHeader } from '../shared/components.js';

// Reference global helpers
const apiGet = (...args) => window.apiGet(...args);
const apiPut = (...args) => window.apiPut(...args);
const showToast = (...args) => window.showToast(...args);

let crewState = {
  tasks: [],
  selectedTask: null,
  branchName: '',
  branchId: null
};

/**
 * Render the crew dashboard
 * @param {HTMLElement} container
 */
export function renderCrew(container) {
  // Get session info
  const session = getSession();
  if (!session || session.role !== 'crew') {
    window.location.hash = '#login';
    return;
  }

  crewState.branchId = session.branchId;
  crewState.branchName = session.branchName || 'Cabang';

  container.innerHTML = `
    <div class="app-header">
      <div>
        <h1><i class="fas fa-users"></i> Crew Panel</h1>
        <div class="header-subtitle">${crewState.branchName}</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-sm btn-outline" id="btn-logout-crew">
          <i class="fas fa-sign-out-alt"></i> Keluar
        </button>
      </div>
    </div>

    <div id="crew-content">
      <div class="crew-welcome">
        <h2><i class="fas fa-hand-peace"></i> Halo, Tim ${crewState.branchName}!</h2>
        <p>Siap bekerja hari ini? 💪</p>
      </div>

      <div id="crew-tasks-section" class="crew-today"></div>
    </div>
  `;

  // Logout handler
  container.querySelector('#btn-logout-crew').addEventListener('click', () => {
    sessionStorage.removeItem('smarthub_session');
    window.appState.currentUser = null;
    window.location.hash = '#login';
  });

  // Load today's tasks
  loadCrewTasks();
}

/**
 * Load tasks for this crew's branch
 */
async function loadCrewTasks() {
  showLoading();
  try {
    const data = await apiGet(`/api/tasks?branch_id=${crewState.branchId}`);
    crewState.tasks = data.tasks || data || [];
  } catch (err) {
    console.warn('Gagal memuat tugas:', err);
    // Try without filter
    try {
      const data = await apiGet('https://smarthub-frontend.halugoods-indonesia.workers.dev/api/tasks');
      const allTasks = data.tasks || data || [];
      crewState.tasks = allTasks.filter(t => (t.branch_id || t.cabang_id) == crewState.branchId);
    } catch {
      crewState.tasks = [];
    }
  }

  renderTodayTasks();
  hideLoading();
}

/**
 * Render today's tasks list
 */
function renderTodayTasks() {
  const section = document.getElementById('crew-tasks-section');
  if (!section) return;

  if (crewState.tasks.length === 0) {
    section.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-smile-wink"></i>
        <p>Tidak ada tugas untuk hari ini. Santai dulu! 🎉</p>
      </div>
    `;
    return;
  }

  let html = `
    <h3><i class="fas fa-list"></i> Tugas Hari Ini</h3>
    <div class="task-grid">
  `;

  crewState.tasks.forEach(task => {
    const status = (task.status || 'draft').toLowerCase();
    const dateDisplay = formatDate(task.date || task.tanggal || task.created_at);
    const taskId = task.id;

    html += `
      <div class="task-card" data-id="${taskId}" style="cursor:pointer;">
        <div class="task-card-header">
          <span class="task-branch">
            <i class="fas fa-calendar-day"></i> ${dateDisplay}
          </span>
          ${createBadgeHTML(status)}
        </div>
        <div style="font-size:0.85rem;color:var(--text-light);">
          ${task.caption ? task.caption.substring(0, 60) + (task.caption.length > 60 ? '...' : '') : 'Tidak ada caption'}
        </div>
        <div class="card-footer" style="margin-top:8px;">
          <button class="btn btn-sm btn-primary task-detail-btn" data-id="${taskId}" style="flex:1;">
            <i class="fas fa-eye"></i> Lihat Detail
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  section.innerHTML = html;

  // Attach click handlers
  section.querySelectorAll('.task-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.id;
      const task = crewState.tasks.find(t => t.id == taskId);
      if (task) {
        showTaskDetail(task);
      }
    });
  });

  // Also make the whole card clickable
  section.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      const taskId = card.dataset.id;
      const task = crewState.tasks.find(t => t.id == taskId);
      if (task) {
        showTaskDetail(task);
      }
    });
  });
}

/**
 * Show detailed view of a task
 */
function showTaskDetail(task) {
  crewState.selectedTask = task;
  const content = document.getElementById('crew-content');

  const dateDisplay = formatDate(task.date || task.tanggal || task.created_at);
  const gdrive = task.gdrive_link || task.link_gdrive || '';
  const musicLinks = task.music_links || task.audio_links || [];
  const caption = task.caption || '';
  const deskripsi = task.deskripsi || task.description || '';
  const hashtag = task.hashtag || task.tags || '';
  const status = (task.status || 'draft').toLowerCase();
  const isSelesai = status === 'done' || status === 'selesai';

  content.innerHTML = `
    <button class="task-detail-back" id="btn-back-tasks">
      <i class="fas fa-arrow-left"></i> Kembali ke daftar tugas
    </button>

    <div class="task-detail">
      <div class="card" style="margin-bottom:16px;">
        <div class="flex items-center justify-between">
          <div>
            <div class="card-title"><i class="fas fa-calendar-alt"></i> ${dateDisplay}</div>
            <div class="card-subtitle">${crewState.branchName}</div>
          </div>
          ${createBadgeHTML(status)}
        </div>
      </div>

      <!-- Google Drive Link -->
      <div class="detail-section">
        <h4><i class="fab fa-google-drive"></i> Google Drive</h4>
        ${gdrive ? `
          <a href="${gdrive}" target="_blank" class="detail-link">
            <i class="fas fa-external-link-alt"></i>
            Buka Link Google Drive
          </a>
        ` : `
          <p class="text-muted">Tidak ada link Google Drive</p>
        `}
      </div>

      <!-- Audio Links -->
      ${musicLinks.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-music"></i> Audio / Musik</h4>
          ${musicLinks.map((link, i) => `
            <a href="${link}" target="_blank" class="detail-link" style="margin-bottom:6px;">
              <i class="fas fa-headphones"></i>
              Audio ${i + 1}
            </a>
          `).join('')}
        </div>
      ` : ''}

      <!-- Caption -->
      <div class="detail-section">
        <h4>Caption</h4>
        <div class="detail-content">
          ${escapeHtml(caption) || '<span class="text-muted">Tidak ada caption</span>'}
          ${caption ? `<button class="copy-btn" id="copy-caption"><i class="fas fa-copy"></i> Salin</button>` : ''}
        </div>
      </div>

      <!-- Deskripsi -->
      <div class="detail-section">
        <h4>Deskripsi</h4>
        <div class="detail-content">
          ${escapeHtml(deskripsi) || '<span class="text-muted">Tidak ada deskripsi</span>'}
          ${deskripsi ? `<button class="copy-btn" id="copy-deskripsi"><i class="fas fa-copy"></i> Salin</button>` : ''}
        </div>
      </div>

      <!-- Hashtag -->
      <div class="detail-section">
        <h4>Hashtag</h4>
        <div class="detail-content">
          ${escapeHtml(hashtag) || '<span class="text-muted">Tidak ada hashtag</span>'}
          ${hashtag ? `<button class="copy-btn" id="copy-hashtag"><i class="fas fa-copy"></i> Salin</button>` : ''}
        </div>
      </div>

      <!-- Submit Form (only if not already done) -->
      ${!isSelesai ? `
        <div class="submit-form" id="submit-section">
          <h4><i class="fas fa-upload"></i> Submit Hasil Tugas</h4>

          <div class="form-group">
            <label><i class="fab fa-tiktok"></i> Link TikTok</label>
            <input type="url" id="submit-tiktok" placeholder="https://tiktok.com/..." value="${task.submitted_links?.tiktok || ''}">
          </div>

          <div class="form-group">
            <label><i class="fab fa-instagram"></i> Link Instagram</label>
            <input type="url" id="submit-ig" placeholder="https://instagram.com/..." value="${task.submitted_links?.instagram || task.submitted_links?.ig || ''}">
          </div>

          <div class="form-group">
            <label><i class="fab fa-facebook"></i> Link Facebook (opsional)</label>
            <input type="url" id="submit-fb" placeholder="https://facebook.com/..." value="${task.submitted_links?.facebook || task.submitted_links?.fb || ''}">
          </div>

          <button class="btn btn-primary btn-block" id="btn-submit-task">
            <i class="fas fa-check-circle"></i> Selesaikan Tugas
          </button>
        </div>
      ` : `
        <div class="card" style="border-color: var(--done);">
          <div class="flex items-center" style="gap:8px;color:var(--done);">
            <i class="fas fa-check-circle" style="font-size:1.2rem;"></i>
            <strong>Tugas Selesai! ✅</strong>
          </div>
          ${renderSubmittedLinks(task)}
        </div>
      `}
    </div>
  `;

  // Back button
  document.getElementById('btn-back-tasks').addEventListener('click', () => {
    crewState.selectedTask = null;
    renderCrew(document.getElementById('app'));
  });

  // Copy handlers
  const copyCaption = document.getElementById('copy-caption');
  if (copyCaption) {
    copyCaption.addEventListener('click', () => copyText(caption, copyCaption));
  }
  const copyDeskripsi = document.getElementById('copy-deskripsi');
  if (copyDeskripsi) {
    copyDeskripsi.addEventListener('click', () => copyText(deskripsi, copyDeskripsi));
  }
  const copyHashtag = document.getElementById('copy-hashtag');
  if (copyHashtag) {
    copyHashtag.addEventListener('click', () => copyText(hashtag, copyHashtag));
  }

  // Submit handler
  const submitBtn = document.getElementById('btn-submit-task');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => submitTask(task));
  }
}

/**
 * Submit completed task
 */
async function submitTask(task) {
  const tiktok = document.getElementById('submit-tiktok').value.trim();
  const ig = document.getElementById('submit-ig').value.trim();
  const fb = document.getElementById('submit-fb').value.trim();

  if (!tiktok || !ig) {
    showToast('Link TikTok dan Instagram wajib diisi', 'error');
    return;
  }

  showLoading();
  try {
    const payload = {
      status: 'waiting',
      submitted_links: {
        tiktok: tiktok,
        instagram: ig,
        facebook: fb || ''
      }
    };

    await apiPut(`/api/tasks/${task.id}`, payload);

    showToast('Tugas berhasil dikirim! Menunggu verifikasi admin.', 'success');

    // Refresh and go back
    crewState.selectedTask = null;
    await loadCrewTasks();
    // Re-render crew page keeping the welcome message
    const content = document.getElementById('crew-content');
    content.innerHTML = `
      <div class="crew-welcome">
        <h2><i class="fas fa-hand-peace"></i> Halo, Tim ${crewState.branchName}!</h2>
        <p>Siap bekerja hari ini? 💪</p>
      </div>
      <div id="crew-tasks-section" class="crew-today"></div>
    `;
    renderTodayTasks();

  } catch (err) {
    console.warn('Submit error:', err);
    showToast('Gagal mengirim tugas. Coba lagi.', 'error');
  }
  hideLoading();
}

/**
 * Render submitted links for completed tasks
 */
function renderSubmittedLinks(task) {
  const links = task.submitted_links || task.links || {};
  const hasLinks = links.tiktok || links.instagram || links.ig || links.facebook || links.fb;

  if (!hasLinks) return '<p class="text-muted mt-8">Link tugas telah disubmit</p>';

  let html = '<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;">';
  if (links.tiktok) {
    html += `<a href="${links.tiktok}" target="_blank" class="detail-link"><i class="fab fa-tiktok"></i> Lihat TikTok</a>`;
  }
  if (links.instagram || links.ig) {
    html += `<a href="${links.instagram || links.ig}" target="_blank" class="detail-link"><i class="fab fa-instagram"></i> Lihat Instagram</a>`;
  }
  if (links.facebook || links.fb) {
    html += `<a href="${links.facebook || links.fb}" target="_blank" class="detail-link"><i class="fab fa-facebook"></i> Lihat Facebook</a>`;
  }
  html += '</div>';
  return html;
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function getSession() {
  try {
    const data = sessionStorage.getItem('smarthub_session');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copyText(text, btnElement) {
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
