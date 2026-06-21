// ============================================================
// LIGHTHOUSE CHURCH – ADMIN DASHBOARD JAVASCRIPT
// ============================================================

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://light-house-backend.onrender.com/api';

let TOKEN = localStorage.getItem('church_token');
let ADMIN = JSON.parse(localStorage.getItem('church_admin') || '{}');
let editingId = null;
let editingType = null;
let pastorsList = [];
let allMembers = [];
let allGroups = [];
let currentGroupId = null;
let isSaving = false;  

if (!TOKEN) { window.location.href = 'login.html'; }

document.getElementById('adminName').textContent = ADMIN.name || 'Admin';
document.getElementById('adminRole').textContent = ADMIN.role || 'admin';

function logout() {
  localStorage.removeItem('church_token');
  localStorage.removeItem('church_admin');
  window.location.href = 'login.html';
}

// ============================================================
// API HELPER
// ============================================================
async function api(method, endpoint, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${endpoint}`, opts);
    if (res.status === 401 || res.status === 403) { logout(); return null; }
    const text = await res.text();
    if (!text) return { message: 'ok' };
    try { return JSON.parse(text); } catch { return { error: 'Invalid server response' }; }
  } catch (err) {
    console.error('API error:', err);
    return { error: 'Cannot connect to server.' };
  }
}

// Upload image to Cloudinary via backend
async function uploadImage(fileInput, folder) {
  const file = fileInput.files[0];
  if (!file) return null;
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder || 'lighthouse/images');
  try {
    const res = await fetch(`${API}/upload/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data; // { url, public_id }
  } catch (err) {
    showToast('❌ Image upload failed: ' + err.message, 'error');
    return null;
  }
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ============================================================
// CONFIRM DIALOG (replaces window.confirm)
// ============================================================
function showConfirm({ icon = '⚠️', title = 'Are you sure?', message = '', confirmText = 'Delete', confirmClass = 'confirm-btn-danger', onConfirm }) {
  const existing = document.getElementById('confirmOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.id = 'confirmOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,26,53,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:36px 40px;max-width:400px;width:100%;box-shadow:0 24px 64px rgba(8,26,53,0.28);text-align:center;animation:slideUpCard 0.2s ease;">
      <div style="font-size:2.6rem;margin-bottom:14px;">${icon}</div>
      <div style="font-family:'Cinzel',serif;font-size:1.05rem;color:#081a35;margin-bottom:10px;letter-spacing:0.5px;">${title}</div>
      <div style="font-size:0.88rem;color:#555577;line-height:1.6;margin-bottom:28px;">${message}</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button onclick="document.getElementById('confirmOverlay').remove()" style="padding:11px 28px;border-radius:50px;border:2px solid #e0e4f0;background:none;color:#555577;font-size:0.88rem;cursor:pointer;font-family:'Lato',sans-serif;">Cancel</button>
        <button id="confirmOkBtn" style="padding:11px 28px;border-radius:50px;border:none;background:#e74c3c;color:#fff;font-family:'Cinzel',serif;font-size:0.8rem;letter-spacing:1px;cursor:pointer;box-shadow:0 4px 14px rgba(231,76,60,0.35);">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('confirmOkBtn').addEventListener('click', () => { overlay.remove(); onConfirm(); });
}

function clearModalImage(urlFieldId, previewId) {
  showConfirm({
    icon: '🖼️', title: 'Remove Image',
    message: 'Remove the current image? You can upload a new one.',
    confirmText: 'Remove', confirmClass: 'confirm-btn-danger',
    onConfirm: () => {
      const urlField = document.getElementById(urlFieldId);
      if (urlField) urlField.value = '';
      // Replace the replace/remove button area with a plain file input
      const wrap = urlField?.closest('.form-group');
      if (wrap) {
        const label = wrap.querySelector('label');
        wrap.innerHTML = '';
        if (label) wrap.appendChild(label);
        const fi = document.createElement('input');
        fi.type = 'file'; fi.id = 'f_image_file'; fi.accept = 'image/*';
        wrap.appendChild(fi);
        const hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.id = urlFieldId; hidden.value = '';
        wrap.appendChild(hidden);
      }
    }
  });
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function badge(label, type = 'blue') {
  return `<span class="badge badge-${type}">${label}</span>`;
}

function actionBtns(id, type) {
  return `<div class="table-actions">
    <button class="btn-edit btn-sm" onclick="editItem('${type}','${id}')">✏️ Edit</button>
    <button class="btn-danger btn-sm" onclick="deleteItem('${type}','${id}')">🗑</button>
  </div>`;
}

function tableLoading(cols) {
  return `<tr><td colspan="${cols}" class="table-loading"><div class="spinner"></div><br>Loading...</td></tr>`;
}
function tableEmpty(cols, msg) {
  return `<tr><td colspan="${cols}" class="table-loading" style="color:#aaa">${msg}</td></tr>`;
}

// ============================================================
// NAVIGATION
// ============================================================
const panelTitles = {
  home: 'Dashboard Home',
  announcements: 'Announcements', events: 'Events', sermons: 'Sermons',
  gallery: 'Gallery', pastors: 'Pastors & Leadership', ministries: 'Ministries',
  servicetimes: 'Service Times', settings: 'Church Settings',
  members: 'All Members', groups: 'Groups & Roles',
  prayer: 'Prayer Requests', messages: 'Contact Messages', admins: 'Admin Users'
};

document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const panel = item.dataset.panel;
    if (!panel) return;
    loadPanel(panel);
    document.getElementById('sidebar').classList.remove('open');
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

function loadPanel(panel) {
  // Update nav active state
  document.querySelectorAll('.nav-item[data-panel]').forEach(n => {
    n.classList.toggle('active', n.dataset.panel === panel);
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panelEl = document.getElementById(`panel-${panel}`);
  if (panelEl) panelEl.classList.add('active');
  document.getElementById('panelTitle').textContent = panelTitles[panel] || panel;

  switch (panel) {
    case 'home': loadHome(); break;
    case 'announcements': loadAnnouncements(); break;
    case 'events': loadEvents(); break;
    case 'sermons': loadSermons(); break;
    case 'gallery': loadGallery(); break;
    case 'pastors': loadPastors(); break;
    case 'ministries': loadMinistries(); break;
    case 'servicetimes': loadServiceTimes(); break;
    case 'settings': loadSettings(); break;
    case 'members': loadMembers(); break;
    case 'groups': loadGroups(); break;
    case 'prayer': loadPrayer(); break;
    case 'messages': loadMessages(); break;
    case 'admins': loadAdmins(); break;
  }
}

loadPanel('home');
loadPastorsList();
loadGroupsList();

async function loadPastorsList() {
  const data = await api('GET', '/pastors');
  pastorsList = Array.isArray(data) ? data : [];
}

async function loadGroupsList() {
  const data = await api('GET', '/groups');
  allGroups = Array.isArray(data) ? data : [];
}

async function loadMonthlyMemberStats() {
  const el = document.getElementById('homeMonthlyStats');
  if (!el) return;
  const data = await api('GET', '/members/monthly-stats');
  if (!data || data.error) return;

  const month = new Date().toLocaleDateString('en-GH', { month: 'long' });
  el.innerHTML = `
    <div class="monthly-stats-label">Members · ${month}</div>
    <div class="monthly-stats-grid">
      <div class="monthly-stat">
        <div class="monthly-stat-num">${data.joined_this_month || 0}</div>
        <div class="monthly-stat-desc">🆕 Joined</div>
      </div>
      <div class="monthly-stat">
        <div class="monthly-stat-num">${data.baptized_this_month || 0}</div>
        <div class="monthly-stat-desc">✝️ Baptized</div>
      </div>
      <div class="monthly-stat">
        <div class="monthly-stat-num">${data.promoted_this_month || 0}</div>
        <div class="monthly-stat-desc">⬆️ Promoted</div>
      </div>
      <div class="monthly-stat">
        <div class="monthly-stat-num">${data.inactive_this_month || 0}</div>
        <div class="monthly-stat-desc">💤 Inactive</div>
      </div>
    </div>
  `;
}


// ============================================================
// HOME DASHBOARD
// ============================================================
async function loadHome() {
  // Date
  document.getElementById('homeDate').textContent = new Date().toLocaleDateString('en-GH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Load all data in parallel
  const [members, events, prayer, messages, sermons, groups] = await Promise.all([
    api('GET', '/members'),
    api('GET', '/events/all?archived=false'),
    api('GET', '/prayer'),
    api('GET', '/contact'),
    api('GET', '/sermons/all'),
    api('GET', '/groups')
  ]);

  const memberList = Array.isArray(members) ? members : [];
  const eventList = Array.isArray(events) ? events : [];
  const prayerList = Array.isArray(prayer) ? prayer : [];
  const messageList = Array.isArray(messages) ? messages : [];
  const sermonList = Array.isArray(sermons) ? sermons : [];
  const groupList = Array.isArray(groups) ? groups : [];

  // QUICK STATS
  document.getElementById('statMembers').textContent = memberList.length;
  document.getElementById('statEvents').textContent = eventList.length;
  document.getElementById('statPrayer').textContent = prayerList.filter(p => !p.is_answered).length;
  document.getElementById('statMessages').textContent = messageList.filter(m => !m.is_read).length;
  document.getElementById('statSermons').textContent = sermonList.length;
  document.getElementById('statGroups').textContent = groupList.length;

  // BIRTHDAYS THIS WEEK
  renderHomeBirthdays(memberList);

  // RECENT PRAYER
  renderHomeRecentPrayer(prayerList);

  // UPCOMING EVENTS
  renderHomeUpcomingEvents(eventList);

  // RECENT MESSAGES
  renderHomeRecentMessages(messageList);

  // MEMBER BREAKDOWN
  renderHomeMemberBreakdown(memberList);

  // SERMON STATS
  renderHomeSermonStats(sermonList);

  // MONTHLY MEMBER STATS
  loadMonthlyMemberStats();
}

function renderHomeBirthdays(members) {
  const el = document.getElementById('homeBirthdays');
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  // Get birthdays within next 7 days
  const upcoming = members.filter(m => {
    if (!m.date_of_birth) return false;
    const dob = new Date(m.date_of_birth);
    const dobMonth = dob.getMonth();
    const dobDate = dob.getDate();

    // Check next 7 days (handle month wrap)
    for (let i = 0; i <= 7; i++) {
      const check = new Date(today);
      check.setDate(todayDate + i);
      if (dobMonth === check.getMonth() && dobDate === check.getDate()) return true;
    }
    return false;
  }).map(m => {
    const dob = new Date(m.date_of_birth);
    const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    const diffDays = Math.round((thisYear - today) / (1000 * 60 * 60 * 24));
    const age = today.getFullYear() - dob.getFullYear();
    return { ...m, diffDays, age };
  }).sort((a, b) => a.diffDays - b.diffDays);

  if (!upcoming.length) {
    el.innerHTML = '<div class="home-empty">No birthdays in the next 7 days 🎉</div>';
    return;
  }

  el.innerHTML = upcoming.map(m => `
    <div class="home-list-item">
      <div class="home-list-avatar">
        ${m.image_url
          ? `<img src="${m.image_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold)" />`
          : `<div class="home-avatar-placeholder">🎂</div>`}
      </div>
      <div class="home-list-info">
        <div class="home-list-name">${m.full_name}</div>
        <div class="home-list-sub">${m.primary_group || ''} · Turns ${m.age}</div>
      </div>
      <div class="home-list-meta">
        ${m.diffDays === 0
          ? `<span class="badge badge-gold">Today! 🎉</span>`
          : m.diffDays === 1
            ? `<span class="badge badge-blue">Tomorrow</span>`
            : `<span class="badge badge-success">In ${m.diffDays} days</span>`}
      </div>
    </div>
  `).join('');
}

function renderHomeRecentPrayer(prayerList) {
  const el = document.getElementById('homeRecentPrayer');
  const recent = prayerList.filter(p => !p.is_answered).slice(0, 5);
  if (!recent.length) {
    el.innerHTML = '<div class="home-empty">No pending prayer requests</div>';
    return;
  }
  el.innerHTML = recent.map(p => `
    <div class="home-list-item">
      <div class="home-list-avatar"><div class="home-avatar-placeholder">🙏</div></div>
      <div class="home-list-info">
        <div class="home-list-name">${esc(p.requester_name)}</div>
        <div class="home-list-sub">${esc(p.request_text.substring(0, 60))}${p.request_text.length > 60 ? '...' : ''}</div>
      </div>
      <div class="home-list-meta">
        ${p.is_private ? `<span class="badge badge-warning">Private</span>` : `<span class="badge badge-blue">Public</span>`}
      </div>
    </div>
  `).join('');
}

function renderHomeUpcomingEvents(eventList) {
  const el = document.getElementById('homeUpcomingEvents');
  const upcoming = eventList.slice(0, 5);
  if (!upcoming.length) {
    el.innerHTML = '<div class="home-empty">No upcoming events</div>';
    return;
  }
  el.innerHTML = upcoming.map(e => `
    <div class="home-list-item">
      <div class="home-list-avatar"><div class="home-avatar-placeholder">📅</div></div>
      <div class="home-list-info">
        <div class="home-list-name">${e.title}</div>
        <div class="home-list-sub">${fmt(e.event_date)} ${e.location ? '· ' + e.location : ''}</div>
      </div>
      <div class="home-list-meta">
        ${e.is_published ? badge('Live', 'success') : badge('Draft', 'warning')}
      </div>
    </div>
  `).join('');
}

function renderHomeRecentMessages(messageList) {
  const el = document.getElementById('homeRecentMessages');
  const recent = messageList.slice(0, 5);
  if (!recent.length) {
    el.innerHTML = '<div class="home-empty">No messages yet</div>';
    return;
  }
  el.innerHTML = recent.map(m => `
    <div class="home-list-item ${!m.is_read ? 'home-list-unread' : ''}">
      <div class="home-list-avatar"><div class="home-avatar-placeholder">✉️</div></div>
      <div class="home-list-info">
        <div class="home-list-name">${m.name} ${!m.is_read ? '🔵' : ''}</div>
        <div class="home-list-sub">${m.subject || 'No subject'}</div>
      </div>
      <div class="home-list-meta">
        <span style="font-size:0.75rem;color:var(--text-light)">${fmt(m.created_at)}</span>
      </div>
    </div>
  `).join('');
}

function renderHomeMemberBreakdown(members) {
  const el = document.getElementById('homeMemberBreakdown');
  const total = members.length || 1;
  const groups = [
    { label: 'Men', color: '#143d6f', icon: '🛡️' },
    { label: 'Women', color: '#b89240', icon: '💜' },
    { label: 'Youth', color: '#27ae60', icon: '🔥' },
    { label: 'Children', color: '#e74c3c', icon: '🌟' }
  ];

  const rows = groups.map(g => {
    const count = members.filter(m => m.primary_group === g.label).length;
    const pct = Math.round((count / total) * 100);
    return { ...g, count, pct };
  });

  const active = members.filter(m => m.is_active !== false).length;
  const inactive = members.filter(m => m.is_active === false).length;

  el.innerHTML = `
    <div style="margin-bottom:16px">
      ${rows.map(r => `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:0.85rem;color:var(--text-mid)">${r.icon} ${r.label}</span>
            <span style="font-size:0.85rem;font-weight:700;color:var(--navy-dark)">${r.count} <span style="color:var(--text-light);font-weight:400">(${r.pct}%)</span></span>
          </div>
          <div class="home-bar-track">
            <div class="home-bar-fill" style="width:${r.pct}%;background:${r.color}"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:12px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="flex:1;text-align:center">
        <div style="font-size:1.2rem;font-weight:700;color:var(--success)">${active}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Active</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:1.2rem;font-weight:700;color:var(--error)">${inactive}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Inactive</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:1.2rem;font-weight:700;color:var(--navy-dark)">${total}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Total</div>
      </div>
    </div>
  `;
}

function renderHomeSermonStats(sermonList) {
  const el = document.getElementById('homeSermonStats');
  if (!sermonList.length) {
    el.innerHTML = '<div class="home-empty">No sermons yet</div>';
    return;
  }

  const totalViews = sermonList.reduce((sum, s) => sum + (s.views || 0), 0);
  const topSermons = [...sermonList].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const maxViews = topSermons[0]?.views || 1;

  el.innerHTML = `
    <div style="display:flex;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div style="flex:1;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--navy-dark)">${totalViews}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Total Views</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--navy-dark)">${sermonList.length}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Sermons</div>
      </div>
      <div style="flex:1;text-align:center">
        <div style="font-size:1.4rem;font-weight:700;color:var(--navy-dark)">${sermonList.length ? Math.round(totalViews / sermonList.length) : 0}</div>
        <div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:1px">Avg Views</div>
      </div>
    </div>
    <div style="font-size:0.72rem;color:var(--text-light);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Top Sermons</div>
    ${topSermons.map(s => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:0.82rem;color:var(--text-mid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%">${s.title}</span>
          <span style="font-size:0.82rem;font-weight:700;color:var(--navy-dark)">${s.views || 0}</span>
        </div>
        <div class="home-bar-track">
          <div class="home-bar-fill" style="width:${Math.round(((s.views||0)/maxViews)*100)}%;background:var(--navy-mid)"></div>
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements() {
  const tbody = document.getElementById('announcementsTable');
  tbody.innerHTML = tableLoading(6);
  const data = await api('GET', '/announcements/all');
  if (!data || data.error) { tbody.innerHTML = tableEmpty(6, data?.error || 'Failed to load.'); return; }
  if (!data.length) { tbody.innerHTML = tableEmpty(6, 'No announcements yet. Click + New Announcement to add one.'); return; }
  tbody.innerHTML = data.map(a => `<tr>
    <td><strong>${a.title}</strong></td>
    <td>${badge(a.category, a.category === 'urgent' ? 'error' : a.category === 'prayer' ? 'gold' : 'blue')}</td>
    <td>${a.is_published ? badge('Published', 'success') : badge('Draft', 'warning')}</td>
    <td>${a.is_pinned ? '📌 Yes' : 'No'}</td>
    <td>${fmt(a.published_at)}</td>
    <td>${actionBtns(a.id, 'announcement')}</td>
  </tr>`).join('');
}

// ============================================================
// EVENTS
// ============================================================
async function loadEvents(archived = false) {
  const tbody = document.getElementById('eventsTable');
  tbody.innerHTML = tableLoading(7);
  const data = await api('GET', `/events/all?archived=${archived}`);
  if (!data || data.error) { tbody.innerHTML = tableEmpty(7, data?.error || 'Failed to load.'); return; }
  if (!data.length) { tbody.innerHTML = tableEmpty(7, archived ? 'No archived events.' : 'No upcoming events.'); return; }
  tbody.innerHTML = data.map(e => `<tr>
    <td><strong>${e.title}</strong></td>
    <td>${fmt(e.event_date)}${e.end_date ? ` – ${fmt(e.end_date)}` : ''}</td>
    <td>${badge(e.category || 'general', 'blue')}</td>
    <td>${e.location || '—'}</td>
    <td>${e.is_published ? badge('Published', 'success') : badge('Draft', 'warning')}</td>
    <td><button class="btn-form btn-sm" onclick="openFormBuilder('${e.id}','${esc(e.title)}')">📋 Form</button></td>
    <td>${actionBtns(e.id, 'event')}</td>
  </tr>`).join('');
}

function switchEventTab(archived) {
  document.getElementById('tabUpcoming').classList.toggle('active', !archived);
  document.getElementById('tabArchived').classList.toggle('active', archived);
  loadEvents(archived);
}

// ============================================================
// EVENT FORM BUILDER
// ============================================================
let currentFormEventId = null;
let currentFormId = null;
let formFields = [];

async function openFormBuilder(eventId, eventTitle) {
  currentFormEventId = eventId;
  currentFormId = null;
  formFields = [];
  const overlay = document.getElementById('formBuilderOverlay');
  const title = document.getElementById('formBuilderTitle');
  const body = document.getElementById('formBuilderBody');
  title.textContent = `📋 Registration Form — ${eventTitle}`;
  body.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  overlay.classList.add('open');

  const existing = await api('GET', `/eventforms/event/${eventId}/admin`);
  if (existing && !existing.error) {
    currentFormId = existing.id;
    formFields = existing.fields || [];
    renderFormBuilder(existing);
  } else {
    renderFormBuilder(null);
  }
}

function closeFormBuilder() {
  document.getElementById('formBuilderOverlay').classList.remove('open');
  currentFormEventId = null; currentFormId = null; formFields = [];
}

function closeFieldEditor() {
  document.getElementById('fieldEditorOverlay').classList.remove('open');
}

function renderFormBuilder(existing) {
  const body = document.getElementById('formBuilderBody');
  const isEdit = !!existing;

  body.innerHTML = `
    <div class="fb-section">
      <div class="fb-section-label">Form Settings</div>
      <div class="form-group"><label>Form Title</label>
        <input type="text" id="fb_title" value="${esc(existing?.title)}" placeholder="e.g. Youth Camp 2025 Registration" /></div>
      <div class="form-group"><label>Description</label>
        <textarea id="fb_description" rows="2" placeholder="Brief description shown at top of form">${esc(existing?.description)}</textarea></div>
      <div class="form-check">
        <input type="checkbox" id="fb_is_active" ${!existing || existing.is_active ? 'checked' : ''} />
        <label for="fb_is_active">Form is Active (visible to public)</label>
      </div>
      <div class="form-check">
        <input type="checkbox" id="fb_require_email" ${existing?.require_email ? 'checked' : ''} />
        <label for="fb_require_email">Require Email Address from registrants</label>
      </div>
    </div>

    <div class="fb-section">
      <div class="fb-section-label">Payment Settings</div>
      <div class="form-check" style="margin-bottom:16px">
        <input type="checkbox" id="fb_show_payment" ${existing?.show_payment_info ? 'checked' : ''} onchange="togglePaymentFields()" />
        <label for="fb_show_payment">Enable Payment for this Form</label>
      </div>
      <div id="fb_payment_fields" style="display:${existing?.show_payment_info ? 'block' : 'none'}">
        <div class="form-row">
          <div class="form-group"><label>Mobile Money Provider</label>
            <select id="fb_momo_provider">
              <option value="MTN MoMo" ${(existing?.momo_provider||'MTN MoMo')==='MTN MoMo'?'selected':''}>MTN Mobile Money</option>
              <option value="Telecel Cash" ${existing?.momo_provider==='Telecel Cash'?'selected':''}>Telecel Cash (Vodafone)</option>
              <option value="AirtelTigo Money" ${existing?.momo_provider==='AirtelTigo Money'?'selected':''}>AirtelTigo Money</option>
              <option value="Bank Transfer" ${existing?.momo_provider==='Bank Transfer'?'selected':''}>Bank Transfer</option>
            </select></div>
          <div class="form-group"><label>Recipient Number / Account</label>
            <input type="tel" id="fb_mtn_number" value="${esc(existing?.mtn_number)}" placeholder="e.g. 0551234567" /></div>
        </div>
        <div class="form-group"><label>Amount (GHS)</label>
          <input type="number" id="fb_payment_amount" value="${existing?.payment_amount || ''}" placeholder="e.g. 50.00" step="0.01" /></div>
        <div class="form-group"><label>Payment Instructions</label>
          <textarea id="fb_payment_instructions" rows="2" placeholder="Any extra instructions for payment...">${esc(existing?.payment_instructions)}</textarea></div>
      </div>
    </div>

    <div class="fb-section">
      <div class="fb-section-label" style="display:flex;align-items:center;justify-content:space-between">
        <span>Form Fields</span>
        <button class="btn-edit btn-sm" onclick="addField()">+ Add Field</button>
      </div>
      <div class="fb-info">Core fields (Name, Phone, Email) are always included automatically.</div>
      <div id="fb_fields_list"></div>
    </div>

    <div style="display:flex;gap:12px;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--border);flex-wrap:wrap">
      <div style="display:flex;gap:10px">
        ${isEdit ? `
          <button class="btn-danger" onclick="deleteForm()">🗑 Delete Form</button>
          <button class="btn-edit" onclick="openRegistrations('${existing.id}','${esc(document.getElementById('formBuilderTitle').textContent)}')">👥 View Registrations</button>
        ` : ''}
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn-danger" onclick="closeFormBuilder()">Cancel</button>
        <button class="btn-save" onclick="saveForm()">${isEdit ? '💾 Update Form' : '✅ Create Form'}</button>
      </div>
    </div>
  `;
  renderFieldsList();
}

function togglePaymentFields() {
  const show = document.getElementById('fb_show_payment').checked;
  document.getElementById('fb_payment_fields').style.display = show ? 'block' : 'none';
}

function renderFieldsList() {
  const list = document.getElementById('fb_fields_list');
  if (!formFields.length) {
    list.innerHTML = '<div class="fb-empty">No custom fields yet. Click + Add Field to add one.</div>';
    return;
  }
  list.innerHTML = formFields.map((f, i) => `
    <div class="fb-field-row" id="fbrow_${i}">
      <div class="fb-field-drag">⠿</div>
      <div class="fb-field-info">
        <div class="fb-field-label">${f.field_label || '(Untitled)'} ${f.is_required ? '<span class="badge badge-error" style="font-size:0.6rem">Required</span>' : ''}</div>
        <div class="fb-field-type">${fieldTypeLabel(f.field_type)}</div>
      </div>
      <div class="fb-field-actions">
        <button class="btn-edit btn-sm" onclick="editField(${i})">✏️</button>
        <button class="btn-danger btn-sm" onclick="removeField(${i})">🗑</button>
        ${i > 0 ? `<button class="btn-edit btn-sm" onclick="moveField(${i},-1)">↑</button>` : ''}
        ${i < formFields.length-1 ? `<button class="btn-edit btn-sm" onclick="moveField(${i},1)">↓</button>` : ''}
      </div>
    </div>
  `).join('');
}

function fieldTypeLabel(type) {
  const map = { text:'Text', email:'Email', phone:'Phone', number:'Number', textarea:'Paragraph', select:'Dropdown', checkbox:'Checkboxes' };
  return map[type] || type;
}

function addField() {
  openFieldEditor(null, null);
}

function editField(index) {
  openFieldEditor(formFields[index], index);
}

function removeField(index) {
  formFields.splice(index, 1);
  renderFieldsList();
}

function moveField(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= formFields.length) return;
  [formFields[index], formFields[newIndex]] = [formFields[newIndex], formFields[index]];
  renderFieldsList();
}

function openFieldEditor(field, index) {
  const isEdit = index !== null && index !== 'null';
  
  // Remove any existing field editor overlay
  const existingOverlay = document.getElementById('fieldEditorOverlay');
  if (existingOverlay) existingOverlay.remove();

  // Create overlay dynamically
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'fieldEditorOverlay';
  overlay.style.zIndex = '1100';
  overlay.onclick = (e) => { if (e.target === overlay) closeFieldEditor(); };

  overlay.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Field' : 'Add Field'}</h3>
        <button class="modal-close" onclick="closeFieldEditor()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Field Label *</label>
          <input type="text" id="fe_label" value="${esc(field?.field_label)}" placeholder="e.g. T-Shirt Size" /></div>
        <div class="form-group"><label>Field Type *</label>
          <select id="fe_type" onchange="onFieldTypeChange()">
            <option value="text" ${sel(field?.field_type,'text')}>Text</option>
            <option value="email" ${sel(field?.field_type,'email')}>Email</option>
            <option value="phone" ${sel(field?.field_type,'phone')}>Phone</option>
            <option value="number" ${sel(field?.field_type,'number')}>Number</option>
            <option value="textarea" ${sel(field?.field_type,'textarea')}>Paragraph (Long Text)</option>
            <option value="select" ${sel(field?.field_type,'select')}>Dropdown (Select One)</option>
            <option value="checkbox" ${sel(field?.field_type,'checkbox')}>Checkboxes (Select Multiple)</option>
          </select></div>
        <div class="form-group"><label>Placeholder Text</label>
          <input type="text" id="fe_placeholder" value="${esc(field?.placeholder)}" placeholder="Optional hint text inside the field" /></div>
        <div id="fe_options_wrap" style="display:${field?.field_type === 'select' || field?.field_type === 'checkbox' ? 'block' : 'none'}">
          <div class="form-group"><label>Options (one per line)</label>
            <textarea id="fe_options" rows="4" placeholder="Option 1&#10;Option 2&#10;Option 3">${field?.field_options ? (Array.isArray(field.field_options) ? field.field_options : JSON.parse(field.field_options || '[]')).join('\n') : ''}</textarea></div>
        </div>
        <div class="form-check">
          <input type="checkbox" id="fe_required" ${field?.is_required ? 'checked' : ''} />
          <label for="fe_required">This field is required</label>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">
          <button class="btn-danger" onclick="closeFieldEditor()">Cancel</button>
          <button class="btn-save" onclick="saveField(${isEdit ? index : 'null'})">💾 ${isEdit ? 'Update' : 'Add'} Field</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function closeFieldEditor() {
  const overlay = document.getElementById('fieldEditorOverlay');
  if (overlay) overlay.remove();
}

function onFieldTypeChange() {
  const type = document.getElementById('fe_type').value;
  document.getElementById('fe_options_wrap').style.display = (type === 'select' || type === 'checkbox') ? 'block' : 'none';
}

function saveField(index) {
  const label = document.getElementById('fe_label').value.trim();
  const type = document.getElementById('fe_type').value;
  const placeholder = document.getElementById('fe_placeholder').value.trim();
  const required = document.getElementById('fe_required').checked;
  const optionsRaw = document.getElementById('fe_options')?.value || '';
  const options = (type === 'select' || type === 'checkbox')
    ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean)
    : null;

  if (!label) { showToast('Field label is required', 'error'); return; }
  if ((type === 'select' || type === 'checkbox') && (!options || !options.length)) {
    showToast('Add at least one option for this field type', 'error'); return;
  }

  const fieldObj = { field_label: label, field_type: type, placeholder, is_required: required, field_options: options };

  if (index === null || index === 'null') {
    formFields.push(fieldObj);
  } else {
    formFields[index] = fieldObj;
  }

  closeFieldEditor();
  renderFieldsList();
}

async function saveForm() {
  const title = document.getElementById('fb_title').value.trim();
  const description = document.getElementById('fb_description').value.trim();
  const is_active = document.getElementById('fb_is_active').checked;
  const show_payment_info = document.getElementById('fb_show_payment').checked;
  const require_email = document.getElementById('fb_require_email').checked;
  const mtn_number = document.getElementById('fb_mtn_number')?.value.trim() || null;
  const momo_provider = document.getElementById('fb_momo_provider')?.value || 'MTN MoMo';
  const payment_amount = document.getElementById('fb_payment_amount')?.value || null;
  const payment_instructions = document.getElementById('fb_payment_instructions')?.value.trim() || null;

  if (show_payment_info && !mtn_number) {
    showToast('MTN MoMo number is required when payment is enabled', 'error'); return;
  }

  const payload = { event_id: currentFormEventId, title, description, is_active,
    show_payment_info, mtn_number, momo_provider, payment_amount, payment_instructions,
    require_email, fields: formFields };

  const method = currentFormId ? 'PUT' : 'POST';
  const endpoint = currentFormId ? `/eventforms/${currentFormId}` : '/eventforms';
  const res = await api(method, endpoint, payload);

  if (res && !res.error) {
    showToast(`✅ Form ${currentFormId ? 'updated' : 'created'}!`, 'success');
    currentFormId = res.id;
    formFields = res.fields || [];
    renderFormBuilder(res);
  } else {
    showToast(res?.error || '❌ Failed to save form', 'error');
  }
}

async function deleteForm() {
  showConfirm({
    icon: '📋', title: 'Delete Registration Form',
    message: 'This form and all its registrations will be permanently deleted.',
    confirmText: 'Yes, Delete', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('DELETE', `/eventforms/${currentFormId}`);
      if (res?.message) { showToast('Form deleted', 'info'); closeFormBuilder(); }
      else showToast(res?.error || 'Failed to delete', 'error');
    }
  });
}

// ============================================================
// REGISTRATIONS VIEWER
// ============================================================
async function openRegistrations(formId, formTitle) {
  const overlay = document.getElementById('registrationsOverlay');
  const title = document.getElementById('registrationsTitle');
  const body = document.getElementById('registrationsBody');
  title.textContent = `👥 Registrations`;
  body.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  overlay.classList.add('open');

  const [regs, formData] = await Promise.all([
    api('GET', `/eventforms/${formId}/registrations`),
    api('GET', `/eventforms/${formId}`)
  ]);

  if (!regs || regs.error) { body.innerHTML = '<p style="color:red;padding:20px">Failed to load registrations.</p>'; return; }

  const fields = formData?.fields || [];
  const hasPayment = formData?.show_payment_info;

  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div style="display:flex;gap:12px">
        <div class="stat-card" style="min-width:80px;padding:12px 20px">
          <div class="stat-num">${regs.length}</div>
          <div class="stat-label">Total</div>
        </div>
        ${hasPayment ? `
        <div class="stat-card" style="min-width:80px;padding:12px 20px;border-top-color:var(--success)">
          <div class="stat-num">${regs.filter(r => r.payment_status === 'confirmed').length}</div>
          <div class="stat-label">Paid</div>
        </div>
        <div class="stat-card" style="min-width:80px;padding:12px 20px;border-top-color:var(--warning)">
          <div class="stat-num">${regs.filter(r => r.payment_status === 'pending').length}</div>
          <div class="stat-label">Pending</div>
        </div>` : ''}
      </div>
      ${regs.length ? `<button class="btn-edit" onclick="exportCSV(${JSON.stringify(regs).replace(/"/g,'&quot;')}, ${JSON.stringify(fields).replace(/"/g,'&quot;')})">⬇️ Export CSV</button>` : ''}
    </div>

    ${!regs.length ? '<div style="text-align:center;color:#aaa;padding:40px">No registrations yet.</div>' : `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th>Name</th><th>Email</th><th>Phone</th>
          ${fields.map(f => `<th>${f.field_label}</th>`).join('')}
          ${hasPayment ? '<th>Payment</th>' : ''}
          <th>Date</th><th>Action</th>
        </tr></thead>
        <tbody>
          ${regs.map(r => {
            const responses = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
            return `<tr>
              <td><strong>${r.respondent_name}</strong><br><small style="color:#888">${r.payment_reference}</small></td>
              <td>${r.respondent_email || '—'}</td>
              <td>${r.respondent_phone || '—'}</td>
              ${fields.map(f => `<td>${responses[f.id] || '—'}</td>`).join('')}
              ${hasPayment ? `<td>${r.payment_status === 'confirmed'
                ? badge('Paid ✓', 'success')
                : `${badge('Pending', 'warning')} <button class="btn-edit btn-sm" style="margin-top:4px" onclick="confirmPayment('${r.id}')">Confirm</button>`
              }</td>` : ''}
              <td>${fmt(r.created_at)}</td>
              <td><button class="btn-danger btn-sm" onclick="deleteRegistration('${r.id}','${formId}','${esc(formTitle)}')">🗑</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
  `;
}

function closeRegistrations() {
  document.getElementById('registrationsOverlay').classList.remove('open');
}

async function confirmPayment(regId) {
  const res = await api('PUT', `/eventforms/registrations/${regId}/confirm`);
  if (res && !res.error) {
    showToast('✅ Payment confirmed!', 'success');
    const title = document.getElementById('registrationsTitle').textContent;
    const formId = currentFormId;
    if (formId) openRegistrations(formId, title);
  } else {
    showToast(res?.error || 'Failed to confirm', 'error');
  }
}

async function deleteRegistration(regId, formId, formTitle) {
  showConfirm({
    icon: '👤', title: 'Delete Registration',
    message: 'This registration entry will be permanently removed.',
    confirmText: 'Yes, Delete', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('DELETE', `/eventforms/registrations/${regId}`);
      if (res?.message) { showToast('Deleted', 'info'); openRegistrations(formId, formTitle); }
      else showToast(res?.error || 'Failed', 'error');
    }
  });
}

function exportCSV(regs, fields) {
  const headers = ['Name', 'Email', 'Phone', 'Reference', ...fields.map(f => f.field_label), 'Payment Status', 'Registered At'];
  const rows = regs.map(r => {
    const responses = typeof r.responses === 'string' ? JSON.parse(r.responses) : r.responses;
    return [
      r.respondent_name, r.respondent_email || '', r.respondent_phone || '',
      r.payment_reference,
      ...fields.map(f => responses[f.id] || ''),
      r.payment_status,
      new Date(r.created_at).toLocaleDateString('en-GH')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `registrations_${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ============================================================
// SERMONS
// ============================================================
let allSermons = [];
let currentSermonView = 'series';
let currentSeriesDetailName = null;
let lockedSeriesName = null;

function switchSermonView(view) {
  currentSermonView = view;
  document.getElementById('tabSeriesList').classList.toggle('active', view === 'series');
  document.getElementById('tabAllSermons').classList.toggle('active', view === 'all');
  document.getElementById('sermonSeriesView').style.display = view === 'series' ? '' : 'none';
  document.getElementById('sermonTableView').style.display  = view === 'all'    ? '' : 'none';
  if (view === 'series') loadSermonSeries();
  else renderSermonTable();
}

async function loadSermons() {
  const data = await api('GET', '/sermons/all');
  allSermons = Array.isArray(data) ? data : [];
  populateSermonFilters();
  if (currentSermonView === 'series') loadSermonSeries();
  else renderSermonTable();
}

function populateSermonFilters() {
  const seriesSet = [...new Set(allSermons.map(s => s.series_name).filter(Boolean))];
  const pastorSet = [...new Set(allSermons.map(s => s.pastor_name).filter(Boolean))];
  document.getElementById('sermonSeriesFilter').innerHTML =
    '<option value="">All Series</option>' +
    seriesSet.map(s => `<option value="${s}">${s}</option>`).join('');
  document.getElementById('sermonPastorFilter').innerHTML =
    '<option value="">All Pastors</option>' +
    pastorSet.map(p => `<option value="${p}">${p}</option>`).join('');
}

async function loadSermonSeries() {
  const grid = document.getElementById('sermonSeriesGrid');
  grid.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  const data = await api('GET', '/sermons/series/list');

  const singles = allSermons.filter(s => !s.series_name);
  const seriesList = Array.isArray(data) ? data : [];

  if (!seriesList.length && !singles.length) {
    grid.innerHTML = '<div class="home-empty" style="grid-column:1/-1;padding:60px;text-align:center;color:#aaa">No sermons yet. Click + Add Sermon to begin.</div>';
    return;
  }

  grid.innerHTML = seriesList.map(s => `
    <div class="sermon-series-card" onclick="openSeriesDetail('${esc(s.series_name)}')">
      ${s.cover_url
        ? `<img class="sermon-series-cover" src="${s.cover_url}" alt="${esc(s.series_name)}" />`
        : `<div class="sermon-series-cover-placeholder">🎙️</div>`}
      <div class="sermon-series-body">
        <div class="sermon-series-name">${s.series_name}</div>
        <div class="sermon-series-meta">
          <span>📖 ${s.sermon_count} sermon${s.sermon_count > 1 ? 's' : ''}</span>
          <span>🗓 ${fmt(s.latest_date)}</span>
        </div>
      </div>
    </div>
  `).join('') + (singles.length ? `
    <div class="sermon-series-card sermon-series-singles" onclick="openSeriesDetail('__singles__')">
      <div class="sermon-series-cover-placeholder" style="height:120px;font-size:1.8rem">🎤</div>
      <div class="sermon-series-body">
        <div class="sermon-series-name">Standalone Sermons</div>
        <div class="sermon-series-meta">
          <span>📖 ${singles.length} sermon${singles.length > 1 ? 's' : ''}</span>
          <span>Not part of a series</span>
        </div>
      </div>
    </div>
  ` : '');
}

function openSeriesDetail(seriesName) {
  const overlay = document.getElementById('seriesDetailOverlay');
  const title   = document.getElementById('seriesDetailTitle');
  const body    = document.getElementById('seriesDetailBody');

  const isSingles = seriesName === '__singles__';
  const sermons = isSingles
    ? allSermons.filter(s => !s.series_name)
    : allSermons.filter(s => s.series_name === seriesName);

  currentSeriesDetailName = seriesName;
  title.textContent = isSingles ? '🎤 Standalone Sermons' : `📚 ${seriesName}`;

  body.innerHTML = `
    <div style="margin-bottom:16px;display:flex;justify-content:flex-end">
      <button class="btn-add" onclick="addSermonToSeries()">+ Add Sermon</button>
    </div>
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead><tr><th>Title</th><th>Pastor</th><th>Date</th><th>Media</th><th>Views</th><th>Actions</th></tr></thead>
        <tbody>
          ${sermons.map(s => sermonRow(s, false)).join('')}
        </tbody>
      </table>
    </div>`;
  overlay.classList.add('open');
}

function closeSeriesDetail() {
  document.getElementById('seriesDetailOverlay').classList.remove('open');
}

function addSermonToSeries() {
  lockedSeriesName = (currentSeriesDetailName && currentSeriesDetailName !== '__singles__')
    ? currentSeriesDetailName
    : null;
  openModal('sermon');
}

function onSeriesSelectChange() {
  const sel = document.getElementById('f_series_select').value;
  document.getElementById('f_series_name_new').style.display = sel === '__new__' ? 'block' : 'none';
}

function getSeriesNameValue() {
  if (lockedSeriesName) return lockedSeriesName;
  const sel = gv('f_series_select');
  if (sel === '__new__') return gv('f_series_name_new')?.trim() || null;
  return sel || null;
}

function sermonRow(s, showSeries = true) {
  const mediaIcons = [
    s.audio_url     ? '🎵' : '<span style="color:#ddd">🎵</span>',
    s.video_url     ? '🎬' : '<span style="color:#ddd">🎬</span>',
    s.thumbnail_url ? '🖼️' : '<span style="color:#ddd">🖼️</span>',
  ].join(' ');
  return `<tr>
    <td>
      <strong>${s.title}</strong>
      ${s.scripture_reference ? `<br><small style="color:#b89240">${s.scripture_reference}</small>` : ''}
    </td>
    <td>${s.pastor_name || '—'}</td>
    <td>${fmt(s.sermon_date)}</td>
    ${showSeries ? `<td>${s.series_name ? badge(s.series_name,'blue') : '—'}</td>` : ''}
    <td>
      <span style="font-size:1rem;letter-spacing:2px">${mediaIcons}</span>
      <br><button class="btn-edit btn-sm" style="margin-top:4px" onclick="openSermonMedia('${s.id}','${esc(s.title)}')">🗂 Media</button>
    </td>
    <td>${s.views || 0}</td>
    <td>${actionBtns(s.id, 'sermon')}</td>
  </tr>`;
}

function filterSermons() {
  const search  = document.getElementById('sermonSearch').value.toLowerCase();
  const series  = document.getElementById('sermonSeriesFilter').value;
  const pastor  = document.getElementById('sermonPastorFilter').value;
  const filtered = allSermons.filter(s =>
    (!search || s.title?.toLowerCase().includes(search) || s.pastor_name?.toLowerCase().includes(search)) &&
    (!series || s.series_name === series) &&
    (!pastor || s.pastor_name === pastor)
  );
  renderSermonTable(filtered);
}

function renderSermonTable(list) {
  const data = list || allSermons;
  const tbody = document.getElementById('sermonsTable');
  if (!data.length) { tbody.innerHTML = tableEmpty(7, 'No sermons found.'); return; }
  tbody.innerHTML = data.map(s => sermonRow(s, true)).join('');
}

async function openSermonMedia(sermonId, sermonTitle) {
  const overlay = document.getElementById('sermonMediaOverlay');
  const body    = document.getElementById('sermonMediaBody');
  document.getElementById('sermonMediaTitle').textContent = `🗂 Media — ${sermonTitle}`;
  body.innerHTML = '<div class="spinner"></div>';
  overlay.classList.add('open');

  const s = await api('GET', `/sermons/${sermonId}`);
  if (!s || s.error) { body.innerHTML = '<p style="color:red">Failed to load.</p>'; return; }

  body.innerHTML = `
    ${sermonMediaSlot(s, 'audio', '🎵 Audio', s.audio_url, s.audio_cloudinary_id)}
    ${sermonMediaSlot(s, 'video', '🎬 Video', s.video_url, s.video_cloudinary_id)}
    ${sermonMediaSlot(s, 'thumbnail', '🖼️ Thumbnail', s.thumbnail_url, s.thumbnail_cloudinary_id)}
    <div style="text-align:right;margin-top:8px">
      <button class="btn-danger" onclick="closeSermonMedia()">Close</button>
    </div>`;
}

function sermonMediaSlot(s, type, label, url, cloudId) {
  const isImage = type === 'thumbnail';
  const hasFile = !!url;
  return `
    <div class="sermon-media-slot">
      <div class="sermon-media-slot-label">
        ${label}
        ${hasFile ? `<button class="btn-danger btn-sm" onclick="deleteSermonMedia('${s.id}','${type}','${esc(s.title)}')">🗑 Remove</button>` : ''}
      </div>
      ${hasFile ? `
        <div class="sermon-media-current">
          <div class="sermon-media-icon">${isImage ? `<img src="${url}" style="width:56px;height:40px;object-fit:cover;border-radius:4px">` : (type==='audio'?'🎵':'🎬')}</div>
          <div class="sermon-media-info">
            <div class="sermon-media-filename">${cloudId ? cloudId.split('/').pop() : 'External URL'}</div>
            <div class="sermon-media-sub"><a href="${url}" target="_blank" style="color:#143d6f">View / Play ↗</a></div>
          </div>
        </div>
      ` : `<div style="color:#aaa;font-size:0.82rem;margin-bottom:10px">No ${type} uploaded yet</div>`}
      <div style="font-size:0.78rem;color:#888;margin-bottom:6px">${hasFile ? '🔄 Replace with new file:' : '⬆️ Upload file:'}</div>
      <input type="file" id="mediaFile_${type}" accept="${isImage ? 'image/*' : type+'/*'}" style="font-size:0.82rem" />
      <div style="font-size:0.72rem;color:#aaa;margin:6px 0">— or paste URL —</div>
      <input type="url" id="mediaUrl_${type}" value="${url || ''}" placeholder="https://..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.82rem" />
      <button class="btn-save btn-sm" style="margin-top:10px;width:100%" onclick="saveSermonMedia('${s.id}','${type}','${esc(s.title)}')">💾 Save ${label}</button>
    </div>`;
}

async function saveSermonMedia(sermonId, type, sermonTitle) {
  const fileInput = document.getElementById(`mediaFile_${type}`);
  const urlInput  = document.getElementById(`mediaUrl_${type}`);

  const formData = new FormData();
  if (fileInput?.files[0]) {
    showToast('⬆️ Uploading...', 'info');
    formData.append(type === 'thumbnail' ? 'thumbnail' : type, fileInput.files[0]);
  } else if (urlInput?.value.trim()) {
    formData.append(`${type}_url`, urlInput.value.trim());
  } else {
    showToast('Choose a file or paste a URL', 'error'); return;
  }

  // Reuse the PUT endpoint — send only the changed field
  try {
    const r = await fetch(`${API}/sermons/${sermonId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Failed');
    showToast(`✅ ${type} updated!`, 'success');
    openSermonMedia(sermonId, sermonTitle);
    loadSermons();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function deleteSermonMedia(sermonId, type, sermonTitle) {
  showConfirm({
    icon: '🗂', title: `Remove ${type}`,
    message: `This will permanently delete the ${type} file from Cloudinary. The sermon record stays intact.`,
    confirmText: 'Remove File',
    onConfirm: async () => {
      const res = await api('DELETE', `/sermons/${sermonId}/media?type=${type}`);
      if (res?.message) {
        showToast(`🗑 ${type} removed`, 'info');
        openSermonMedia(sermonId, sermonTitle);
        loadSermons();
      } else showToast(res?.error || 'Failed', 'error');
    }
  });
}

function closeSermonMedia() {
  document.getElementById('sermonMediaOverlay').classList.remove('open');
}

// ============================================================
// GALLERY
// ============================================================
async function loadGallery() {
  const grid = document.getElementById('galleryAdminGrid');
  grid.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  const data = await api('GET', '/gallery');
  if (!data || !data.length) {
    grid.innerHTML = '<p style="color:#aaa;padding:40px;text-align:center">No photos yet. Click + Add Photo to get started.</p>';
    return;
  }
  grid.innerHTML = data.map(item => `
    <div class="gallery-admin-item">
      <img class="gallery-admin-img" src="${item.image_url}" alt="${item.title || ''}" onerror="this.style.background='#0d2b52';this.style.height='150px'" />
      <div class="gallery-admin-info">
        <div class="gallery-admin-caption">${item.title || item.caption || '(No title)'}</div>
        <div class="gallery-admin-album">📁 ${item.album}</div>
        <div class="table-actions" style="margin-top:10px">
          <button class="btn-edit btn-sm" onclick="editItem('gallery','${item.id}')">✏️ Edit</button>
          <button class="btn-danger btn-sm" onclick="deleteItem('gallery','${item.id}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// PASTORS
// ============================================================
async function loadPastors() {
  const tbody = document.getElementById('pastorsTable');
  tbody.innerHTML = tableLoading(6);
  const data = await api('GET', '/pastors');
  if (!data || !data.length) { tbody.innerHTML = tableEmpty(6, 'No pastors added yet.'); return; }
  tbody.innerHTML = data.map(p => `<tr>
    <td><div style="display:flex;align-items:center;gap:10px">
      <img src="${p.image_url || ''}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #b89240" />
      <strong>${p.name}</strong>
    </div></td>
    <td>${badge(p.title, 'gold')}</td>
    <td>${p.email || '—'}</td>
    <td>${p.display_order}</td>
    <td>${p.is_active ? badge('Active', 'success') : badge('Inactive', 'warning')}</td>
    <td>${actionBtns(p.id, 'pastor')}</td>
  </tr>`).join('');
}

// ============================================================
// MINISTRIES
// ============================================================
async function loadMinistries() {
  const tbody = document.getElementById('ministriesTable');
  tbody.innerHTML = tableLoading(6);
  const data = await api('GET', '/ministries/all');
  if (!data || !data.length) { tbody.innerHTML = tableEmpty(6, 'No ministries added yet.'); return; }
  tbody.innerHTML = data.map(m => `<tr>
    <td><strong>${m.name}</strong></td>
    <td>${badge(m.category || 'general', 'blue')}</td>
    <td>${m.leader_name || '—'}</td>
    <td>${m.meeting_schedule || '—'}</td>
    <td>${m.is_active ? badge('Active', 'success') : badge('Inactive', 'warning')}</td>
    <td>${actionBtns(m.id, 'ministry')}</td>
  </tr>`).join('');
}

// ============================================================
// SERVICE TIMES
// ============================================================
async function loadServiceTimes() {
  const tbody = document.getElementById('servicetimesTable');
  tbody.innerHTML = tableLoading(6);
  const data = await api('GET', '/settings/service-times');
  if (!data || !data.length) { tbody.innerHTML = tableEmpty(6, 'No service times added yet.'); return; }
  tbody.innerHTML = data.map(s => `<tr>
    <td>${badge(s.day_of_week, 'gold')}</td>
    <td><strong>${s.service_name}</strong></td>
    <td>${fmtTime(s.start_time)}${s.end_time ? ' – ' + fmtTime(s.end_time) : ''}</td>
    <td>${s.location_detail || '—'}</td>
    <td>${s.is_active ? badge('Active', 'success') : badge('Inactive', 'warning')}</td>
    <td>${actionBtns(s.id, 'servicetime')}</td>
  </tr>`).join('');
}

// ============================================================
// CHURCH SETTINGS — FIXED
// ============================================================
async function loadSettings() {
  const container = document.getElementById('settingsForm');
  container.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  const data = await api('GET', '/settings/full');
  if (!data || data.error) { container.innerHTML = '<p style="color:red;padding:20px">Failed to load settings.</p>'; return; }
 
  // Keys that get an image-upload widget instead of a text input
  const imageKeys = [
    'hero_image_url', 'visit_image_url',
    'life_image_1_url', 'life_image_2_url', 'life_image_3_url', 'life_image_4_url',
    'motto_image_url'
  ];
 
  // Cloudinary public_id twin for each image key
  const publicIdTwin = {
    'hero_image_url':      'hero_image_public_id',
    'visit_image_url':     'visit_image_public_id',
    'life_image_1_url':    'life_image_1_public_id',
    'life_image_2_url':    'life_image_2_public_id',
    'life_image_3_url':    'life_image_3_public_id',
    'life_image_4_url':    'life_image_4_public_id',
    'motto_image_url':     'motto_image_public_id',
  };
 
  // Cloudinary folder for each image key
  const imageFolder = {
    'hero_image_url':      'lighthouse/site',
    'visit_image_url':     'lighthouse/site',
    'life_image_1_url':    'lighthouse/site',
    'life_image_2_url':    'lighthouse/site',
    'life_image_3_url':    'lighthouse/site',
    'life_image_4_url':    'lighthouse/site',
    'motto_image_url':     'lighthouse/site',
  };
 
  // Skip these keys — they are managed silently as twins
  const hiddenKeys = Object.values(publicIdTwin);
 
  const groups = {
    'Church Identity':       ['church_name', 'tagline', 'about_text', 'vision_text', 'mission_text'],
    'Contact Information':   ['address', 'phone', 'email'],
    'Social Media':          ['facebook_url', 'youtube_url', 'instagram_url', 'whatsapp_number'],
    'Location':              ['google_maps_embed'],
    '🔴 Live Video':         ['live_video_url'],
    '🖼️ Homepage Photos': ['hero_image_url'],
    '🏆 Year Motto':         ['motto_image_url', 'motto_title', 'motto_scripture'],
    '💰 Giving & Donations': ['momo_mtn', 'momo_telecel', 'momo_airteltigo', 'bank_name', 'bank_account', 'bank_branch', 'giving_note']
  };
 
  const settingsMap = {};
  data.forEach(s => settingsMap[s.key] = s);
 
  container.innerHTML = Object.entries(groups).map(([groupName, keys]) => `
    <div class="settings-section">
      <h3>${groupName}</h3>
      <div class="settings-grid">
        ${keys.map(key => {
          const s = settingsMap[key];
          if (!s) return '';
          if (hiddenKeys.includes(key)) return '';
 
          if (imageKeys.includes(key)) {
            // IMAGE UPLOAD WIDGET
            const currentUrl = s.value || '';
            const pidKey = publicIdTwin[key];
            const pidVal = settingsMap[pidKey]?.value || '';
            const folder = imageFolder[key] || 'lighthouse/site';
            return `
              <div class="form-group full">
                <label>${s.label || key}</label>
                <div class="img-upload-widget" id="widget_${key}">
                  ${currentUrl ? `
                    <div class="img-upload-preview" id="preview_${key}">
                      <img src="${currentUrl}" alt="Current" style="max-height:160px;border-radius:8px;object-fit:cover;display:block;margin-bottom:10px" />
                      <div style="display:flex;gap:10px">
                        <label class="btn-edit btn-sm" style="cursor:pointer">
                          🔄 Replace
                          <input type="file" accept="image/*" style="display:none"
                            onchange="settingUploadImage(this,'${key}','${pidKey}','${folder}')" />
                        </label>
                        <button class="btn-danger btn-sm" onclick="settingDeleteImage('${key}','${pidKey}','${pidVal}')">🗑 Remove</button>
                      </div>
                    </div>
                  ` : `
                    <div class="img-upload-empty" id="preview_${key}">
                      <label class="btn-save btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
                        ⬆️ Upload Photo
                        <input type="file" accept="image/*" style="display:none"
                          onchange="settingUploadImage(this,'${key}','${pidKey}','${folder}')" />
                      </label>
                      <div style="font-size:0.78rem;color:#aaa;margin-top:8px">${s.label}</div>
                    </div>
                  `}
                  <input type="hidden" id="setting_${key}" value="${currentUrl}" />
                  <input type="hidden" id="setting_${pidKey}" value="${pidVal}" />
                </div>
              </div>`;
          }
 
          // NORMAL TEXT/TEXTAREA INPUT
          const isLong = ['about_text','vision_text','mission_text','google_maps_embed'].includes(key);
          const val = (s.value || '').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          return `<div class="form-group ${isLong ? 'full' : ''}">
            <label>${s.label || key}</label>
            ${isLong
              ? `<textarea id="setting_${key}" rows="4">${s.value || ''}</textarea>`
              : `<input type="text" id="setting_${key}" value="${val}" />`}
          </div>`;
        }).join('')}
      </div>
      <button class="btn-save" data-keys='${JSON.stringify(keys)}' onclick="saveSettingsGroup(this)">💾 Save ${groupName}</button>
    </div>
  `).join('');
}

async function settingUploadImage(fileInput, urlKey, pidKey, folder) {
  if (!fileInput.files[0]) return;
  showToast('⬆️ Uploading...', 'info');
 
  // Delete old Cloudinary image first if one exists
  const oldPid = document.getElementById(`setting_${pidKey}`)?.value;
  if (oldPid) {
    await api('DELETE', '/upload/image', { public_id: oldPid });
  }
 
  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  formData.append('folder', folder);
 
  try {
    const res = await fetch(`${API}/upload/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
 
    // Save both url + public_id to DB
    const updates = {};
    updates[urlKey] = data.url;
    updates[pidKey] = data.public_id;
    const saveRes = await api('PUT', '/settings', updates);
    if (!saveRes?.message) throw new Error('Failed to save setting');
 
    showToast('✅ Photo saved!', 'success');
 
    // Refresh just this widget by reloading the settings panel
    loadSettings();
 
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}
 
async function settingDeleteImage(urlKey, pidKey, publicId) {
  showConfirm({
    icon: '🖼️', title: 'Remove Photo',
    message: 'This photo will be removed. The section will use the default design until a new photo is uploaded.',
    confirmText: 'Remove Photo', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      if (publicId) await api('DELETE', '/upload/image', { public_id: publicId });
      const updates = {};
      updates[urlKey] = ''; updates[pidKey] = '';
      const res = await api('PUT', '/settings', updates);
      if (res?.message) { showToast('🗑 Photo removed', 'info'); loadSettings(); }
      else showToast('❌ Failed to remove photo', 'error');
    }
  });
}

async function saveSettingsGroup(btn) {
  const keys = JSON.parse(btn.dataset.keys);
  const updates = {};
  keys.forEach(k => {
    const el = document.getElementById(`setting_${k}`);
    if (el) updates[k] = el.value;
  });
  const res = await api('PUT', '/settings', updates);
  if (res && res.message) showToast('✅ Settings saved!', 'success');
  else showToast(res?.error || '❌ Failed to save settings', 'error');
}

function populateCustomGroupFilter() {
  const sel = document.getElementById('memberCustomGroupFilter');
  if (!sel) return;
  const customs = allGroups.filter(g => !g.is_default);
  sel.innerHTML = '<option value="">All Custom Groups</option>' +
    customs.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// ============================================================
// MEMBERS
// ============================================================
async function loadMembers() {
  const tbody = document.getElementById('membersTable');
  tbody.innerHTML = tableLoading(8);
  const data = await api('GET', '/members');
  if (data && data.error) { tbody.innerHTML = tableEmpty(8, data.error); return; }
  allMembers = Array.isArray(data) ? data : [];
  populateCustomGroupFilter();
  renderMembers(allMembers);
  renderMemberStats(allMembers);
  loadMemberActivity();
}

function toggleActivityPanel() {
  const body = document.getElementById('activityPanelBody');
  const toggle = document.getElementById('activityToggleBtn');
  if (!body) return;
  const isOpen = body.classList.toggle('activity-panel-open');
  toggle.textContent = isOpen ? '▲ Hide' : '▼ Show';
}

async function loadMemberActivity() {
  const el = document.getElementById('memberActivityFeed');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  const data = await api('GET', '/members/activity');

  if (!data || data.error || !data.length) {
    el.innerHTML = '<div class="activity-empty">No member activity recorded yet. Activity appears here as members are added, baptized, or change status.</div>';
    return;
  }

  const icons = {
    joined: '🆕', status_change: '🔄', promoted: '⬆️',
    baptized: '✝️', group_added: '➕', group_removed: '➖'
  };
  const labels = {
    joined: 'Joined the church',
    status_change: 'Status changed',
    promoted: 'Promoted to Regular',
    baptized: 'Baptized',
    group_added: 'Added to group',
    group_removed: 'Removed from group'
  };

  el.innerHTML = data.map(a => `
    <div class="activity-row">
      <div class="activity-icon">${icons[a.activity_type] || '📋'}</div>
      <div class="activity-info">
        <span class="activity-name">${a.member_name || 'Unknown Member'}</span>
        <span class="activity-label">${labels[a.activity_type] || a.activity_type}${
          a.old_value && a.new_value
            ? ` <span class="activity-arrow">${a.old_value} → ${a.new_value}</span>`
            : a.new_value
              ? `: ${a.new_value}`
              : ''
        }</span>
      </div>
      <div class="activity-date">${fmt(a.created_at)}</div>
    </div>
  `).join('');
}

function filterMembers() {
  const search = document.getElementById('memberSearch').value.toLowerCase();
  const status = document.getElementById('memberStatusFilter').value;
  const group = document.getElementById('memberGroupFilter').value;
  const customGroup = document.getElementById('memberCustomGroupFilter').value;
  const baptized = document.getElementById('memberBaptizedFilter').value;

  const filtered = allMembers.filter(m => {
    const matchSearch = !search ||
      m.full_name?.toLowerCase().includes(search) ||
      m.email?.toLowerCase().includes(search) ||
      m.phone?.includes(search);
    const matchStatus = !status || m.membership_status === status;
    const matchGroup = !group || m.primary_group === group;
    const matchCustom = !customGroup || (m.group_ids && m.group_ids.includes(customGroup));
    const matchBaptized = !baptized ||
      (baptized === 'yes' && m.baptism_date) ||
      (baptized === 'no' && !m.baptism_date);
    return matchSearch && matchStatus && matchGroup && matchCustom && matchBaptized;
  });
  renderMembers(filtered);
}

function renderMemberStats(members) {
  const stats = document.getElementById('membersStats');
  const total = members.length;
  const men = members.filter(m => m.primary_group === 'Men').length;
  const women = members.filter(m => m.primary_group === 'Women').length;
  const youth = members.filter(m => m.primary_group === 'Youth').length;
  const children = members.filter(m => m.primary_group === 'Children').length;
  stats.innerHTML = `
    <div class="members-stat-grid">
      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total Members</div></div>
      <div class="stat-card"><div class="stat-num">${men}</div><div class="stat-label">Men</div></div>
      <div class="stat-card"><div class="stat-num">${women}</div><div class="stat-label">Women</div></div>
      <div class="stat-card"><div class="stat-num">${youth}</div><div class="stat-label">Youth</div></div>
      <div class="stat-card"><div class="stat-num">${children}</div><div class="stat-label">Children</div></div>
    </div>`;
}

function renderMembers(members) {
  const tbody = document.getElementById('membersTable');
  if (!members.length) { tbody.innerHTML = tableEmpty(8, 'No members found. Click + Add Member to get started.'); return; }
  tbody.innerHTML = members.map(m => {
    const memberGroups = allGroups.filter(g => !g.is_default);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        ${m.image_url ? `<img src="${m.image_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #b89240;flex-shrink:0" />` : `<div style="width:34px;height:34px;border-radius:50%;background:#0d2b52;display:flex;align-items:center;justify-content:center;color:#b89240;font-size:0.85rem;flex-shrink:0">👤</div>`}
        <div><strong>${m.full_name}</strong>${m.occupation ? `<br><small style="color:#888">${m.occupation}</small>` : ''}</div>
      </div></td>
      <td>${m.primary_group ? badge(m.primary_group, m.primary_group === 'Men' ? 'blue' : m.primary_group === 'Women' ? 'gold' : 'success') : '—'}</td>
      <td>${m.phone || '—'}</td>
      <td>${m.email ? `<a href="mailto:${m.email}" style="color:#143d6f">${m.email}</a>` : '—'}</td>
      <td>${badge(m.membership_status || 'regular', m.membership_status === 'leader' ? 'gold' : m.membership_status === 'worker' ? 'blue' : m.membership_status === 'inactive' ? 'error' : 'success')}</td>
      <td><button class="btn-edit btn-sm" onclick="viewMemberGroups('${m.id}','${esc(m.full_name)}')">View Groups</button></td>
      <td>${fmt(m.join_date)}</td>
      <td>${m.baptism_date ? badge('Baptized ✓', 'success') : badge('Not yet', 'warning')}</td>
      <td>${actionBtns(m.id, 'member')}</td>
    </tr>`;
  }).join('');
}

async function viewMemberGroups(memberId, memberName) {
  const overlay = document.getElementById('groupMembersOverlay');
  const title = document.getElementById('groupMembersTitle');
  const body = document.getElementById('groupMembersBody');
  title.textContent = `${memberName} — Groups & Roles`;
  body.innerHTML = '<div class="spinner"></div>';
  overlay.classList.add('open');

  const data = await api('GET', `/members/${memberId}`);
  const memberGroups = data?.groups || [];
  const customGroups = allGroups.filter(g => !g.is_default);
  const memberGroupIds = memberGroups.map(g => g.id);

  body.innerHTML = `
    <p style="color:#666;margin-bottom:16px">Groups this member belongs to. Primary group is set in their profile.</p>
    <div style="margin-bottom:20px">
      <strong style="font-size:0.85rem;color:#888;letter-spacing:1px">CURRENT GROUPS</strong>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
        ${memberGroups.length ? memberGroups.map(g => `
          <span style="background:#0d2b52;color:#fff;padding:6px 14px;border-radius:50px;font-size:0.85rem;display:flex;align-items:center;gap:8px">
            ${g.name}
            <button onclick="removeMemberFromGroup('${g.id}','${memberId}','${memberName}')" style="background:none;border:none;color:#ff8a80;cursor:pointer;font-size:1rem;line-height:1">×</button>
          </span>`).join('') : '<span style="color:#aaa">Not in any custom groups yet.</span>'}
      </div>
    </div>
    ${customGroups.length ? `
    <div>
      <strong style="font-size:0.85rem;color:#888;letter-spacing:1px">ADD TO GROUP</strong>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        ${customGroups.filter(g => !memberGroupIds.includes(g.id)).map(g => `
          <button class="btn-edit btn-sm" onclick="addMemberToGroup('${g.id}','${memberId}','${memberName}')">+ ${g.name}</button>
        `).join('') || '<span style="color:#aaa">Already in all groups.</span>'}
      </div>
    </div>` : '<p style="color:#aaa;margin-top:16px">No custom groups yet. Create groups in the Groups & Roles panel.</p>'}
  `;
}

async function addMemberToGroup(groupId, memberId, memberName) {
  const res = await api('POST', `/groups/${groupId}/members`, { member_id: memberId });
  if (res?.message) { showToast('✅ Added to group!', 'success'); viewMemberGroups(memberId, memberName); loadGroupsList(); }
  else showToast(res?.error || 'Failed to add to group', 'error');
}

async function removeMemberFromGroup(groupId, memberId, memberName) {
  showConfirm({
    icon: '🏷️', title: 'Remove from Group',
    message: `Remove <strong>${memberName}</strong> from this group?`,
    confirmText: 'Remove', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('DELETE', `/groups/${groupId}/members/${memberId}`);
      if (res?.message) { showToast('Removed from group', 'info'); viewMemberGroups(memberId, memberName); loadGroupsList(); }
      else showToast(res?.error || 'Failed to remove', 'error');
    }
  });
}

function closeGroupMembers() {
  document.getElementById('groupMembersOverlay').classList.remove('open');
}

// ============================================================
// GROUPS
// ============================================================
async function loadGroups() {
  const grid = document.getElementById('groupsGrid');
  grid.innerHTML = '<div class="table-loading"><div class="spinner"></div></div>';
  const data = await api('GET', '/groups');
  if (data?.error) { grid.innerHTML = `<p style="color:red;padding:20px">${data.error}</p>`; return; }
  allGroups = Array.isArray(data) ? data : [];

  const defaults = allGroups.filter(g => g.is_default);
  const customs = allGroups.filter(g => !g.is_default);

  grid.innerHTML = `
    <div style="margin-bottom:24px">
      <h3 style="font-family:'Cinzel',serif;color:#0d2b52;margin-bottom:4px;font-size:1rem">Primary Groups</h3>
      <p style="color:#888;font-size:0.85rem;margin-bottom:16px">Default groups — all members belong to one of these</p>
      <div class="groups-cards">
        ${defaults.map(g => groupCard(g)).join('')}
      </div>
    </div>
    <div>
      <h3 style="font-family:'Cinzel',serif;color:#0d2b52;margin-bottom:4px;font-size:1rem">Custom Groups & Roles</h3>
      <p style="color:#888;font-size:0.85rem;margin-bottom:16px">Groups you create — members can belong to multiple</p>
      <div class="groups-cards">
        ${customs.length ? customs.map(g => groupCard(g)).join('') : '<p style="color:#aaa;padding:20px">No custom groups yet. Click + New Group to create one.</p>'}
      </div>
    </div>`;
}

function groupCard(g) {
  return `
    <div class="group-card" style="border-top:4px solid ${g.color || '#0d2b52'}">
      <div class="group-card-header">
        <div>
          <div class="group-card-name">${g.name}</div>
          <div class="group-card-count">${g.member_count || 0} member${g.member_count !== 1 ? 's' : ''}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn-edit btn-sm" onclick="openGroupMembers('${g.id}','${esc(g.name)}')">👥 View</button>
          ${!g.is_default ? `<button class="btn-danger btn-sm" onclick="deleteItem('group','${g.id}')">🗑</button>` : ''}
        </div>
      </div>
      ${g.description ? `<p style="color:#666;font-size:0.82rem;margin-top:8px">${g.description}</p>` : ''}
      ${g.is_default ? `<div style="margin-top:8px">${badge('Default', 'blue')}</div>` : ''}
    </div>`;
}

async function openGroupMembers(groupId, groupName) {
  currentGroupId = groupId;
  const overlay = document.getElementById('groupMembersOverlay');
  const title = document.getElementById('groupMembersTitle');
  const body = document.getElementById('groupMembersBody');
  title.textContent = `${groupName} — Members`;
  body.innerHTML = '<div class="spinner"></div>';
  overlay.classList.add('open');

  const members = await api('GET', `/groups/${groupId}/members`);
  const allM = await api('GET', '/members');
  const memberIds = Array.isArray(members) ? members.map(m => m.id) : [];
  const notInGroup = Array.isArray(allM) ? allM.filter(m => !memberIds.includes(m.id)) : [];

  body.innerHTML = `
    <div style="margin-bottom:20px">
      <strong style="font-size:0.85rem;color:#888;letter-spacing:1px">MEMBERS (${members?.length || 0})</strong>
      <div class="data-table-wrapper" style="margin-top:10px">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Primary Group</th><th>Role in Group</th><th>Action</th></tr></thead>
          <tbody>
            ${Array.isArray(members) && members.length ? members.map(m => `<tr>
              <td><strong>${m.full_name}</strong></td>
              <td>${m.primary_group ? badge(m.primary_group, 'blue') : '—'}</td>
              <td>${m.role_in_group || '—'}</td>
              <td><button class="btn-danger btn-sm" onclick="removeFromGroupDirect('${groupId}','${m.id}','${groupName}')">Remove</button></td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No members in this group yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    ${notInGroup.length ? `
    <div>
      <strong style="font-size:0.85rem;color:#888;letter-spacing:1px">ADD MEMBERS</strong>
      <div style="margin-top:10px;max-height:200px;overflow-y:auto;border:1px solid #e0e4f0;border-radius:8px">
        ${notInGroup.map(m => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f0f2f8">
            <span>${m.full_name} ${m.primary_group ? `<span style="color:#888;font-size:0.8rem">(${m.primary_group})</span>` : ''}</span>
            <button class="btn-edit btn-sm" onclick="addToGroupDirect('${groupId}','${m.id}','${groupName}')">+ Add</button>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;
}

async function addToGroupDirect(groupId, memberId, groupName) {
  const res = await api('POST', `/groups/${groupId}/members`, { member_id: memberId });
  if (res?.message) { showToast('✅ Member added!', 'success'); openGroupMembers(groupId, groupName); loadGroups(); }
  else showToast(res?.error || 'Failed', 'error');
}

async function removeFromGroupDirect(groupId, memberId, groupName) {
  showConfirm({
    icon: '🏷️', title: 'Remove Member',
    message: 'Remove this member from the group?',
    confirmText: 'Remove', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('DELETE', `/groups/${groupId}/members/${memberId}`);
      if (res?.message) { showToast('Removed', 'info'); openGroupMembers(groupId, groupName); loadGroups(); }
      else showToast(res?.error || 'Failed', 'error');
    }
  });
}

// ============================================================
// PRAYER
// ============================================================
async function loadPrayer() {
  const tbody = document.getElementById('prayerTable');
  tbody.innerHTML = tableLoading(6);
  const data = await api('GET', '/prayer');
  if (!data || !data.length) { tbody.innerHTML = tableEmpty(6, 'No prayer requests yet.'); return; }
  tbody.innerHTML = data.map(p => `<tr>
    <td><strong>${esc(p.requester_name)}</strong>${p.email ? `<br><small>${esc(p.email)}</small>` : ''}</td>
    <td style="max-width:280px;font-size:0.85rem">${esc(p.request_text.substring(0, 120))}${p.request_text.length > 120 ? '...' : ''}</td>
    <td>${p.is_private ? badge('Private', 'warning') : badge('Public', 'blue')}</td>
    <td>${p.is_answered ? badge('Answered 🙏', 'success') : badge('Pending', 'warning')}</td>
    <td>${fmt(p.created_at)}</td>
    <td><div class="table-actions">
      ${!p.is_answered ? `<button class="btn-edit btn-sm" onclick="markAnswered('${p.id}')">✅ Answered</button>` : ''}
      <button class="btn-danger btn-sm" onclick="deleteItem('prayer','${p.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

async function markAnswered(id) {
  await api('PUT', `/prayer/${id}`, { is_answered: true });
  showToast('🙏 Marked as answered!', 'success');
  loadPrayer();
}

// ============================================================
// MESSAGES
// ============================================================
async function loadMessages() {
  const tbody = document.getElementById('messagesTable');
  tbody.innerHTML = tableLoading(7);
  const data = await api('GET', '/contact');
  if (!data || !data.length) { tbody.innerHTML = tableEmpty(7, 'No messages yet.'); return; }
  tbody.innerHTML = data.map(m => `<tr style="${!m.is_read ? 'background:rgba(184,146,64,0.04)' : ''}">
    <td><strong>${esc(m.name)}</strong></td>
    <td><a href="mailto:${m.email}" style="color:#143d6f">${m.email}</a></td>
    <td>${m.subject || '—'}</td>
    <td style="max-width:240px;font-size:0.85rem">${esc((m.message || '').substring(0, 100))}...</td>
    <td>${m.is_read ? badge('Read', 'success') : badge('Unread', 'warning')}</td>
    <td>${fmt(m.created_at)}</td>
    <td><div class="table-actions">
    ${!m.is_read ? `<button class="btn-edit btn-sm" onclick="markRead('${m.id}')">Mark Read</button>` : ''}
    <a href="mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Your Message')}&body=Dear ${encodeURIComponent(m.name)},%0A%0A" class="btn-edit btn-sm" target="_blank">✉️ Reply</a>
    <button class="btn-danger btn-sm" onclick="deleteItem('messages','${m.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

async function markRead(id) {
  await api('PUT', `/contact/${id}/read`);
  showToast('Message marked as read', 'info');
  loadMessages();
}

// ============================================================
// ADMINS
// ============================================================
async function loadAdmins() {
  const tbody = document.getElementById('adminsTable');
  if (!tbody) return;

  if (ADMIN.role !== 'superadmin') {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">
      Superadmin access required to view admin accounts.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = tableLoading(5);
  const data = await api('GET', '/auth/admins');
  if (!data || data.error) {
    tbody.innerHTML = tableEmpty(5, data?.error || 'Failed to load admins.');
    return;
  }
  if (!data.length) {
    tbody.innerHTML = tableEmpty(5, 'No admin accounts found.');
    return;
  }
  tbody.innerHTML = data.map(a => {
    const isSelf = a.id === ADMIN.id;
    return `<tr>
      <td><strong>${a.name}</strong> ${isSelf ? '<span class="admin-self-badge">You</span>' : ''}</td>
      <td>${a.email}</td>
      <td>${badge(a.role, a.role === 'superadmin' ? 'gold' : a.role === 'admin' ? 'blue' : 'success')}</td>
      <td>${fmt(a.created_at)}</td>
      <td>
        <div class="admins-table-actions">
          ${isSelf
            ? '<span class="admin-self-badge">Current Session</span>'
            : `<button class="btn-danger btn-sm" onclick="deleteAdmin('${a.id}','${esc(a.name)}')">🗑 Delete</button>`
          }
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function deleteAdmin(id, name) {
  showConfirm({
    icon: '🔐',
    title: 'Delete Admin Account',
    message: `<strong>${name}</strong> will be permanently removed and will no longer be able to log in. This cannot be undone.`,
    confirmText: 'Yes, Delete Admin',
    confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('DELETE', `/auth/admins/${id}`);
      if (res?.message) {
        showToast('🗑️ Admin account deleted', 'success');
        loadAdmins();
      } else {
        showToast(res?.error || '❌ Failed to delete admin', 'error');
      }
    }
  });
}

async function deleteAnnouncementImage(announcementId, publicId) {
  showConfirm({
    icon: '🖼️', title: 'Delete Image',
    message: 'This will permanently remove the image from Cloudinary. The announcement itself will remain.',
    confirmText: 'Delete Image', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('PATCH', `/announcements/${announcementId}/clear-image`, { cloudinary_public_id: publicId || null });
      if (res && !res.error) {
        showToast('🗑 Image removed', 'info');
        closeModalNow();
        loadAnnouncements();
      } else {
        showToast(res?.error || '❌ Failed to remove image', 'error');
      }
    }
  });
}

async function deleteEventImage(eventId, publicId) {
  showConfirm({
    icon: '🖼️', title: 'Delete Image',
    message: 'This will permanently remove the image from Cloudinary. The event itself will remain.',
    confirmText: 'Delete Image', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const res = await api('PATCH', `/events/${eventId}/clear-image`, { cloudinary_public_id: publicId || null });
      if (res && !res.error) {
        showToast('🗑 Image removed', 'info');
        closeModalNow();
        loadEvents();
      } else {
        showToast(res?.error || '❌ Failed to remove image', 'error');
      }
    }
  });
}

async function changePassword() {
  const cur = document.getElementById('currentPw').value;
  const nw = document.getElementById('newPw').value;
  const cf = document.getElementById('confirmPw').value;
  if (!cur || !nw || !cf) { showToast('Fill in all password fields', 'error'); return; }
  if (nw !== cf) { showToast('New passwords do not match', 'error'); return; }
  if (nw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  const res = await api('POST', '/auth/change-password', { currentPassword: cur, newPassword: nw });
  if (res && res.message) {
    showToast('✅ Password changed! Logging out...', 'success');
    setTimeout(logout, 2000);
  } else {
    showToast(res?.error || 'Failed to change password', 'error');
  }
}

// ============================================================
// MODAL SYSTEM
// ============================================================
function openModal(type, data = null) {
  if (type === 'admin' && ADMIN.role !== 'superadmin') {
    showToast('⛔ Only superadmins can create new admin accounts.', 'error');
    return;
  }
  editingId = data?.id || null;
  editingType = type;
  const overlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const isEdit = !!data;
  const prefix = isEdit ? 'Edit' : 'New';

  const forms = {
    announcement: {
      title: `${prefix} Announcement`,
      html: `
        <div class="form-group"><label>Title *</label><input type="text" id="f_title" value="${esc(data?.title)}" placeholder="Announcement title" /></div>
        <div class="form-group"><label>Body / Content *</label><textarea id="f_body" rows="5">${esc(data?.body)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="f_category">
            <option value="general" ${sel(data?.category,'general')}>General</option>
            <option value="urgent" ${sel(data?.category,'urgent')}>🚨 Urgent</option>
            <option value="event" ${sel(data?.category,'event')}>Event</option>
            <option value="prayer" ${sel(data?.category,'prayer')}>Prayer</option>
          </select></div>
          <div class="form-group"><label>Expires On (optional)</label><input type="datetime-local" id="f_expires_at" value="${data?.expires_at ? data.expires_at.slice(0,16) : ''}" /></div>
        </div>
        <div class="form-group">
          <label>Image</label>
          ${data?.image_url
            ? `<div class="media-current-wrap">
                <img src="${data.image_url}" class="media-current-thumb" />
                <div class="media-current-actions">
                  <label class="btn-edit btn-sm media-replace-label">🔄 Replace<input type="file" accept="image/*" id="f_image_file" class="media-file-hidden" /></label>
                  <button type="button" class="btn-danger btn-sm" onclick="deleteAnnouncementImage('${data.id}','${esc(data.cloudinary_public_id)}')">🗑 Delete Image</button>
                </div>
              </div>`
            : `<input type="file" id="f_image_file" accept="image/*" />`}
          <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
          <input type="hidden" id="f_cloudinary_public_id" value="${esc(data?.cloudinary_public_id)}" />
        </div>
        <div class="form-group">
          <label>Video URL (optional)</label>
          <input type="url" id="f_video_url" value="${esc(data?.video_url)}" placeholder="YouTube, Facebook, Vimeo or any direct video link" />
          <span class="field-hint">Paste any video link — YouTube, Facebook Live, Vimeo, etc. Shown below the announcement image.</span>
        </div>
        <div class="form-checks-row">
          <div class="form-check"><input type="checkbox" id="f_is_pinned" ${data?.is_pinned ? 'checked' : ''} /><label for="f_is_pinned">📌 Pinned</label></div>
          <div class="form-check"><input type="checkbox" id="f_is_published" ${!data || data?.is_published ? 'checked' : ''} /><label for="f_is_published">Published</label></div>
        </div>`
    },
    event: {
      title: `${prefix} Event`,
      html: `
        <div class="form-group"><label>Event Title *</label><input type="text" id="f_title" value="${esc(data?.title)}" /></div>
        <div class="form-group"><label>Description</label><textarea id="f_description" rows="3">${esc(data?.description)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Start Date *</label><input type="date" id="f_event_date" value="${data?.event_date ? data.event_date.slice(0,10) : ''}" /></div>
          <div class="form-group"><label>End Date (multi-day events)</label><input type="date" id="f_end_date" value="${data?.end_date ? data.end_date.slice(0,10) : ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start Time</label><input type="time" id="f_start_time" value="${data?.start_time || ''}" /></div>
          <div class="form-group"><label>End Time</label><input type="time" id="f_end_time" value="${data?.end_time || ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="f_category">
            <option value="general" ${sel(data?.category,'general')}>General</option>
            <option value="worship" ${sel(data?.category,'worship')}>Worship</option>
            <option value="youth" ${sel(data?.category,'youth')}>Youth</option>
            <option value="women" ${sel(data?.category,'women')}>Women</option>
            <option value="men" ${sel(data?.category,'men')}>Men</option>
            <option value="children" ${sel(data?.category,'children')}>Children</option>
            <option value="outreach" ${sel(data?.category,'outreach')}>Outreach</option>
          </select></div>
          <div class="form-group"><label>Location</label><input type="text" id="f_location" value="${esc(data?.location)}" /></div>
        </div>
        <div class="form-group">
          <label>Event Image</label>
          ${data?.image_url
            ? `<div class="media-current-wrap">
                <img src="${data.image_url}" class="media-current-thumb" />
                <div class="media-current-actions">
                  <label class="btn-edit btn-sm media-replace-label">🔄 Replace<input type="file" accept="image/*" id="f_image_file" class="media-file-hidden" /></label>
                  <button type="button" class="btn-danger btn-sm" onclick="deleteEventImage('${data.id}','${esc(data.cloudinary_public_id)}')">🗑 Delete Image</button>
                </div>
              </div>`
            : `<input type="file" id="f_image_file" accept="image/*" />`}
          <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
          <input type="hidden" id="f_cloudinary_public_id" value="${esc(data?.cloudinary_public_id)}" />
        </div>
        <div class="form-group">
          <label>Video URL (optional)</label>
          <input type="url" id="f_video_url" value="${esc(data?.video_url)}" placeholder="YouTube, Facebook, Vimeo or any direct video link" />
          <span class="field-hint">Paste any video link to show a video player on the event card.</span>
        </div>
        <div class="form-group"><label>Registration Link (optional)</label><input type="url" id="f_registration_link" value="${esc(data?.registration_link)}" /></div>
        <div class="form-checks-row">
          <div class="form-check"><input type="checkbox" id="f_is_featured" ${data?.is_featured ? 'checked' : ''} /><label for="f_is_featured">⭐ Featured</label></div>
          <div class="form-check"><input type="checkbox" id="f_is_published" ${!data || data?.is_published ? 'checked' : ''} /><label for="f_is_published">Published</label></div>
        </div>`
    },
    sermon: {
      title: `${prefix} Sermon`,
      html: `
        <div class="form-group"><label>Sermon Title *</label><input type="text" id="f_title" value="${esc(data?.title)}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Pastor</label><select id="f_pastor_id">
            <option value="">Select Pastor</option>
            ${pastorsList.map(p => `<option value="${p.id}" ${data?.pastor_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Date *</label><input type="date" id="f_sermon_date" value="${data?.sermon_date ? data.sermon_date.slice(0,10) : ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Scripture Reference</label><input type="text" id="f_scripture_reference" value="${esc(data?.scripture_reference)}" /></div>
          <div class="form-group">
            <label>Series</label>
            ${lockedSeriesName ? `
              <div style="padding:11px 14px;background:#f0e8d8;border-radius:8px;color:#7a5d1e;font-size:0.88rem;font-weight:600">
                📚 ${esc(lockedSeriesName)}
              </div>
              <input type="hidden" id="f_series_select" value="${esc(lockedSeriesName)}" />
            ` : (() => {
              const seriesNames = [...new Set(allSermons.map(s => s.series_name).filter(Boolean))];
              const currentSeries = data?.series_name || '';
              const isKnown = !currentSeries || seriesNames.includes(currentSeries);
              return `
              <select id="f_series_select" onchange="onSeriesSelectChange()">
                <option value="">No Series (Standalone)</option>
                ${seriesNames.map(name => `<option value="${esc(name)}" ${currentSeries === name ? 'selected' : ''}>${name}</option>`).join('')}
                <option value="__new__" ${!isKnown ? 'selected' : ''}>+ Create New Series...</option>
              </select>
              <input type="text" id="f_series_name_new" placeholder="New series name"
                value="${!isKnown ? esc(currentSeries) : ''}"
                style="display:${!isKnown ? 'block' : 'none'};margin-top:8px" />`;
            })()}
          </div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="f_description" rows="3">${esc(data?.description)}</textarea></div>

        <div class="sermon-upload-grid">
          <div class="sermon-upload-card">
            <div class="sermon-upload-label">🎵 Audio</div>
            ${data?.audio_url ? `<div class="sermon-file-existing"><audio controls src="${data.audio_url}" style="width:100%"></audio></div>` : ''}
            <div class="sermon-upload-hint">Upload MP3/WAV/AAC file</div>
            <input type="file" id="f_audio_file" accept="audio/*" class="sermon-file-input" />
            <div class="sermon-upload-hint" style="margin-top:8px">— or paste URL —</div>
            <input type="url" id="f_audio_url" value="${esc(data?.audio_url)}" placeholder="https://..." class="sermon-url-input" />
          </div>

          <div class="sermon-upload-card">
            <div class="sermon-upload-label">🎬 Video</div>
            ${data?.video_url && !data.video_url.includes('youtube') && !data.video_url.includes('youtu.be') ? `<div class="sermon-file-existing"><video controls src="${data.video_url}" style="width:100%;max-height:100px"></video></div>` : ''}
            <div class="sermon-upload-hint">Upload MP4 file</div>
            <input type="file" id="f_video_file" accept="video/*" class="sermon-file-input" />
            <div class="sermon-upload-hint" style="margin-top:8px">— or paste YouTube / video URL —</div>
            <input type="url" id="f_video_url" value="${esc(data?.video_url)}" placeholder="https://youtube.com/..." class="sermon-url-input" />
          </div>

          <div class="sermon-upload-card">
            <div class="sermon-upload-label">🖼️ Thumbnail</div>
            ${data?.thumbnail_url ? `<img src="${data.thumbnail_url}" class="sermon-thumb-preview" />` : ''}
            <div class="sermon-upload-hint">Upload thumbnail image</div>
            <input type="file" id="f_thumbnail_file" accept="image/*" class="sermon-file-input" />
            <div class="sermon-upload-hint" style="margin-top:8px">— or paste URL —</div>
            <input type="url" id="f_thumbnail_url" value="${esc(data?.thumbnail_url)}" placeholder="https://..." class="sermon-url-input" />
          </div>
        </div>

        <div class="form-row" style="margin-top:16px">
          <div class="form-group"><label>Duration (minutes)</label><input type="number" id="f_duration_minutes" value="${data?.duration_minutes || ''}" /></div>
          <div class="form-group" style="justify-content:flex-end;padding-top:24px">
            <div class="form-check"><input type="checkbox" id="f_is_published" ${!data || data?.is_published ? 'checked' : ''} /><label for="f_is_published">Published</label></div>
          </div>
        </div>`
    },
    gallery: {
      title: `${prefix} Gallery Photo`,
      html: `
        <div class="form-group"><label>Image ${data ? '(upload new to replace)' : '*'}</label>
            ${data?.image_url ? `
            <img src="${data.image_url}" style="max-width:100%;max-height:160px;border-radius:8px;margin-bottom:8px;object-fit:cover" />
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <label class="btn-edit btn-sm" style="cursor:pointer">🔄 Replace<input type="file" accept="image/*" id="f_image_file" style="display:none" /></label>
              <button type="button" class="btn-danger btn-sm" onclick="clearModalImage('f_image_url','f_img_preview_gallery')">🗑 Remove</button>
            </div>
            <div id="f_img_preview_gallery"></div>
          ` : `<input type="file" id="f_image_file" accept="image/*" />`}
              <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
        </div>
        <div class="form-row">
          <div class="form-group"><label>Title</label><input type="text" id="f_title" value="${esc(data?.title)}" /></div>
          <div class="form-group"><label>Album</label><input type="text" id="f_album" value="${esc(data?.album) || 'General'}" /></div>
        </div>
        <div class="form-group"><label>Caption</label><input type="text" id="f_caption" value="${esc(data?.caption)}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Display Order</label><input type="number" id="f_display_order" value="${data?.display_order || 0}" /></div>
          <div class="form-group" style="justify-content:flex-end;padding-top:24px">
            <div class="form-check"><input type="checkbox" id="f_is_published" ${!data || data?.is_published ? 'checked' : ''} /><label for="f_is_published">Published</label></div>
          </div>
        </div>`,
    },
    pastor: {
      title: `${prefix} Pastor`,
      html: `
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" id="f_name" value="${esc(data?.name)}" /></div>
          <div class="form-group"><label>Title *</label><input type="text" id="f_title" value="${esc(data?.title)}" placeholder="e.g. Lead Pastor" /></div>
        </div>
        <div class="form-group"><label>Bio</label><textarea id="f_bio" rows="4">${esc(data?.bio)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input type="email" id="f_email" value="${esc(data?.email)}" /></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="f_phone" value="${esc(data?.phone)}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Photo</label>
            ${data?.image_url ? `<img src="${data.image_url}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #b89240;margin-bottom:6px" />` : ''}
            <input type="file" id="f_image_file" accept="image/*" />
            <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
          </div>
          <div class="form-group"><label>Display Order</label><input type="number" id="f_display_order" value="${data?.display_order || 0}" /></div>
        </div>
        <div class="form-check"><input type="checkbox" id="f_is_active" ${!data || data?.is_active !== false ? 'checked' : ''} /><label for="f_is_active">Active / Visible on website</label></div>`
    },
    ministry: {
  title: `${prefix} Ministry`,
  html: `
  <div class="form-row">
    <div class="form-group"><label>Ministry Name *</label><input type="text" id="f_name" value="${esc(data?.name)}" /></div>
    <div class="form-group"><label>Category</label><select id="f_category">
      <option value="youth" ${sel(data?.category,'youth')}>Youth</option>
      <option value="women" ${sel(data?.category,'women')}>Women</option>
      <option value="men" ${sel(data?.category,'men')}>Men</option>
      <option value="children" ${sel(data?.category,'children')}>Children</option>
      <option value="music" ${sel(data?.category,'music')}>Music & Worship</option>
      <option value="outreach" ${sel(data?.category,'outreach')}>Outreach</option>
      <option value="prayer" ${sel(data?.category,'prayer')}>Prayer</option>
      <option value="general" ${sel(data?.category,'general')}>General</option>
    </select></div>
  </div>
  <div class="form-group"><label>Description</label><textarea id="f_description" rows="3">${esc(data?.description)}</textarea></div>
  <div class="form-row">
    <div class="form-group"><label>Leader Name</label><input type="text" id="f_leader_name" value="${esc(data?.leader_name)}" /></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label>Meeting Schedule</label><input type="text" id="f_meeting_schedule" value="${esc(data?.meeting_schedule)}" /></div>
    <div class="form-group"><label>Display Order</label><input type="number" id="f_display_order" value="${data?.display_order || 0}" /></div>
  </div>

  <div class="form-group">
    <label>Card Media — choose one option</label>
    <div style="font-size:0.8rem;color:#888;margin-bottom:12px">
      This image or video fills the ministry card background on the public site.
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      <div class="form-check">
        <input type="radio" name="media_source" id="ms_none" value="none"
          ${!data?.media_url ? 'checked' : ''} onchange="toggleMinistryMedia()" />
        <label for="ms_none">No media — use gradient placeholder</label>
      </div>
      <div class="form-check">
        <input type="radio" name="media_source" id="ms_url" value="url"
          ${data?.media_url && data?.media_type === 'url' ? 'checked' : ''} onchange="toggleMinistryMedia()" />
        <label for="ms_url">Paste a URL (direct image link or YouTube link)</label>
      </div>
      <div class="form-check">
        <input type="radio" name="media_source" id="ms_upload" value="upload"
          ${data?.media_url && data?.media_type !== 'url' ? 'checked' : ''} onchange="toggleMinistryMedia()" />
        <label for="ms_upload">Upload from device (image JPG/PNG or video MP4, max 50MB)</label>
      </div>
    </div>

    <div id="ms_url_wrap" style="display:none">
      <input type="url" id="f_media_url_input"
        value="${esc(data?.media_type === 'url' ? data.media_url : '')}"
        placeholder="https://example.com/image.jpg  or  https://youtube.com/watch?v=..." />
      <div style="font-size:0.75rem;color:#888;margin-top:4px">
        Paste a direct image URL or a YouTube video link. Google image links will NOT work — right-click an image and copy image address instead.
      </div>
    </div>

    <div id="ms_upload_wrap" style="display:none">
      ${data?.media_url && data?.media_type !== 'url' ? `
        <div style="margin-bottom:12px;padding:12px;background:#f8f6f2;border-radius:8px">
          <div style="font-size:0.8rem;color:#666;margin-bottom:8px">Current media:</div>
          ${data.media_type === 'video'
            ? `<video src="${data.media_url}" controls style="max-width:100%;max-height:120px;border-radius:6px;display:block"></video>`
            : `<img src="${data.media_url}" style="max-height:100px;border-radius:6px;object-fit:cover;display:block" />`}
          <button type="button" class="btn-danger btn-sm" style="margin-top:8px"
            onclick="deleteMinistryMedia('${data?.media_public_id}','${data?.media_type}')">
            Delete this media
          </button>
        </div>` : ''}
      <input type="file" id="f_media_file" accept="image/*,video/*" />
    </div>

    <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
    <input type="hidden" id="f_media_url" value="${esc(data?.media_url)}" />
    <input type="hidden" id="f_media_public_id" value="${esc(data?.media_public_id)}" />
    <input type="hidden" id="f_media_type" value="${esc(data?.media_type || 'image')}" />
  </div>

  <div class="form-check"><input type="checkbox" id="f_is_active" ${!data || data?.is_active !== false ? 'checked' : ''} /><label for="f_is_active">Active</label></div>`
},
    servicetime: {
      title: `${prefix} Service Time`,
      html: `
        <div class="form-row">
          <div class="form-group"><label>Day of Week *</label><select id="f_day_of_week">
            ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d =>
              `<option value="${d}" ${sel(data?.day_of_week,d)}>${d}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Service Name *</label><input type="text" id="f_service_name" value="${esc(data?.service_name)}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start Time *</label><input type="time" id="f_start_time" value="${data?.start_time || ''}" /></div>
          <div class="form-group"><label>End Time</label><input type="time" id="f_end_time" value="${data?.end_time || ''}" /></div>
        </div>
        <div class="form-group"><label>Location Detail</label><input type="text" id="f_location_detail" value="${esc(data?.location_detail)}" /></div>
        <div class="form-group"><label>Description</label><textarea id="f_description" rows="2">${esc(data?.description)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Display Order</label><input type="number" id="f_display_order" value="${data?.display_order || 0}" /></div>
          <div class="form-group" style="justify-content:flex-end;padding-top:24px">
            <div class="form-check"><input type="checkbox" id="f_is_active" ${!data || data?.is_active !== false ? 'checked' : ''} /><label for="f_is_active">Active</label></div>
          </div>
        </div>`
    },
    member: {
      title: `${prefix} Member`,
      html: `
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" id="f_full_name" value="${esc(data?.full_name)}" /></div>
          <div class="form-group"><label>Primary Group *</label><select id="f_primary_group">
            <option value="">Select group</option>
            <option value="Men" ${sel(data?.primary_group,'Men')}>Men</option>
            <option value="Women" ${sel(data?.primary_group,'Women')}>Women</option>
            <option value="Youth" ${sel(data?.primary_group,'Youth')}>Youth</option>
            <option value="Children" ${sel(data?.primary_group,'Children')}>Children</option>
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="tel" id="f_phone" value="${esc(data?.phone)}" /></div>
          <div class="form-group"><label>Email</label><input type="email" id="f_email" value="${esc(data?.email)}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Gender</label><select id="f_gender">
            <option value="">Select</option>
            <option value="Male" ${sel(data?.gender,'Male')}>Male</option>
            <option value="Female" ${sel(data?.gender,'Female')}>Female</option>
          </select></div>
          <div class="form-group"><label>Date of Birth</label><input type="date" id="f_date_of_birth" value="${data?.date_of_birth ? data.date_of_birth.slice(0,10) : ''}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Marital Status</label><select id="f_marital_status">
            <option value="">Select</option>
            <option value="Single" ${sel(data?.marital_status,'Single')}>Single</option>
            <option value="Married" ${sel(data?.marital_status,'Married')}>Married</option>
            <option value="Widowed" ${sel(data?.marital_status,'Widowed')}>Widowed</option>
            <option value="Divorced" ${sel(data?.marital_status,'Divorced')}>Divorced</option>
          </select></div>
          <div class="form-group"><label>Membership Status</label><select id="f_membership_status">
            <option value="new" ${sel(data?.membership_status,'new')}>New</option>
            <option value="regular" ${sel(data?.membership_status,'regular')}>Regular</option>
            <option value="worker" ${sel(data?.membership_status,'worker')}>Worker</option>
            <option value="leader" ${sel(data?.membership_status,'leader')}>Leader</option>
            <option value="inactive" ${sel(data?.membership_status,'inactive')}>Inactive</option>
          </select></div>
        </div>
        <div class="form-group"><label>Occupation</label><input type="text" id="f_occupation" value="${esc(data?.occupation)}" /></div>
        <div class="form-group"><label>Address</label><input type="text" id="f_address" value="${esc(data?.address)}" /></div>
        <div class="form-row">
          <div class="form-group"><label>Baptism Date</label><input type="date" id="f_baptism_date" value="${data?.baptism_date ? data.baptism_date.slice(0,10) : ''}" /></div>
          <div class="form-group"><label>Join Date</label><input type="date" id="f_join_date" value="${data?.join_date ? data.join_date.slice(0,10) : new Date().toISOString().slice(0,10)}" /></div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="f_notes" rows="3">${esc(data?.notes)}</textarea></div>
        <div class="form-group"><label>Profile Photo</label>
          ${data?.image_url ? `<img src="${data.image_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #b89240;margin-bottom:8px;display:block" />` : ''}
          <input type="file" id="f_image_file" accept="image/*" />
          <input type="hidden" id="f_image_url" value="${esc(data?.image_url)}" />
          <input type="hidden" id="f_cloudinary_public_id" value="${esc(data?.cloudinary_public_id)}" />
        </div>`
    },
    group: {
      title: `${prefix} Group`,
      html: `
        <div class="form-group"><label>Group Name *</label><input type="text" id="f_name" value="${esc(data?.name)}" placeholder="e.g. Choir, Ushers, Deacons" /></div>
        <div class="form-group"><label>Description</label><textarea id="f_description" rows="3" placeholder="What is this group for?">${esc(data?.description)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="f_category">
            <option value="custom" ${sel(data?.category,'custom')}>Custom</option>
            <option value="choir" ${sel(data?.category,'choir')}>Choir</option>
            <option value="ushers" ${sel(data?.category,'ushers')}>Ushers</option>
            <option value="leadership" ${sel(data?.category,'leadership')}>Leadership</option>
            <option value="prayer" ${sel(data?.category,'prayer')}>Prayer Team</option>
          </select></div>
          <div class="form-group"><label>Color</label><input type="color" id="f_color" value="${data?.color || '#143d6f'}" /></div>
        </div>`
    },
    admin: {
      title: 'Create New Admin',
      html: `
        <div class="info-card" style="margin-bottom:20px">Only superadmins can create new admin accounts.</div>
        <div class="form-group"><label>Full Name *</label><input type="text" id="f_name" /></div>
        <div class="form-group"><label>Email *</label><input type="email" id="f_email" /></div>
        <div class="form-group"><label>Temporary Password *</label><input type="password" id="f_password" /></div>
        <div class="form-group"><label>Role</label><select id="f_role">
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select></div>`
    }
  };

  const form = forms[type];
  if (!form) return;
  modalTitle.textContent = form.title;
  modalBody.innerHTML = form.html + `
    <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e0e4f0">
      <button class="btn-danger" onclick="closeModalNow()">Cancel</button>
      <button class="btn-save" onclick="saveItem()">💾 ${isEdit ? 'Update' : 'Save'}</button>
    </div>`;

  if (form.afterInsert) form.afterInsert();
  overlay.classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalNow();
}
function closeModalNow() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null; editingType = null;
  lockedSeriesName = null;
}

function esc(val) { return val ? String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;') : ''; }
function sel(current, val) { return String(current) === String(val) ? 'selected' : ''; }
function gv(id) { const el = document.getElementById(id); return el ? el.value : null; }
function gc(id) { const el = document.getElementById(id); return el ? el.checked : false; }

// ============================================================
// SAVE ITEM
// ============================================================
async function saveItem() {
  if (isSaving) return;
  isSaving = true;
  const saveBtn = document.querySelector('#modal .btn-save');
  const originalBtnText = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '💾 Saving...'; }

  const type = editingType;
  const id = editingId;

  const builders = {
    announcement: () => ({
      endpoint: `/announcements${id ? '/' + id : ''}`,
      body: { title: gv('f_title'), body: gv('f_body'), category: gv('f_category'), image_url: gv('f_image_url') || null, cloudinary_public_id: gv('f_cloudinary_public_id') || null, video_url: gv('f_video_url') || null, is_pinned: gc('f_is_pinned'), is_published: gc('f_is_published'), expires_at: gv('f_expires_at') || null }
    }),
    event: () => ({
      endpoint: `/events${id ? '/' + id : ''}`,
      body: { title: gv('f_title'), description: gv('f_description'), event_date: gv('f_event_date'), end_date: gv('f_end_date') || null, start_time: gv('f_start_time') || null, end_time: gv('f_end_time') || null, location: gv('f_location'), image_url: gv('f_image_url') || null, cloudinary_public_id: gv('f_cloudinary_public_id') || null, video_url: gv('f_video_url') || null, category: gv('f_category'), is_featured: gc('f_is_featured'), is_published: gc('f_is_published'), registration_link: gv('f_registration_link') || null }
    }),
    sermon: () => ({
      endpoint: `/sermons${id ? '/' + id : ''}`,
      body: { title: gv('f_title'), pastor_id: gv('f_pastor_id') || null, sermon_date: gv('f_sermon_date'), scripture_reference: gv('f_scripture_reference'), series_name: getSeriesNameValue(), description: gv('f_description'), audio_url: gv('f_audio_url') || null, video_url: gv('f_video_url') || null, thumbnail_url: gv('f_thumbnail_url') || null, duration_minutes: gv('f_duration_minutes') || null, is_published: gc('f_is_published') },
      isMultipart: true
    }),
    gallery: () => ({
      endpoint: `/gallery${id ? '/' + id : ''}`,
      body: { image_url: gv('f_image_url'), title: gv('f_title'), album: gv('f_album') || 'General', caption: gv('f_caption'), display_order: parseInt(gv('f_display_order') || 0), is_published: gc('f_is_published') }
    }),
    pastor: () => ({
      endpoint: `/pastors${id ? '/' + id : ''}`,
      body: { name: gv('f_name'), title: gv('f_title'), bio: gv('f_bio'), email: gv('f_email'), phone: gv('f_phone'), image_url: gv('f_image_url') || null, display_order: parseInt(gv('f_display_order') || 0), is_active: gc('f_is_active') }
    }),
    ministry: () => ({
  endpoint: `/ministries${id ? '/' + id : ''}`,
  body: { name: gv('f_name'), description: gv('f_description'), category: gv('f_category'), leader_name: gv('f_leader_name'), meeting_schedule: gv('f_meeting_schedule'), image_url: gv('f_image_url') || null, display_order: parseInt(gv('f_display_order') || 0), is_active: gc('f_is_active') }
  }),
    servicetime: () => ({
      endpoint: id ? `/settings/service-times/${id}` : '/settings/service-times',
      body: { day_of_week: gv('f_day_of_week'), service_name: gv('f_service_name'), start_time: gv('f_start_time'), end_time: gv('f_end_time') || null, location_detail: gv('f_location_detail'), description: gv('f_description'), display_order: parseInt(gv('f_display_order') || 0), is_active: gc('f_is_active') }
    }),
    member: () => ({
      endpoint: `/members${id ? '/' + id : ''}`,
      body: { full_name: gv('f_full_name'), email: gv('f_email') || null, phone: gv('f_phone') || null, date_of_birth: gv('f_date_of_birth') || null, gender: gv('f_gender') || null, address: gv('f_address') || null, occupation: gv('f_occupation') || null, marital_status: gv('f_marital_status') || null, membership_status: gv('f_membership_status') || 'regular', primary_group: gv('f_primary_group') || null, baptism_date: gv('f_baptism_date') || null, join_date: gv('f_join_date') || null, notes: gv('f_notes') || null, image_url: gv('f_image_url') || null, cloudinary_public_id: gv('f_cloudinary_public_id') || null }
    }),
    group: () => ({
      endpoint: `/groups${id ? '/' + id : ''}`,
      body: { name: gv('f_name'), description: gv('f_description'), category: gv('f_category'), color: gv('f_color') }
    }),
    admin: () => ({
      endpoint: '/auth/create-admin',
      body: { name: gv('f_name'), email: gv('f_email'), password: gv('f_password'), role: gv('f_role') }
    })
  };

  if (!builders[type]) return;
  const built = builders[type]();
  const endpoint = built.endpoint;
  const body = built.body;

  // Handle image file upload if present (skip member — handled via multipart below)
  // Handle image file upload if present (skip member + sermon — handled via multipart below)
  if (type !== 'member' && type !== 'sermon') {
    const fileInput = document.getElementById('f_image_file');
    if (fileInput && fileInput.files[0]) {
      showToast('⬆️ Uploading image...', 'info');
      const folderMap = { announcement: 'lighthouse/announcements', event: 'lighthouse/events', pastor: 'lighthouse/pastors', ministry: 'lighthouse/ministries', gallery: 'lighthouse/gallery' };
      const uploaded = await uploadImage(fileInput, folderMap[type] || 'lighthouse/images');
      if (!uploaded) return;
      body.image_url = uploaded.url;
      body.cloudinary_public_id = uploaded.public_id;
    }
  }

  // Handle ministry media upload
if (type === 'ministry') {
  const mediaSource = document.querySelector('input[name="media_source"]:checked')?.value;
  if (mediaSource === 'url') {
    body.media_url = document.getElementById('f_media_url_input')?.value?.trim() || null;
    body.media_type = 'url';
    body.media_public_id = null;
  } else if (mediaSource === 'upload') {
    const mediaFile = document.getElementById('f_media_file');
    if (mediaFile && mediaFile.files[0]) {
      const file = mediaFile.files[0];
      // Size guard
      if (file.size > 50 * 1024 * 1024) {
        showToast('❌ File too large. Max 50MB for videos, 10MB for images.', 'error'); return;
      }
      const isVideo = file.type.startsWith('video/');
      showToast(`⬆️ Uploading ${isVideo ? 'video' : 'image'}...`, 'info');
      const formData = new FormData();
      formData.append(isVideo ? 'video' : 'image', file);
      formData.append('folder', 'lighthouse/ministries');
      const endpoint = isVideo ? `${API}/upload/video` : `${API}/upload/image`;
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${TOKEN}` },
          body: formData
        });
        const uploadData = await r.json();
        if (!r.ok) throw new Error(uploadData.error || 'Upload failed');
        body.media_url = uploadData.url;
        body.media_public_id = uploadData.public_id;
        body.media_type = isVideo ? 'video' : 'image';
      } catch (err) {
        showToast('❌ Media upload failed: ' + err.message, 'error'); return;
      }
    }
  } else {
    // none selected — clear media
    body.media_url = null;
    body.media_public_id = null;
    body.media_type = 'image';
  }
}

  const method = id ? 'PUT' : 'POST';
  let res;
  if (type === 'sermon') {
    const audioFile = document.getElementById('f_audio_file');
    const videoFile = document.getElementById('f_video_file');
    const thumbFile = document.getElementById('f_thumbnail_file');
    const hasFiles = audioFile?.files[0] || videoFile?.files[0] || thumbFile?.files[0];
    if (hasFiles) showToast('⬆️ Uploading sermon files... this may take a moment', 'info');
    const formData = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== null && v !== undefined) formData.append(k, v); });
    if (audioFile?.files[0]) formData.append('audio', audioFile.files[0]);
    if (videoFile?.files[0]) formData.append('video', videoFile.files[0]);
    if (thumbFile?.files[0]) formData.append('thumbnail', thumbFile.files[0]);
    try {
      const r = await fetch(`${API}${endpoint}`, { method, headers: { 'Authorization': `Bearer ${TOKEN}` }, body: formData });
      const text = await r.text();
      res = text ? JSON.parse(text) : { message: 'ok' };
    } catch (err) { res = { error: 'Cannot connect to server.' }; }
  } else if (type === 'member') {    const formData = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== null && v !== undefined) formData.append(k, v); });
    const fileInput = document.getElementById('f_image_file');
    if (fileInput && fileInput.files[0]) formData.append('image', fileInput.files[0]);
    try {
      const r = await fetch(`${API}${endpoint}`, { method, headers: { 'Authorization': `Bearer ${TOKEN}` }, body: formData });
      const text = await r.text();
      res = text ? JSON.parse(text) : { message: 'ok' };
    } catch (err) { res = { error: 'Cannot connect to server.' }; }
  } else {
    res = await api(method, endpoint, body);
  }

  if (res && !res.error) {
    showToast(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} ${id ? 'updated' : 'created'}!`, 'success');
    closeModalNow();
    const reloaders = {
      announcement: loadAnnouncements, event: loadEvents, sermon: loadSermons,
      gallery: loadGallery, pastor: () => { loadPastors(); loadPastorsList(); },
      ministry: loadMinistries, servicetime: loadServiceTimes,
      member: loadMembers, group: loadGroups, admin: loadAdmins
    };
    if (reloaders[type]) reloaders[type]();
  } else {
    showToast(res?.error || '❌ Failed to save. Check required fields.', 'error');
  }
  isSaving = false;
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalBtnText; }
}

// ============================================================
// EDIT ITEM
// ============================================================
async function editItem(type, id) {
  let data;
  if (type === 'servicetime') {
    const list = await api('GET', '/settings/service-times');
    data = list?.find(s => s.id === id);
  } else if (type === 'ministry') {
    const list = await api('GET', '/ministries/all');
    data = list?.find(m => m.id === id);
  } else if (type === 'gallery') {
    const list = await api('GET', '/gallery');
    data = list?.find(g => g.id === id);
  } else if (type === 'member') {
    data = await api('GET', `/members/${id}`);
  } else if (type === 'group') {
    data = allGroups.find(g => g.id === id);
  } else {
    const endpoints = { announcement: `/announcements/${id}`, event: `/events/${id}`, sermon: `/sermons/${id}`, pastor: `/pastors/${id}` };
    if (endpoints[type]) data = await api('GET', endpoints[type]);
  }
  if (!data) { showToast('Could not load item for editing', 'error'); return; }
  openModal(type, data);
}

// ============================================================
// DELETE ITEM
// ============================================================
async function deleteItem(type, id) {
  const labels = {
    announcement: { icon: '📢', title: 'Delete Announcement', msg: 'This announcement will be permanently removed.' },
    event: { icon: '📅', title: 'Delete Event', msg: 'This event and its registration form will be permanently removed.' },
    sermon: { icon: '🎙️', title: 'Delete Sermon', msg: 'This sermon will be permanently removed.' },
    gallery: { icon: '📸', title: 'Delete Photo', msg: 'This photo will be permanently removed from the gallery.' },
    pastor: { icon: '👤', title: 'Delete Pastor', msg: 'This pastor profile will be permanently removed.' },
    ministry: { icon: '⛪', title: 'Delete Ministry', msg: 'This ministry will be permanently removed.' },
    servicetime: { icon: '🕐', title: 'Delete Service Time', msg: 'This service time will be permanently removed.' },
    prayer: { icon: '🙏', title: 'Delete Prayer Request', msg: 'This prayer request will be permanently removed.' },
    messages: { icon: '✉️', title: 'Delete Message', msg: 'This message will be permanently removed.' },
    member: { icon: '👥', title: 'Delete Member', msg: 'This member record will be permanently deleted. This cannot be undone.' },
    group: { icon: '🏷️', title: 'Delete Group', msg: 'This group will be deleted and all member assignments removed.' }
  };
  const l = labels[type] || { icon: '⚠️', title: 'Delete', msg: 'This item will be permanently removed.' };
  showConfirm({
    icon: l.icon, title: l.title, message: l.msg,
    confirmText: 'Yes, Delete', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const endpoints = {
        announcement: `/announcements/${id}`, event: `/events/${id}`, sermon: `/sermons/${id}`,
        gallery: `/gallery/${id}`, pastor: `/pastors/${id}`, ministry: `/ministries/${id}`,
        servicetime: `/settings/service-times/${id}`, prayer: `/prayer/${id}`,
        messages: `/contact/${id}`, member: `/members/${id}`, group: `/groups/${id}`
      };
      const res = await api('DELETE', endpoints[type]);
      if (res?.message) {
        showToast('🗑️ Deleted successfully', 'success');
        const panelMap = {
          announcement: 'announcements', event: 'events', sermon: 'sermons', gallery: 'gallery',
          pastor: 'pastors', ministry: 'ministries', servicetime: 'servicetimes',
          prayer: 'prayer', messages: 'messages', member: 'members', group: 'groups'
        };
        loadPanel(panelMap[type] || type);
      } else {
        showToast(res?.error || '❌ Could not delete item', 'error');
      }
    }
  });
}

function toggleMinistryMedia() {
  const val = document.querySelector('input[name="media_source"]:checked')?.value;
  document.getElementById('ms_url_wrap').style.display = val === 'url' ? 'block' : 'none';
  document.getElementById('ms_upload_wrap').style.display = val === 'upload' ? 'block' : 'none';
}

async function deleteMinistryMedia(publicId, mediaType) {
  if (!publicId) return;
  showConfirm({
    icon: '🎬', title: 'Delete Media',
    message: 'Remove this media file from this ministry?',
    confirmText: 'Delete', confirmClass: 'confirm-btn-danger',
    onConfirm: async () => {
      const rtype = mediaType === 'video' ? 'video' : 'image';
      await api('DELETE', `/upload/${rtype}`, { public_id: publicId });
      document.getElementById('f_media_url').value = '';
      document.getElementById('f_media_public_id').value = '';
      document.getElementById('f_media_type').value = 'image';
      document.getElementById('ms_upload_wrap').innerHTML =
        '<input type="file" id="f_media_file" accept="image/*,video/*" />';
      showToast('Media deleted', 'info');
    }
  });
}