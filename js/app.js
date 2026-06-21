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

function buildVideoEmbed(url) {
  if (!url || !url.trim()) return null;
  url = url.trim();

  // YouTube — all formats, muted autoplay attempt, no related videos
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/)|youtu\.be\/)([^&?\s/]+)/);
  if (yt) {
    const params = 'rel=0&modestbranding=1&playsinline=1&mute=1&enablejsapi=0';
    return `<iframe
      src="https://www.youtube-nocookie.com/embed/${yt[1]}?${params}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
      title="Video"></iframe>`;
  }

  // Facebook video
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    const encoded = encodeURIComponent(url);
    return `<iframe
      src="https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false&mute=1"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowfullscreen
      loading="lazy"
      title="Facebook Video"></iframe>`;
  }

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    return `<iframe
      src="https://player.vimeo.com/video/${vimeo[1]}?muted=1&playsinline=1"
      frameborder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      loading="lazy"
      title="Vimeo Video"></iframe>`;
  }

  // Direct video file — muted autoplay like a media card
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return `<video
      autoplay muted loop playsinline
      preload="metadata"
      style="width:100%;height:100%;object-fit:cover;display:block;">
      <source src="${url}" />
    </video>`;
  }

  // Fallback — clickable link styled inside the container
  return `<a href="${url}" target="_blank" rel="noopener" class="video-fallback-link">▶ Watch Video</a>`;
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

  // hero text fade/slide as next section covers it
  const heroContent = $('.hero-content');
  if (heroContent) {
    const vh = window.innerHeight;
    const progress = Math.min(window.scrollY / (vh * 0.7), 1);
    heroContent.style.opacity = 1 - progress;
    heroContent.style.transform = `translateY(${progress * -80}px)`;
  }
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

