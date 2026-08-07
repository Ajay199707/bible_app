import { SUPPORTED_LANGUAGES, getLangByCode } from '../data/languages.js';
import { getSettings, saveSettings } from './storage.js';

let onSaveCallback = null;

// ── Render language cards grid ──────────────────────────────────────────────
function renderLangCards(containerId, selectedCode) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  SUPPORTED_LANGUAGES.forEach(lang => {
    const card = document.createElement('button');
    card.className = `lang-card ${lang.code === selectedCode ? 'selected' : ''}`;
    card.dataset.code = lang.code;
    card.dataset.container = containerId;
    card.innerHTML = `
      <span class="lang-flag-badge">${lang.flag}</span>
      <span class="lang-native">${lang.nativeName}</span>
      <span class="lang-english">${lang.name}</span>
    `;
    container.appendChild(card);
  });
}

// ── Show First-Launch Onboarding Screen ─────────────────────────────────────
export function showLangSetup(onSave) {
  onSaveCallback = onSave;
  const overlay = document.getElementById('lang-setup-overlay');
  if (!overlay) return;

  const s = getSettings();
  renderLangCards('lang-primary-grid', s.primaryLang || 'en');
  renderLangCards('lang-secondary-grid', s.secondaryLang || 'ta');

  overlay.classList.add('open');
}

// ── Show Mid-session Language Picker Modal ──────────────────────────────────
export function showLangPicker(onSave) {
  onSaveCallback = onSave;
  const modal = document.getElementById('lang-picker-modal');
  if (!modal) return;

  const s = getSettings();
  renderLangCards('lang-picker-primary-grid', s.primaryLang || 'en');
  renderLangCards('lang-picker-secondary-grid', s.secondaryLang || 'ta');

  modal.classList.add('open');
}

export function hideLangPicker() {
  document.getElementById('lang-picker-modal')?.classList.remove('open');
}

// ── Shared selection handler (event delegation) ──────────────────────────────
export function initLangSetupEvents() {
  // Card click selection
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.lang-card');
    if (!card) return;
    const containerId = card.dataset.container;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.lang-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });

  // First-launch Continue button
  document.getElementById('btn-lang-setup-save')?.addEventListener('click', () => {
    _saveAndClose('lang-setup-overlay', 'lang-primary-grid', 'lang-secondary-grid');
  });

  // Picker Save button
  document.getElementById('btn-lang-picker-save')?.addEventListener('click', () => {
    _saveAndClose('lang-picker-modal', 'lang-picker-primary-grid', 'lang-picker-secondary-grid');
  });

  // Picker Close/Cancel
  document.getElementById('btn-lang-picker-close')?.addEventListener('click', hideLangPicker);
}

function _saveAndClose(overlayId, primaryGridId, secondaryGridId) {
  const primaryCard = document.querySelector(`#${primaryGridId} .lang-card.selected`);
  const secondaryCard = document.querySelector(`#${secondaryGridId} .lang-card.selected`);

  const primaryLang = primaryCard?.dataset.code || 'en';
  const secondaryLang = secondaryCard?.dataset.code || 'ta';

  saveSettings({ primaryLang, secondaryLang, isFirstLaunch: false });
  document.getElementById(overlayId)?.classList.remove('open');

  if (onSaveCallback) onSaveCallback(primaryLang, secondaryLang);
}
