const STORAGE_KEYS = {
  SETTINGS: 'bible_app_settings_v1',
  BOOKMARKS: 'bible_app_bookmarks_v1',
  HIGHLIGHTS: 'bible_app_highlights_v1',
  NOTES: 'bible_app_notes_v1',
  LAST_READ: 'bible_app_last_read_v1',
  PLANS: 'bible_app_plans_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  fontSize: 'md',
  lineHeight: 'relaxed',
  viewMode: 'parallel',
  uiLang: 'ta',
  audioLang: 'ta',
  audioSpeed: 1.0,
  primaryLang: 'en',    // Primary language code
  secondaryLang: 'ta',  // Secondary language code
  isFirstLaunch: true   // Shows language setup on first open
};

const DEFAULT_LAST_READ = {
  bookId: 1, // Genesis / ஆதியாகமம்
  chapter: 1
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(newSettings) {
  try {
    const current = getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return getSettings();
  }
}

export function getLastRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_READ);
    return raw ? { ...DEFAULT_LAST_READ, ...JSON.parse(raw) } : { ...DEFAULT_LAST_READ };
  } catch (e) {
    return { ...DEFAULT_LAST_READ };
  }
}

export function saveLastRead(bookId, chapter) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_READ, JSON.stringify({ bookId: Number(bookId), chapter: Number(chapter) }));
  } catch (e) {}
}

// BOOKMARKS
export function getBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleBookmark(bookId, chapter, verse) {
  const list = getBookmarks();
  const key = `${bookId}_${chapter}_${verse}`;
  const existingIdx = list.findIndex(item => item.key === key);
  
  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  } else {
    list.push({
      key,
      bookId: Number(bookId),
      chapter: Number(chapter),
      verse: Number(verse),
      timestamp: Date.now()
    });
  }
  
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(list));
  return list;
}

export function isBookmarked(bookId, chapter, verse) {
  const list = getBookmarks();
  const key = `${bookId}_${chapter}_${verse}`;
  return list.some(item => item.key === key);
}

// HIGHLIGHTS
export function getHighlights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HIGHLIGHTS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setHighlight(bookId, chapter, verse, color) {
  const map = getHighlights();
  const key = `${bookId}_${chapter}_${verse}`;
  
  if (!color || color === 'none') {
    delete map[key];
  } else {
    map[key] = color; // 'gold' | 'emerald' | 'blue' | 'rose' | 'violet'
  }
  
  localStorage.setItem(STORAGE_KEYS.HIGHLIGHTS, JSON.stringify(map));
  return map;
}

export function getVerseHighlight(bookId, chapter, verse) {
  const map = getHighlights();
  const key = `${bookId}_${chapter}_${verse}`;
  return map[key] || null;
}

// NOTES
export function getNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveVerseNote(bookId, chapter, verse, text) {
  const map = getNotes();
  const key = `${bookId}_${chapter}_${verse}`;
  
  if (!text || text.trim() === '') {
    delete map[key];
  } else {
    map[key] = {
      text: text.trim(),
      updatedAt: Date.now()
    };
  }
  
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(map));
  return map;
}

export function getVerseNote(bookId, chapter, verse) {
  const map = getNotes();
  const key = `${bookId}_${chapter}_${verse}`;
  return map[key] ? map[key].text : '';
}

// READING PLAN PROGRESS
export function getPlanProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLANS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function togglePlanDay(planId, dayNum) {
  const map = getPlanProgress();
  if (!map[planId]) map[planId] = [];
  
  const idx = map[planId].indexOf(dayNum);
  if (idx >= 0) {
    map[planId].splice(idx, 1);
  } else {
    map[planId].push(dayNum);
  }
  
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(map));
  return map[planId];
}