function showSiteToast(message, duration = 3000) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.style.cssText = `
      position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);
      background:var(--navy-dark);color:var(--white);
      padding:12px 28px;border-radius:50px;font-size:0.85rem;font-weight:600;
      box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:9999;
      opacity:0;transition:all 0.3s ease;pointer-events:none;
      border:1px solid rgba(184,146,64,0.3);letter-spacing:0.5px;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, duration);
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
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  const url = settings.hero_image_url?.trim()
    || 'https://res.cloudinary.com/dux2ebfzl/image/upload/v1781651543/lighthouse/site/a54hmrk257g8jd4zrmku.jpg';
  bg.style.backgroundImage = `url('${url}')`;
  bg.classList.add('has-photo');
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

  const svgFacebook = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>`;
  const svgYouTube  = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`;
  const svgInstagram= `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
  const svgWhatsApp = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`;

  const svgFooterFB = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>`;
  const svgFooterYT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`;
  const svgFooterIG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
  const svgFooterWA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`;

  let socialHTML = '', footerHTML = '';
  if (settings.facebook_url)  { socialHTML += `<a href="${settings.facebook_url}" class="social-link" target="_blank" rel="noopener" title="Facebook">${svgFacebook}</a>`; footerHTML += `<a href="${settings.facebook_url}" class="footer-social-link" target="_blank" rel="noopener">${svgFooterFB} Facebook</a>`; }
  if (settings.youtube_url)   { socialHTML += `<a href="${settings.youtube_url}" class="social-link" target="_blank" rel="noopener" title="YouTube">${svgYouTube}</a>`;   footerHTML += `<a href="${settings.youtube_url}" class="footer-social-link" target="_blank" rel="noopener">${svgFooterYT} YouTube</a>`; }
  if (settings.instagram_url) { socialHTML += `<a href="${settings.instagram_url}" class="social-link" target="_blank" rel="noopener" title="Instagram">${svgInstagram}</a>`; footerHTML += `<a href="${settings.instagram_url}" class="footer-social-link" target="_blank" rel="noopener">${svgFooterIG} Instagram</a>`; }
  if (settings.whatsapp_number) {
    const waLink = `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`;
    socialHTML += `<a href="${waLink}" class="social-link" target="_blank" rel="noopener" title="WhatsApp">${svgWhatsApp}</a>`;
    footerHTML += `<a href="${waLink}" class="footer-social-link" target="_blank" rel="noopener">${svgFooterWA} WhatsApp</a>`;
  }
  if (socialContainer) socialContainer.innerHTML = socialHTML;
  if (footerSocial) footerSocial.innerHTML = footerHTML;
  // New sections — called here so they run after settings are fetched
  applyHeroPhoto(settings);
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
  document.getElementById('announcements')?.style.setProperty('display', 'none');
  return;
}
document.getElementById('announcements')?.style.removeProperty('display');

  grid.innerHTML = announcements.map(a => {
    const videoEmbed = buildVideoEmbed(a.video_url);
    return `
    <div class="announcement-card ${a.is_pinned ? 'pinned' : ''}">
      ${a.image_url
        ? `<img class="announcement-img" src="${a.image_url}" alt="${a.title}" loading="lazy" onerror="this.style.display='none'" />`
        : videoEmbed
          ? ''
          : `<div class="ann-accent-bar"></div>`
      }
      ${videoEmbed ? `<div class="ann-video-wrap">${videoEmbed}</div>` : ''}
      <div class="announcement-body">
        <div class="announcement-meta">
          <span class="ann-badge ${a.category}">${a.category}</span>
          <span class="ann-date">${formatDate(a.published_at)}</span>
        </div>
        <h3 class="announcement-title">${a.title}</h3>
        <p class="announcement-text">${truncate(a.body, 200)}</p>
        ${a.is_pinned ? `<div class="ann-pin">📌 Pinned Announcement</div>` : ''}
      </div>
    </div>`;
  }).join('');
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
  // Only hide section if this is the initial load (no category selected)
  const activeBtn = document.querySelector('.filter-btn.active');
  const activeCat = activeBtn?.dataset.cat || '';
  if (!activeCat) {
    document.getElementById('events')?.style.setProperty('display', 'none');
  } else {
    // Category filter returned nothing — show feedback, keep section visible
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 20px">
        <div style="font-family:var(--font-heading);color:var(--navy-mid);font-size:1rem;margin-bottom:8px">
          No ${activeCat} events scheduled
        </div>
        <p style="color:var(--text-light);font-size:0.88rem">Check back soon or explore other categories.</p>
      </div>`;
    showSiteToast(`No events found under "${activeCat}"`, 3000);
  }
  return;
}
document.getElementById('events')?.style.removeProperty('display');

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
      ? `<a href="./event-register.html?event=${e.id}" class="event-register">📋 Register Now →</a>`
      : e.registration_link
        ? `<a href="${e.registration_link}" class="event-register" target="_blank">Register Now →</a>`
        : '';

    const videoEmbed = buildVideoEmbed(e.video_url);
    const imageHtml = e.image_url
      ? `<div class="event-img-wrap"><img class="event-img" src="${e.image_url}" alt="${e.title}" loading="lazy" /></div>`
      : videoEmbed
        ? `<div class="event-video-wrap">${videoEmbed}</div>`
        : `<div class="event-img-placeholder"></div>`;

    return `
      <div class="event-card">
        ${imageHtml}
        <div class="event-body">
          <div class="event-date-band">📅 ${formatEventDate(e)}${e.start_time ? ` · ${formatTime(e.start_time)}` : ''}${e.end_time ? ` – ${formatTime(e.end_time)}` : ''}</div>
          <h3 class="event-title">${e.title}</h3>
          ${e.description ? `<p class="event-desc">${truncate(e.description, 200)}</p>` : ''}
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

  grid.innerHTML = ministries.map(m => {
    const mediaUrl = m.media_url || null;
    const mediaType = m.media_type || 'image';

    let mediaHTML = '';

    if (!mediaUrl) {
  mediaHTML = `
    <div class="ministry-media ministry-media--image"
      style="background:linear-gradient(135deg,var(--navy-dark) 0%,var(--navy-mid) 100%)">
    </div>`;
    } else if (mediaType === 'url') {
      // Could be YouTube or image URL
      const isYT = mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be');
      if (isYT) {
        const ytId = mediaUrl.match(/(?:v=|embed\/|youtu\.be\/|shorts\/)([^&?\s/]+)/)?.[1];
        const embedUrl = ytId
        ? `https://www.youtube-nocookie.com/embed/${ytId}?controls=1&modestbranding=1&rel=0&playsinline=1`
        : null;
        mediaHTML = `
          <div class="ministry-media ministry-media--video">
            <iframe src="${embedUrl}" frameborder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope"
              allowfullscreen loading="lazy"></iframe>
          </div>`;
      } else {
        mediaHTML = `<div class="ministry-media ministry-media--image" style="background-image:url('${mediaUrl}')"></div>`;
      }
    } else if (mediaType === 'video') {
      mediaHTML = `
        <div class="ministry-media ministry-media--video">
          <video src="${mediaUrl}" autoplay muted loop playsinline
            style="width:100%;height:100%;object-fit:cover"></video>
        </div>`;
    } else {
      mediaHTML = `<div class="ministry-media ministry-media--image" style="background-image:url('${mediaUrl}')"></div>`;
    }

    return `
      <div class="ministry-card">
        ${mediaHTML}
        <div class="ministry-card-body">
          <div class="ministry-name">${m.name}</div>
          <p class="ministry-desc">${truncate(m.description || '', 160)}</p>
          ${m.leader_name && m.leader_name !== 'TBA' ? `<div class="ministry-leader"><i class="fa-solid fa-user"></i> ${m.leader_name}</div>` : ''}
          ${m.meeting_schedule ? `<div class="ministry-schedule"><i class="fa-regular fa-clock"></i> ${m.meeting_schedule}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// SERMONS
// ============================================================
let sermonDataMap = {};
let sermonSeriesGroups = [];

async function loadSermons() {
  const sermons = await apiFetch('/sermons');
  const grid = $('#sermonsGrid');
  if (!grid) return;

  if (!sermons || !sermons.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎙️</div><p>Sermons will be posted here after Sunday's service!</p></div>`;
    return;
  }

  sermonDataMap = {};
  sermons.forEach(s => sermonDataMap[s.id] = s);

  const seriesMap = {};
  const singles = [];
  sermons.forEach(s => {
    if (s.series_name && s.series_name.trim()) {
      (seriesMap[s.series_name] = seriesMap[s.series_name] || []).push(s);
    } else {
      singles.push(s);
    }
  });

  sermonSeriesGroups = Object.keys(seriesMap).map(name => {
    const episodes = seriesMap[name].sort((a, b) => new Date(b.sermon_date) - new Date(a.sermon_date));
    return { name, episodes, latest: episodes[0], count: episodes.length };
  }).sort((a, b) => new Date(b.latest.sermon_date) - new Date(a.latest.sermon_date));

  if (singles.length) {
    const sortedSingles = singles.sort((a, b) => new Date(b.sermon_date) - new Date(a.sermon_date));
    sermonSeriesGroups.push({ name: '__singles__', episodes: sortedSingles, latest: sortedSingles[0], count: sortedSingles.length });
  }

  renderSermonSeriesGrid();
}

function renderSermonSeriesGrid() {
  const grid = $('#sermonsGrid');
  grid.innerHTML = sermonSeriesGroups.map(g => {
    const isSingles = g.name === '__singles__';
    const cover = g.latest.thumbnail_url;
    const label = isSingles ? 'Standalone Messages' : g.name;
    return `
      <div class="sermon-series-card" onclick="openSermonSeries('${esc2(g.name)}')">
        ${cover
          ? `<img class="sermon-series-cover" src="${cover}" alt="${esc2(label)}" loading="lazy" onerror="this.style.display='none'" />`
          : `<div class="sermon-series-cover-placeholder"><span class="cross">✞</span></div>`}
        <div class="sermon-series-overlay"></div>
        <div class="sermon-series-info">
          <div class="sermon-series-name">${label}</div>
          <div class="sermon-series-meta">
            <span>🎙️ ${g.count} message${g.count > 1 ? 's' : ''}</span>
            <span>🗓 ${formatDate(g.latest.sermon_date)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openSermonSeries(name) {
  const group = sermonSeriesGroups.find(g => g.name === name);
  if (!group) return;
  const isSingles = name === '__singles__';
  $('#sermonSeriesModalTitle').textContent = isSingles ? 'Standalone Messages' : name;
  $('#sermonEpisodeList').innerHTML = group.episodes.map((s, i) => `
    <div class="sermon-episode-row" onclick="openSermonPlayer('${s.id}')">
      <div class="sermon-episode-num">${isSingles ? '🎙️' : (group.episodes.length - i)}</div>
      <div class="sermon-episode-info">
        <div class="sermon-episode-title">${s.title}</div>
        <div class="sermon-episode-meta">
          ${s.pastor_name ? `${s.pastor_name} · ` : ''}${formatDate(s.sermon_date)}${s.scripture_reference ? ` · ${s.scripture_reference}` : ''}
        </div>
      </div>
      <div class="sermon-episode-play">▶</div>
    </div>`).join('');
  $('#sermonSeriesModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSermonSeriesModal(e) {
  if (e && e.target !== e.currentTarget) return;
  $('#sermonSeriesModal').classList.remove('open');
  document.body.style.overflow = '';
}

function openSermonPlayer(id) {
  const s = sermonDataMap[id];
  if (!s) return;

  fetch(`${API}/sermons/${id}/view`, { method: 'POST' }).catch(() => {});

  const videoEmbed = s.video_url ? buildVideoEmbed(s.video_url) : null;

  let mediaHTML;
  if (videoEmbed) {
    mediaHTML = `<div class="sermon-player-video">${videoEmbed}</div>`;
  } else if (s.audio_url) {
    mediaHTML = `<div class="sermon-player-audio"><audio controls src="${s.audio_url}" style="width:100%"></audio></div>`;
  } else {
    mediaHTML = `<div class="sermon-player-empty">No media available for this message yet.</div>`;
  }

  $('#sermonPlayerBody').innerHTML = `
    <div class="sermon-player-header">
      ${s.series_name ? `<div class="sermon-player-series">${s.series_name}</div>` : ''}
      <h3 class="sermon-player-title">${s.title}</h3>
      <div class="sermon-player-meta">
        ${s.pastor_name ? `${s.pastor_name} · ` : ''}${formatDate(s.sermon_date)}${s.scripture_reference ? ` · ${s.scripture_reference}` : ''}
      </div>
    </div>
    ${mediaHTML}
    ${s.description ? `<p class="sermon-player-desc">${s.description}</p>` : ''}
    ${s.audio_url && videoEmbed ? `<a href="${s.audio_url}" target="_blank" rel="noopener" class="sermon-link audio" style="display:inline-block;margin-top:14px">🔊 Listen to Audio</a>` : ''}
  `;
  $('#sermonPlayerModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSermonPlayer(e) {
  if (e && e.target !== e.currentTarget) return;
  $('#sermonPlayerModal').classList.remove('open');
  const audio = document.querySelector('#sermonPlayerBody audio');
  if (audio) audio.pause();
  const iframe = document.querySelector('#sermonPlayerBody iframe');
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
}

// ============================================================
// GALLERY
// ============================================================
let galAllItems   = [];   // every photo from API
let galAlbums     = [];   // album names
let galActive     = '';   // current album tab ('' = All)
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
    const ed = document.getElementById('galEditorial');
    if (ed) ed.innerHTML = `<div class="gal-empty" style="grid-column:1/-1"><div class="gal-empty-icon">📸</div><p>Photos coming soon.</p></div>`;
    const btn = document.getElementById('galViewAllBtn');
    if (btn) btn.style.display = 'none';
    return;
  }

  buildTabs();
  renderGallery('');

  document.getElementById('lightboxPrev')?.addEventListener('click', () => galLightboxNav(-1));
  document.getElementById('lightboxNext')?.addEventListener('click', () => galLightboxNav(1));
  document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) closeLightbox();
  });
  document.addEventListener('keydown', e => {
    if (document.getElementById('lightbox')?.classList.contains('active')) {
      if (e.key === 'ArrowLeft')  galLightboxNav(-1);
      if (e.key === 'ArrowRight') galLightboxNav(1);
      if (e.key === 'Escape')     closeLightbox();
    }
  });
}

function buildTabs() {
  const container = document.getElementById('galTabs');
  if (!container) return;
  container.innerHTML = ['All', ...galAlbums].map(t => `
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

function renderGallery(album) {
  const pool = album ? galAllItems.filter(i => i.album === album) : galAllItems;
  const countEl = document.getElementById('galViewAllCount');
  if (countEl) countEl.textContent = pool.length;

  buildEditorial(pool);
  buildStrip(pool);
}

function buildEditorial(pool) {
  const el = document.getElementById('galEditorial');
  if (!el) return;
  if (!pool.length) {
    el.innerHTML = `<div class="gal-empty" style="grid-column:1/-1"><div class="gal-empty-icon">📸</div><p>No photos in this album yet.</p></div>`;
    return;
  }
  const top = pool.slice(0, 3);
  el.innerHTML = top.map((item, i) => `
    <div class="gal-cell ${i === 0 ? 'gal-cell--tall' : ''}"
      onclick="openLightboxFromPool(${i}, ${JSON.stringify(pool).replace(/"/g,'&quot;')})">
      <img src="${item.image_url}" alt="${item.title || ''}" loading="lazy" />
      <div class="gal-cell-overlay">
        <span class="gal-cell-caption">${item.caption || item.title || ''}</span>
      </div>
    </div>
  `).join('');
}

function buildStrip(pool) {
  const el = document.getElementById('galStrip');
  if (!el) return;
  const strip = pool.slice(3, 7);
  const remaining = pool.length - 7;
  if (!strip.length) { el.innerHTML = ''; return; }
  el.innerHTML = strip.map((item, i) => {
    const isLast = i === strip.length - 1 && remaining > 0;
    return `
      <div class="gal-strip-cell"
        onclick="${isLast ? 'openGalleryModal()' : `openLightboxFromPool(${i + 3}, ${JSON.stringify(pool).replace(/"/g,'&quot;')})`}">
        <img src="${item.image_url}" alt="${item.title || ''}" loading="lazy" />
        ${isLast ? `<div class="gal-more-overlay">+${remaining + 1}<span>more photos</span></div>` : ''}
      </div>`;
  }).join('');
}

function openGalleryModal() {
  const pool  = galActive ? galAllItems.filter(i => i.album === galActive) : galAllItems;
  const modal = document.getElementById('galleryModal');
  const grid  = document.getElementById('galModalGrid');
  const title = document.getElementById('galModalTitle');
  if (!modal) return;
  title.textContent = galActive ? `📁 ${galActive}` : 'All Photos';
  grid.innerHTML = pool.map((item, i) => `
    <div class="gal-modal-item"
      onclick="openLightboxFromPool(${i}, ${JSON.stringify(pool).replace(/"/g,'&quot;')})">
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