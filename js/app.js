// ============================================================
// LIGHTHOUSE CHURCH – MAIN APP JAVASCRIPT
// ============================================================

const API = CONFIG.API_BASE_URL;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function truncate(str, n) {
  return str && str.length > n ? str.substring(0, n) + '...' : str;
}

async function apiFetch(endpoint) {
  try {
    const res = await fetch(`${API}${endpoint}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${endpoint}:`, err);
    return null;
  }
}

function ministryIcon(category) {
  const icons = { youth: '🔥', women: '💜', men: '🛡️', children: '🌟', music: '🎵', outreach: '🌍', prayer: '🙏' };
  return icons[category] || '⛪';
}

// ============================================================
// NAVBAR
// ============================================================
const navbar = $('#navbar');
const navToggle = $('#navToggle');
const navLinks = $('#navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  const st = $('#scrollTop');
  if (st) st.classList.toggle('visible', window.scrollY > 400);
});

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  navToggle.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

const scrollTopBtn = $('#scrollTop');
if (scrollTopBtn) scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

const footerYear = $('#footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// ============================================================
// LIVE VIDEO BANNER
// ============================================================
function showLiveBanner(url) {
  if (!url || !url.trim()) return;

  let embedUrl = null;
  let openUrl = url;
  let platformLabel = 'Watch Live';

  const ytWatch = url.match(/youtube\.com\/watch\?v=([^&\s]+)/);
  const ytLive  = url.match(/youtube\.com\/live\/([^?&\s]+)/);
  const ytShort = url.match(/youtu\.be\/([^?&\s]+)/);
  const ytEmbed = url.match(/youtube\.com\/embed\/([^?&\s]+)/);

  if (ytWatch)      { embedUrl = `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1`; platformLabel = '▶ Watch on YouTube'; }
  else if (ytLive)  { embedUrl = `https://www.youtube.com/embed/${ytLive[1]}?autoplay=1`;  platformLabel = '▶ Watch on YouTube'; }
  else if (ytShort) { embedUrl = `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1`; platformLabel = '▶ Watch on YouTube'; }
  else if (ytEmbed) { embedUrl = url; platformLabel = '▶ Watch on YouTube'; }
  else if (url.includes('facebook.com') || url.includes('fb.watch')) {
    embedUrl = null; platformLabel = '▶ Watch on Facebook';
  }
  else if (url.includes('instagram.com')) {
    embedUrl = null; platformLabel = '▶ Watch on Instagram';
  }
  else {
    embedUrl = url; platformLabel = '▶ Watch Live';
  }

  window._liveEmbedUrl = embedUrl;
  window._liveOpenUrl  = openUrl;
  window._livePlatformLabel = platformLabel;

  const bar = document.createElement('div');
  bar.id = 'livePulseBar';
  bar.innerHTML = `
    <div class="live-pulse-dot"></div>
    <span class="live-bar-label">LIVE</span>
    <span class="live-pulse-text">We're live right now — join the service!</span>
    <button class="live-watch-btn" onclick="openLiveModal()">▶ Watch Live</button>
    <button class="live-bar-close" onclick="dismissLiveBar()" title="Dismiss">✕</button>
  `;
  document.body.insertBefore(bar, document.body.firstChild);

  const modal = document.createElement('div');
  modal.id = 'liveModal';
  modal.innerHTML = `
    <div class="live-modal-backdrop" onclick="closeLiveModal()"></div>
    <div class="live-modal-box">
      <div class="live-modal-header">
        <div class="live-modal-title">
          <div class="live-pulse-dot"></div>
          <span>Live Service — Lighthouse Church</span>
        </div>
        <button class="live-modal-close" onclick="closeLiveModal()" title="Close">✕</button>
      </div>
      <div class="live-modal-video" id="liveVideoWrapper">
        <iframe id="liveIframe" src="" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>
      <div class="live-modal-fallback" id="liveFallback">
        <p>This stream can't be embedded — click below to watch it directly.</p>
        <a id="liveOpenTabBtn" href="${openUrl}" target="_blank" rel="noopener" class="live-open-tab-btn">
          ${platformLabel} ↗
        </a>
      </div>
      <div class="live-modal-footer">Join us live · Lighthouse Church — The Quodesh Family Church 🙏</div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openLiveModal() {
  const modal   = document.getElementById('liveModal');
  const iframe  = document.getElementById('liveIframe');
  const wrapper = document.getElementById('liveVideoWrapper');
  const fallback = document.getElementById('liveFallback');
  if (!modal) return;

  if (window._liveEmbedUrl) {
    iframe.src = window._liveEmbedUrl;
    if (wrapper)  wrapper.style.display = '';
    if (fallback) fallback.classList.remove('visible');
  } else {
    if (wrapper)  wrapper.style.display = 'none';
    if (fallback) fallback.classList.add('visible');
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const bar = document.getElementById('livePulseBar');
  if (!bar && window._liveOpenUrl) {
    const newBar = document.createElement('div');
    newBar.id = 'livePulseBar';
    newBar.innerHTML = `
      <div class="live-pulse-dot"></div>
      <span class="live-bar-label">LIVE</span>
      <span class="live-pulse-text">We're live right now — join the service!</span>
      <button class="live-watch-btn" onclick="openLiveModal()">▶ Watch Live</button>
      <button class="live-bar-close" onclick="dismissLiveBar()" title="Dismiss">✕</button>
    `;
    document.body.insertBefore(newBar, document.body.firstChild);
  }
}

function closeLiveModal() {
  const modal  = document.getElementById('liveModal');
  const iframe = document.getElementById('liveIframe');
  if (modal)  modal.classList.remove('open');
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
}

function dismissLiveBar() {
  const bar = document.getElementById('livePulseBar');
  if (bar) bar.remove();
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.style.top = '0';
}

// ============================================================
// HERO PHOTO
// ============================================================
function applyHeroPhoto(settings) {
  if (!settings.hero_image_url || !settings.hero_image_url.trim()) return;
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  bg.style.backgroundImage = `url('${settings.hero_image_url}')`;
  bg.classList.add('has-photo');
}

// ============================================================
// PLAN YOUR VISIT BANNER
// ============================================================
function loadVisitBanner(settings) {
  const section = document.getElementById('visit');
  const bg = document.getElementById('visitBg');
  if (!section || !bg) return;

  if (!settings.visit_image_url || !settings.visit_image_url.trim()) {
    section.style.display = 'none';
    return;
  }

  bg.style.backgroundImage = `url('${settings.visit_image_url}')`;
  section.style.display = 'flex';
}

// ============================================================
// CHURCH LIFE MOSAIC
// ============================================================
function loadChurchLife(settings) {
  const section = document.getElementById('churchLife');
  const grid = document.getElementById('churchLifeGrid');
  if (!section || !grid) return;

  const slots = [
    settings.life_image_1_url,
    settings.life_image_2_url,
    settings.life_image_3_url,
    settings.life_image_4_url,
  ].filter(u => u && u.trim());

  if (!slots.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const cells = [0,1,2,3].map(i => slots[i % slots.length]);

  grid.innerHTML = cells.map(url => `
    <div class="life-cell">
      <img src="${url}" alt="Life at Lighthouse Chapel" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=\\'life-placeholder\\'><span>📸</span></div>'" />
      <div class="life-cell-overlay"></div>
    </div>
  `).join('');
}

// ============================================================
// YEAR MOTTO
// ============================================================
function loadMotto(settings) {
  const section = document.getElementById('motto');
  const img = document.getElementById('mottoImage');
  const scripture = document.getElementById('mottoScripture');
  if (!section) return;

  if (!settings.motto_image_url || !settings.motto_image_url.trim()) {
    section.style.display = 'none';
    return;
  }

  img.src = settings.motto_image_url;
  img.alt = settings.motto_title || 'Year Motto';
  section.style.display = 'block';

  if (settings.motto_scripture && settings.motto_scripture.trim()) {
    scripture.textContent = settings.motto_scripture;
    scripture.style.display = 'block';
  } else {
    scripture.style.display = 'none';
  }

  const frame = section.querySelector('.motto-frame');
  if (!frame) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { frame.classList.add('motto-visible'); obs.disconnect(); } });
  }, { threshold: 0.15 });
  obs.observe(frame);
}

// ============================================================
// CHURCH SETTINGS
// ============================================================
async function loadSettings() {
  const settings = await apiFetch('/settings');
  if (!settings) return;

  if (settings.about_text) { const el = $('#aboutText'); if(el) el.textContent = settings.about_text; }
  if (settings.vision_text) { const el = $('#visionText'); if(el) el.textContent = settings.vision_text; }
  if (settings.mission_text) { const el = $('#missionText'); if(el) el.textContent = settings.mission_text; }

  if (settings.tagline) {
    const el = $('#heroTagline');
    if (el) el.textContent = settings.tagline;
    document.title = `${settings.church_name || 'Lighthouse Church'} | ${settings.tagline}`;
  }

  if (settings.address) { const el = $('#churchAddress'); if(el) el.textContent = settings.address; }
  if (settings.phone) { const el = $('#churchPhone'); if(el) el.textContent = settings.phone; }
  if (settings.email) {
    const el = $('#churchEmail');
    if (el) el.innerHTML = `<a href="mailto:${settings.email}" style="color:var(--navy-mid)">${settings.email}</a>`;
  }

  if (settings.google_maps_embed) {
    const mapEl = $('#mapEmbed');
    if (mapEl && (settings.google_maps_embed.includes('google.com/maps') || settings.google_maps_embed.includes('maps.google'))) {
      mapEl.src = settings.google_maps_embed;
    }
  }

  // Social links
  const socialContainer = $('#socialLinks');
  const footerSocial = $('#footerSocial');
  const socials = [
    { key: 'facebook_url', label: '📘 Facebook', icon: 'Facebook' },
    { key: 'youtube_url', label: '▶️ YouTube', icon: 'YouTube' },
    { key: 'instagram_url', label: '📸 Instagram', icon: 'Instagram' },
  ];
  let socialHTML = '', footerHTML = '';
  socials.forEach(s => {
    if (settings[s.key]) {
      socialHTML += `<a href="${settings[s.key]}" class="social-link" target="_blank" rel="noopener">${s.label}</a>`;
      footerHTML += `<a href="${settings[s.key]}" class="footer-social-link" target="_blank" rel="noopener">${s.icon}</a>`;
    }
  });
  if (settings.whatsapp_number) {
    const waLink = `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`;
    socialHTML += `<a href="${waLink}" class="social-link" target="_blank" rel="noopener">💬 WhatsApp</a>`;
    footerHTML += `<a href="${waLink}" class="footer-social-link" target="_blank" rel="noopener">WhatsApp</a>`;
  }
  if (socialContainer) socialContainer.innerHTML = socialHTML;
  if (footerSocial) footerSocial.innerHTML = footerHTML;

  // New sections — called here so they run after settings are fetched
  applyHeroPhoto(settings);
  loadVisitBanner(settings);
  loadChurchLife(settings);
  loadMotto(settings);

  // Live video
  if (settings.live_video_url && settings.live_video_url.trim()) {
    showLiveBanner(settings.live_video_url.trim());
  }
}

// ============================================================
// PASTORS
// ============================================================
async function loadPastors() {
  const pastors = await apiFetch('/pastors');
  const grid = $('#pastorsGrid');
  if (!grid) return;
 
  if (!pastors || !pastors.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⛪</div><p>Leadership information coming soon.</p></div>`;
    return;
  }
 
  grid.innerHTML = pastors.map(p => `
    <div class="pastor-card" onclick="openPastorModal(${JSON.stringify(p).replace(/"/g, '&quot;')})" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter')openPastorModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">
      <img class="pastor-avatar"
        src="${p.image_url || CONFIG.DEFAULT_AVATAR}"
        alt="${p.name}"
        onerror="this.src='${CONFIG.DEFAULT_AVATAR}'"
      />
      <div class="pastor-info">
        <div class="pastor-title">${p.title}</div>
        <h4>${p.name}</h4>
        ${p.bio ? `<p>${truncate(p.bio, 120)}</p>` : ''}
        <div class="pastor-card-hint">Tap to read full bio →</div>
      </div>
    </div>
  `).join('');
}
 
 
// ============================================================
// STEP 2: Add these functions anywhere in app.js
//         (e.g. right after loadPastors)
// ============================================================
 
