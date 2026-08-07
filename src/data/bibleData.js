import { getBookById } from './books.js';
import { getLangByCode } from './languages.js';

// Cache: langCode -> raw bible data
const bibleCache = {};
let currentPrimary = 'en';
let currentSecondary = 'ta';
let loadPromise = null;

export function initBibleData(primaryLang = 'en', secondaryLang = 'ta') {
  currentPrimary = primaryLang;
  currentSecondary = secondaryLang;

  const toLoad = [...new Set([primaryLang, secondaryLang])].filter(c => !bibleCache[c]);
  if (toLoad.length === 0) return Promise.resolve(true);

  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  loadPromise = Promise.all(
    toLoad.map(code => {
      const lang = getLangByCode(code);
      return fetch(`${cleanBase}data/${lang.dataFile}`)
        .then(res => res.json())
        .then(data => { bibleCache[code] = data; })
        .catch(err => console.error(`Failed to load ${lang.name} Bible:`, err));
    })
  ).then(() => true);

  return loadPromise;
}

export function setActiveLanguages(primaryLang, secondaryLang) {
  currentPrimary = primaryLang;
  currentSecondary = secondaryLang;
  return initBibleData(primaryLang, secondaryLang);
}

function getVersesFromRaw(raw, bookIndex, chapterIndex) {
  const verses = [];
  if (!raw || !raw.Book || !raw.Book[bookIndex]) return verses;
  const bookObj = raw.Book[bookIndex];
  if (!bookObj.Chapter || !bookObj.Chapter[chapterIndex]) return verses;
  const chapVerses = bookObj.Chapter[chapterIndex].Verse || [];
  chapVerses.forEach((vObj, idx) => {
    verses.push({ verse: idx + 1, text: vObj.Verse || '' });
  });
  return verses;
}

export function getChapterScripture(bookId, chapterNum) {
  const bookIndex = Number(bookId) - 1;
  const chapterIndex = Number(chapterNum) - 1;

  const primaryVerses = getVersesFromRaw(bibleCache[currentPrimary], bookIndex, chapterIndex);
  const secondaryVerses = getVersesFromRaw(bibleCache[currentSecondary], bookIndex, chapterIndex);

  if (primaryVerses.length === 0 && secondaryVerses.length === 0) {
    const book = getBookById(bookId);
    return {
      primary: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
      secondary: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
      en: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
      ta: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
    };
  }

  return {
    primary: primaryVerses,
    secondary: secondaryVerses,
    // Keep backward compat keys
    en: currentPrimary === 'en' ? primaryVerses : (currentSecondary === 'en' ? secondaryVerses : primaryVerses),
    ta: currentPrimary === 'ta' ? primaryVerses : (currentSecondary === 'ta' ? secondaryVerses : secondaryVerses),
  };
}

export function getLangVerses(bookId, chapterNum, langCode) {
  const bookIndex = Number(bookId) - 1;
  const chapterIndex = Number(chapterNum) - 1;
  return getVersesFromRaw(bibleCache[langCode], bookIndex, chapterIndex);
}

export function isLangLoaded(code) {
  return !!bibleCache[code];
}

export function isDataReady() {
  return !!bibleCache[currentPrimary];
}

export function getRawBibleData() {
  return bibleCache;
}
