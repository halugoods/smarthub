/* ============================================================
   Smart Hub - Shared UI Components
   ============================================================ */

/**
 * Create a reusable card element
 * @param {string} title - Card title
 * @param {string} content - HTML content for card body
 * @param {object} [options] - Optional configuration
 * @param {string} [options.subtitle] - Subtitle text
 * @param {string} [options.className] - Additional CSS classes
 * @param {function} [options.onClick] - Click handler
 * @returns {HTMLElement}
 */
export function createCard(title, content, options = {}) {
  const card = document.createElement('div');
  card.className = `card ${options.className || ''}`;

  const header = options.subtitle ? `
    <div class="card-header">
      <div>
        <div class="card-title">${title}</div>
        <div class="card-subtitle">${options.subtitle}</div>
      </div>
    </div>
  ` : `
    <div class="card-header">
      <div class="card-title">${title}</div>
    </div>
  `;

  card.innerHTML = header + `<div class="card-body">${content}</div>`;

  if (options.onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', options.onClick);
  }

  return card;
}

/**
 * Create a status badge element
 * @param {string} status - Status key (draft, published, waiting, done, selesai)
 * @returns {HTMLElement}
 */
export function createBadge(status) {
  const span = document.createElement('span');
  const statusMap = {
    draft: { label: 'Draft', class: 'badge-draft' },
    published: { label: 'Published', class: 'badge-published' },
    waiting: { label: 'Waiting', class: 'badge-waiting' },
    done: { label: 'Selesai', class: 'badge-selesai' },
    selesai: { label: 'Selesai', class: 'badge-selesai' }
  };

  const s = (status || 'draft').toLowerCase();
  const config = statusMap[s] || { label: status, class: 'badge-draft' };

  span.className = `badge ${config.class}`;
  span.textContent = config.label;
  return span;
}

/**
 * Show loading overlay
 */
export function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * Create a header element
 * @param {string} title - Header title
 * @param {string} [subtitle] - Optional subtitle
 * @param {Array} [actions] - Array of action button configs [{label, icon, onClick, className}]
 * @returns {HTMLElement}
 */
export function createHeader(title, subtitle, actions = []) {
  const header = document.createElement('div');
  header.className = 'app-header';

  let leftHtml = `<div><h1>${title}</h1>`;
  if (subtitle) {
    leftHtml += `<div class="header-subtitle">${subtitle}</div>`;
  }
  leftHtml += `</div>`;

  let rightHtml = '';
  if (actions.length > 0) {
    rightHtml = '<div class="header-actions">';
    actions.forEach(action => {
      const iconHtml = action.icon ? `<i class="fas ${action.icon}"></i>` : '';
      rightHtml += `<button class="btn btn-sm ${action.className || 'btn-outline'}">${iconHtml} ${action.label}</button>`;
    });
    rightHtml += '</div>';
  }

  header.innerHTML = leftHtml + rightHtml;

  // Attach click handlers
  actions.forEach((action, index) => {
    const btn = header.querySelectorAll('.header-actions .btn')[index];
    if (btn && action.onClick) {
      btn.addEventListener('click', action.onClick);
    }
  });

  return header;
}

/**
 * Create a loading placeholder (skeleton)
 * @param {number} lines - Number of skeleton lines
 * @returns {string} HTML string
 */
export function skeletonLoader(lines = 3) {
  let html = '<div class="card" style="padding: 16px;">';
  for (let i = 0; i < lines; i++) {
    const width = 60 + Math.random() * 35;
    html += `<div style="height: 14px; background: var(--border); border-radius: 4px; margin-bottom: 10px; width: ${width}%;"></div>`;
  }
  html += '</div>';
  return html;
}
