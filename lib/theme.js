// lib/theme.js
// Theme management: dark / light mode with system-preference default

const STORAGE_KEY = 'f1fl_theme';
const ROOT = document.documentElement;

function applyTheme(theme) {
  ROOT.dataset.theme = theme;
  // Update any existing toggle buttons in the header
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.querySelector('.theme-icon-sun').style.display  = theme === 'dark'  ? 'none'         : 'block';
    btn.querySelector('.theme-icon-moon').style.display = theme === 'dark'  ? 'block'        : 'none';
  });
}

export function getTheme() {
  return ROOT.dataset.theme || 'dark';
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
}

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
  } else {
    // No explicit preference — follow the OS setting
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');

    // Listen for OS-level changes (only while no explicit pref is stored)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