function openPastorModal(pastor) {
  const modal    = document.getElementById('pastorModal');
  const img      = document.getElementById('pastorModalImg');
  const imgWrap  = document.getElementById('pastorModalImgWrap');
  const name     = document.getElementById('pastorModalName');
  const title    = document.getElementById('pastorModalTitle');
  const bio      = document.getElementById('pastorModalBio');
  const contacts = document.getElementById('pastorModalContacts');
 
  const photoSrc = pastor.image_url || CONFIG.DEFAULT_AVATAR;
 
  img.src = photoSrc;
  img.alt = pastor.name;
  name.textContent = pastor.name;
  title.textContent = pastor.title || '';
  bio.textContent = pastor.bio || 'Biography coming soon.';
 
  // Contacts
  let contactHTML = '';
  if (pastor.email) {
    contactHTML += `<a href="mailto:${pastor.email}" class="pastor-modal-contact-row">
      <span class="pastor-modal-contact-icon">✉️</span>${pastor.email}
    </a>`;
  }
  if (pastor.phone) {
    contactHTML += `<a href="tel:${pastor.phone}" class="pastor-modal-contact-row">
      <span class="pastor-modal-contact-icon">📞</span>${pastor.phone}
    </a>`;
  }
  contacts.innerHTML = contactHTML;
 
  // Photo click → fullscreen
  imgWrap.onclick = (e) => {
    e.stopPropagation();
    openPastorPhoto(photoSrc, pastor.name);
  };
 
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
 
function closePastorModal(e) {
  if (e && e.target !== document.getElementById('pastorModal') && e.type !== 'click') return;
  if (e && e.currentTarget === document.getElementById('pastorModal') && e.target !== e.currentTarget) return;
  document.getElementById('pastorModal').classList.remove('open');
  document.body.style.overflow = '';
}
 
function openPastorPhoto(src, name) {
  let fs = document.getElementById('pastorPhotoFullscreen');
  if (!fs) {
    fs = document.createElement('div');
    fs.id = 'pastorPhotoFullscreen';
    fs.className = 'pastor-photo-fullscreen';
    fs.innerHTML = `
      <button class="pastor-photo-fullscreen-close" onclick="closePastorPhoto()">&times;</button>
      <img id="pastorPhotoFullImg" src="" alt="" />
    `;
    fs.addEventListener('click', (e) => { if (e.target === fs) closePastorPhoto(); });
    document.body.appendChild(fs);
  }
  document.getElementById('pastorPhotoFullImg').src = src;
  document.getElementById('pastorPhotoFullImg').alt = name || '';
  fs.classList.add('open');
}
 
function closePastorPhoto() {
  const fs = document.getElementById('pastorPhotoFullscreen');
  if (fs) fs.classList.remove('open');
}
 
// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePastorPhoto();
    document.getElementById('pastorModal')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ============================================================
// SERVICE TIMES
// ============================================================
async function loadServiceTimes() {
  const times = await apiFetch('/settings/service-times');
  const grid = $('#servicesGrid');
  if (!grid) return;

  if (!times || !times.length) {
    grid.innerHTML = `<div class="empty-state light"><p>Service times coming soon.</p></div>`;
    return;
  }

  grid.innerHTML = times.map(s => `
    <div class="service-card">
      <div class="service-day">${s.day_of_week}</div>
      <div class="service-name">${s.service_name}</div>
      <div class="service-time">${formatTime(s.start_time)}${s.end_time ? ` – ${formatTime(s.end_time)}` : ''}</div>
      ${s.location_detail ? `<div class="service-location">📍 ${s.location_detail}</div>` : ''}
      ${s.description ? `<div class="service-desc">${s.description}</div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================
async function loadAnnouncements() {
  const announcements = await apiFetch('/announcements');
  const grid = $('#announcementsGrid');
  if (!grid) return;

  if (!announcements || !announcements.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📢</div><p>No announcements at this time. Check back soon!</p></div>`;
    return;
  }

  grid.innerHTML = announcements.map(a => `
    <div class="announcement-card ${a.is_pinned ? 'pinned' : ''}">
      ${a.image_url ? `<img class="announcement-img" src="${a.image_url}" alt="${a.title}" loading="lazy" onerror="this.style.display='none'" />` : ''}
      <div class="announcement-body">
        <div class="announcement-meta">
          <span class="ann-badge ${a.category}">${a.category}</span>
          <span class="ann-date">${formatDate(a.published_at)}</span>
        </div>
        <h3 class="announcement-title">${a.title}</h3>
        <p class="announcement-text">${truncate(a.body, 200)}</p>
        ${a.is_pinned ? `<div class="ann-pin">📌 Pinned Announcement</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ============================================================
// EVENTS
// ============================================================
let allEvents = [];
async function loadEvents() {
  allEvents = await apiFetch('/events?upcoming=true') || [];
  renderEvents(allEvents);

  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      renderEvents(cat ? allEvents.filter(e => e.category === cat) : allEvents);
    });
  });
}

function formatEventDate(event) {
  const start = formatDate(event.event_date);
  if (!event.end_date || event.end_date === event.event_date) return start;
  const end = formatDate(event.end_date);
  const s = new Date(event.event_date);
  const e = new Date(event.end_date);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-GH', { month: 'long', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${start} – ${end}`;
}

async function renderEvents(events) {
  const grid = $('#eventsGrid');
  if (!grid) return;

  if (!events || !events.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><p>No upcoming events. Stay tuned!</p></div>`;
    return;
  }

  const formChecks = await Promise.all(
    events.map(e =>
      fetch(`${API}/eventforms/event/${e.id}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )
  );

  grid.innerHTML = events.map((e, i) => {
    const form = formChecks[i];
    const hasForm = form && form.is_active;
    const registerBtn = hasForm
      ? `<a href="./event-register.html?event=${e.id}" class="event-tag event-register">📋 Register →</a>`
      : e.registration_link
        ? `<a href="${e.registration_link}" class="event-tag event-register" target="_blank">Register →</a>`
        : '';

    return `
      <div class="event-card">
        ${e.image_url
          ? `<img class="event-img" src="${e.image_url}" alt="${e.title}" loading="lazy" />`
          : `<div class="event-img event-img-placeholder"><span>📅</span></div>`
        }
        <div class="event-date-band">📅 ${formatEventDate(e)}${e.start_time ? ` · ${formatTime(e.start_time)}` : ''}${e.end_time ? ` – ${formatTime(e.end_time)}` : ''}</div>
        <div class="event-body">
          <h3 class="event-title">${e.title}</h3>
          ${e.description ? `<p class="event-desc">${truncate(e.description, 140)}</p>` : ''}
          <div class="event-meta">
            ${e.location ? `<span class="event-tag">📍 ${e.location}</span>` : ''}
            ${e.category ? `<span class="event-tag">🏷 ${e.category}</span>` : ''}
            ${registerBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// MINISTRIES
// ============================================================
async function loadMinistries() {
  const ministries = await apiFetch('/ministries');
  const grid = $('#ministriesGrid');
  if (!grid) return;

  if (!ministries || !ministries.length) {
    grid.innerHTML = `<div class="empty-state light"><div class="empty-state-icon">⛪</div><p>Ministry information coming soon.</p></div>`;
    return;
  }

  grid.innerHTML = ministries.map(m => `
    <div class="ministry-card">
      ${m.image_url
        ? `<img class="ministry-img" src="${m.image_url}" alt="${m.name}" loading="lazy" onerror="this.style.display='none'" />`
        : `<div class="ministry-icon">${ministryIcon(m.category)}</div>`
      }
      <div class="ministry-name">${m.name}</div>
      <p class="ministry-desc">${truncate(m.description || '', 160)}</p>
      ${m.leader_name && m.leader_name !== 'TBA' ? `<div class="ministry-leader">👤 ${m.leader_name}</div>` : ''}
      ${m.meeting_schedule ? `<div class="ministry-schedule">🕐 ${m.meeting_schedule}</div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// SERMONS
// ============================================================
async function loadSermons() {
  const sermons = await apiFetch('/sermons');
  const grid = $('#sermonsGrid');
  if (!grid) return;

  if (!sermons || !sermons.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎙️</div><p>Sermons will be posted here after Sunday's service!</p></div>`;
    return;
  }

  grid.innerHTML = sermons.slice(0, 9).map(s => `
    <div class="sermon-card">
      ${s.thumbnail_url
        ? `<img class="sermon-thumb" src="${s.thumbnail_url}" alt="${s.title}" loading="lazy" onerror="this.style.display='none'" />`
        : `<div class="sermon-thumb-placeholder"><div class="cross">✞</div></div>`
      }
      <div class="sermon-body">
        ${s.series_name ? `<div class="sermon-series">${s.series_name}</div>` : ''}
        <div class="sermon-title">${s.title}</div>
        ${s.scripture_reference ? `<div class="sermon-scripture">${s.scripture_reference}</div>` : ''}
        ${s.pastor_name ? `<div class="sermon-pastor">By ${s.pastor_name}</div>` : ''}
        <div class="sermon-date">${formatDate(s.sermon_date)}</div>
      </div>
      ${(s.audio_url || s.video_url) ? `
        <div class="sermon-links">
          ${s.audio_url ? `<a href="${s.audio_url}" class="sermon-link audio" target="_blank" rel="noopener">🔊 Audio</a>` : ''}
          ${s.video_url ? `<a href="${s.video_url}" class="sermon-link video" target="_blank" rel="noopener">▶ Video</a>` : ''}
        </div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// GALLERY
// ============================================================
let galAllItems   = [];   // every photo from API
let galAlbums     = [];   // album names
let galActive     = '';   // current album tab ('' = All)
let galSlideItems = [];   // photos in slideshow
let galSlideIdx   = 0;
let galSlideTimer = null;
let galLightboxItems = []; // photos currently in lightbox context
let galLightboxIdx   = 0;
 
// ── LOAD ──
async function loadGallery() {
  const [items, albums] = await Promise.all([
    apiFetch('/gallery'),
    apiFetch('/gallery/albums')
  ]);
 
  galAllItems = Array.isArray(items) ? items : [];
  galAlbums   = Array.isArray(albums) ? albums : [];
 
  if (!galAllItems.length) {
    const grid = document.getElementById('galPreviewGrid');
    if (grid) grid.innerHTML = `<div class="gal-empty"><div class="gal-empty-icon">📸</div><p>Photos coming soon. Check back after our next service!</p></div>`;
    document.getElementById('galSlideshow').style.display = 'none';
    document.getElementById('galViewAllBtn').style.display = 'none';
    return;
  }
 
  buildTabs();
  renderGallery('');
 
  // Lightbox nav
  document.getElementById('lightboxPrev')?.addEventListener('click', () => galLightboxNav(-1));
  document.getElementById('lightboxNext')?.addEventListener('click', () => galLightboxNav(1));
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', e => { if (e.target === document.getElementById('lightbox')) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (document.getElementById('lightbox')?.classList.contains('active')) {
      if (e.key === 'ArrowLeft') galLightboxNav(-1);
      if (e.key === 'ArrowRight') galLightboxNav(1);
      if (e.key === 'Escape') closeLightbox();
    }
  });
}
 
// ── TABS ──
function buildTabs() {
  const container = document.getElementById('galTabs');
  if (!container) return;
  const tabs = ['All', ...galAlbums];
  container.innerHTML = tabs.map(t => `
    <button class="gal-tab ${t === 'All' ? 'active' : ''}"
      onclick="switchGalTab('${t === 'All' ? '' : t}', this)">${t}</button>
  `).join('');
}
 
function switchGalTab(album, btn) {
  galActive = album;
  document.querySelectorAll('.gal-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderGallery(album);
}
 
// ── RENDER ──
function renderGallery(album) {
  const pool = album ? galAllItems.filter(i => i.album === album) : galAllItems;
 
  // Slideshow — up to 8, shuffled
  const shuffled = shuffle([...pool]);
  galSlideItems = shuffled.slice(0, 8);
  buildSlideshow();
 
  // Preview grid — 6 items (different from slideshow if possible)
  const rest    = shuffled.slice(galSlideItems.length);
  const preview = [...rest, ...shuffled].slice(0, 6);
  buildPreviewGrid(preview, pool);
 
  // View all button count
  const countEl = document.getElementById('galViewAllCount');
  if (countEl) countEl.textContent = pool.length;
}
 
// ── SLIDESHOW ──
function buildSlideshow() {
  const container = document.getElementById('galSlides');
  const dots      = document.getElementById('galDots');
  if (!container) return;
 
  clearInterval(galSlideTimer);
  galSlideIdx = 0;
 
  if (!galSlideItems.length) {
    document.getElementById('galSlideshow').style.display = 'none';
    return;
  }
  document.getElementById('galSlideshow').style.display = 'block';
 
  container.innerHTML = galSlideItems.map((item, i) => `
    <div class="gal-slide ${i === 0 ? 'active' : ''}"
      style="background-image:url('${item.image_url}')"
      data-caption="${esc2(item.caption || item.title || '')}">
    </div>
  `).join('');
 
  dots.innerHTML = galSlideItems.map((_, i) =>
    `<button class="gal-dot ${i === 0 ? 'active' : ''}" onclick="galGoTo(${i})"></button>`
  ).join('');
 
  updateSlideCaption();
  galSlideTimer = setInterval(() => galSlide(1), 4500);
}
 
function galSlide(dir) {
  const slides = document.querySelectorAll('.gal-slide');
  const dots   = document.querySelectorAll('.gal-dot');
  if (!slides.length) return;
  slides[galSlideIdx].classList.remove('active');
  dots[galSlideIdx]?.classList.remove('active');
  galSlideIdx = (galSlideIdx + dir + slides.length) % slides.length;
  slides[galSlideIdx].classList.add('active');
  dots[galSlideIdx]?.classList.add('active');
  updateSlideCaption();
  resetSlideTimer();
}
 
function galGoTo(idx) {
  const slides = document.querySelectorAll('.gal-slide');
  const dots   = document.querySelectorAll('.gal-dot');
  if (!slides.length) return;
  slides[galSlideIdx].classList.remove('active');
  dots[galSlideIdx]?.classList.remove('active');
  galSlideIdx = idx;
  slides[galSlideIdx].classList.add('active');
  dots[galSlideIdx]?.classList.add('active');
  updateSlideCaption();
  resetSlideTimer();
}
 
function resetSlideTimer() {
  clearInterval(galSlideTimer);
  galSlideTimer = setInterval(() => galSlide(1), 4500);
}
 
function updateSlideCaption() {
  const active = document.querySelector('.gal-slide.active');
  const el     = document.getElementById('galSlideCaption');
  if (el) el.textContent = active?.dataset.caption || '';
}
 
// ── PREVIEW GRID ──
function buildPreviewGrid(items, fullPool) {
  const grid = document.getElementById('galPreviewGrid');
  if (!grid) return;
 
  if (!items.length) {
    grid.innerHTML = `<div class="gal-empty"><div class="gal-empty-icon">📸</div><p>No photos yet in this album.</p></div>`;
    return;
  }
 
  grid.innerHTML = items.map((item, i) => `
    <div class="gal-preview-item" onclick="openLightboxFromPool(${i}, ${JSON.stringify(items).replace(/"/g,'&quot;')})">
      <img src="${item.image_url}" alt="${item.title || item.caption || 'Church photo'}" loading="lazy" />
      <div class="gal-preview-item-overlay">
        <span class="gal-preview-caption">${item.caption || item.title || ''}</span>
      </div>
    </div>
  `).join('');
}
 
// ── GALLERY MODAL (View All) ──
function openGalleryModal() {
  const pool    = galActive ? galAllItems.filter(i => i.album === galActive) : galAllItems;
  const modal   = document.getElementById('galleryModal');
  const grid    = document.getElementById('galModalGrid');
  const title   = document.getElementById('galModalTitle');
  if (!modal) return;
 
  title.textContent = galActive ? `📁 ${galActive}` : 'All Photos';
  grid.innerHTML = pool.map((item, i) => `
    <div class="gal-modal-item" onclick="openLightboxFromPool(${i}, ${JSON.stringify(pool).replace(/"/g,'&quot;')})">
      <img src="${item.image_url}" alt="${item.title || ''}" loading="lazy" />
    </div>
  `).join('');
 
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
 
function closeGalleryModal() {
  document.getElementById('galleryModal')?.classList.remove('open');
  document.body.style.overflow = '';
}
 
document.getElementById('galleryModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('galleryModal')) closeGalleryModal();
});
 
// ── LIGHTBOX ──
function openLightboxFromPool(idx, pool) {
  galLightboxItems = Array.isArray(pool) ? pool : [];
  galLightboxIdx   = idx;
  showLightboxItem();
  document.getElementById('lightbox')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
 
function showLightboxItem() {
  const item = galLightboxItems[galLightboxIdx];
  if (!item) return;
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  if (img) { img.src = item.image_url; img.alt = item.title || ''; }
  if (cap) cap.textContent = item.caption || item.title || '';
 
  // Show/hide nav arrows
  const prev = document.getElementById('lightboxPrev');
  const next = document.getElementById('lightboxNext');
  if (prev) prev.style.display = galLightboxItems.length > 1 ? '' : 'none';
  if (next) next.style.display = galLightboxItems.length > 1 ? '' : 'none';
}
 
function galLightboxNav(dir) {
  if (!galLightboxItems.length) return;
  galLightboxIdx = (galLightboxIdx + dir + galLightboxItems.length) % galLightboxItems.length;
  showLightboxItem();
}
 
function openLightbox(src, caption) {
  // Legacy single-image open (used elsewhere — keep compatible)
  galLightboxItems = [{ image_url: src, title: caption }];
  galLightboxIdx   = 0;
  showLightboxItem();
  document.getElementById('lightbox')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
 
function closeLightbox() {
  document.getElementById('lightbox')?.classList.remove('active');
  document.body.style.overflow = '';
}
 
// ── HELPERS ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
 
function esc2(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// ============================================================
const prayerForm = $('#prayerForm');
if (prayerForm) {
  prayerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#prayerSubmitBtn');
    const msgEl = $('#prayerMessage');
    btn.textContent = 'Sending...'; btn.disabled = true;

    try {
      const res = await fetch(`${API}/prayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_name: $('#prayerName').value,
          email: $('#prayerEmail').value,
          request_text: $('#prayerRequest').value,
          is_private: $('#prayerPrivate').checked
        })
      });
      const data = await res.json();
      if (res.ok) {
        msgEl.className = 'form-message success';
        msgEl.textContent = data.message;
        prayerForm.reset();
        $('#prayerPrivate').checked = true;
      } else throw new Error(data.error || 'Submission failed');
    } catch (err) {
      const msgEl = $('#prayerMessage');
      msgEl.className = 'form-message error';
      msgEl.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      btn.textContent = 'Send My Prayer Request 🙏'; btn.disabled = false;
    }
  });
}

// ============================================================
// CONTACT FORM
// ============================================================
const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#contactSubmitBtn');
    const msgEl = contactForm.querySelector('.form-message');
    btn.textContent = 'Sending...'; btn.disabled = true;

    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: $('#contactName').value,
          email: $('#contactEmail').value,
          phone: $('#contactPhone').value,
          subject: $('#contactSubject').value,
          message: $('#contactMessage').value
        })
      });
      const data = await res.json();
      if (res.ok) {
        msgEl.className = 'form-message success';
        msgEl.textContent = data.message;
        contactForm.reset();
      } else throw new Error(data.error);
    } catch (err) {
      const msgEl = contactForm.querySelector('.form-message');
      msgEl.className = 'form-message error';
      msgEl.textContent = err.message || 'Something went wrong.';
    } finally {
      btn.textContent = 'Send Message ✉️'; btn.disabled = false;
    }
  });
}

// ============================================================
// SCROLL ANIMATIONS
// ============================================================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.section').forEach(sec => {
  sec.style.opacity = '0';
  sec.style.transform = 'translateY(20px)';
  sec.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(sec);
});

// ============================================================
// INIT
// ============================================================
(async () => {
  await loadSettings();
  loadPastors();
  loadServiceTimes();
  loadAnnouncements();
  loadEvents();
  loadMinistries();
  loadSermons();
  loadGallery();
})();