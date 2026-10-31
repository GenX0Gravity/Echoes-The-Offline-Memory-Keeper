/**
 * ECHOES – UI Utilities Module
 * Toast notifications, modals, helper functions
 */

// ── Toast System ─────────────────────────────────────────

const toastContainer = document.querySelector('.toast-container') || createToastContainer();

function createToastContainer() {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
}

export function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✦', error: '⚠', info: '◈', warning: '◉' };
  const container = document.querySelector('.toast-container') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, duration);

  return toast;
}

// ── Modal System ─────────────────────────────────────────

export function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(modalId);
  }, { once: true });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(modalId);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── DOM Helpers ──────────────────────────────────────────

export function $(selector, context = document) {
  return context.querySelector(selector);
}

export function $$(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') el.className = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else if (key === 'textContent') el.textContent = val;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
    else el.setAttribute(key, val);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  });
  return el;
}

export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ── String Helpers ───────────────────────────────────────

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function truncate(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '…';
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ── Animation Helpers ────────────────────────────────────

export function animateIn(el, animClass = 'fadeInUp', delay = 0) {
  el.style.animationDelay = `${delay}ms`;
  el.classList.add(animClass);
}

export function staggerAnimate(elements, animClass = 'cardEntrance', baseDelay = 0, step = 80) {
  elements.forEach((el, i) => {
    el.style.animationDelay = `${baseDelay + i * step}ms`;
    el.classList.add(animClass);
  });
}

export function typewriterEffect(el, text, speed = 25) {
  el.textContent = '';
  let i = 0;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        el.scrollTop = el.scrollHeight;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

// ── Debounce / Throttle ──────────────────────────────────

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 100) {
  let lastTime = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      fn(...args);
    }
  };
}

// ── Scroll Helpers ───────────────────────────────────────

export function scrollToTop(smooth = true) {
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

// ── Image Helpers ────────────────────────────────────────

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Type Config ──────────────────────────────────────────

export const MEMORY_TYPES = {
  person: { label: 'Person', icon: '👤', emoji: '👤' },
  moment: { label: 'Moment', icon: '✨', emoji: '✨' },
  place: { label: 'Place', icon: '🌍', emoji: '🌍' },
  dream: { label: 'Dream', icon: '🌙', emoji: '🌙' },
  story: { label: 'Story', icon: '📖', emoji: '📖' },
};

export const MOODS = [
  { value: 'nostalgic', label: '🌅 Nostalgic' },
  { value: 'joyful', label: '✨ Joyful' },
  { value: 'peaceful', label: '🕊 Peaceful' },
  { value: 'mysterious', label: '🌙 Mysterious' },
  { value: 'bittersweet', label: '🌹 Bittersweet' },
  { value: 'transformative', label: '🦋 Transformative' },
  { value: 'sorrowful', label: '🌧 Sorrowful' },
  { value: 'grateful', label: '🙏 Grateful' },
];

