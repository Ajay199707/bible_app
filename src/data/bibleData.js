import { getBookById } from './books.js';

let tamilBibleRaw = null;
let englishBibleRaw = null;
let isLoaded = false;
let loadPromise = null;

export function initBibleData() {
  if (isLoaded) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  loadPromise = Promise.all([
    fetch(`${cleanBase}data/english_bible.json`).then(res => res.json()),
    fetch(`${cleanBase}data/tamil_bible.json`).then(res => res.json())
  ]).then(([enData, taData]) => {
    englishBibleRaw = enData;
    tamilBibleRaw = taData;
    isLoaded = true;
    return true;
  }).catch(err => {
    console.error('Failed to load Bible datasets:', err);
    return false;
  });

  return loadPromise;
}

export function getChapterScripture(bookId, chapterNum) {
  const bookIndex = Number(bookId) - 1;
  const chapterIndex = Number(chapterNum) - 1;

  const enVerses = [];
  const taVerses = [];

  if (englishBibleRaw && englishBibleRaw.Book && englishBibleRaw.Book[bookIndex]) {
    const bookObj = englishBibleRaw.Book[bookIndex];
    if (bookObj.Chapter && bookObj.Chapter[chapterIndex]) {
      const chapVerses = bookObj.Chapter[chapterIndex].Verse || [];
      chapVerses.forEach((vObj, idx) => {
        enVerses.push({
          verse: idx + 1,
          text: vObj.Verse || ''
        });
      });
    }
  }

  if (tamilBibleRaw && tamilBibleRaw.Book && tamilBibleRaw.Book[bookIndex]) {
    const bookObj = tamilBibleRaw.Book[bookIndex];
    if (bookObj.Chapter && bookObj.Chapter[chapterIndex]) {
      const chapVerses = bookObj.Chapter[chapterIndex].Verse || [];
      chapVerses.forEach((vObj, idx) => {
        taVerses.push({
          verse: idx + 1,
          text: vObj.Verse || ''
        });
      });
    }
  }

  // Fallback if data is still loading
  if (enVerses.length === 0 && taVerses.length === 0) {
    const book = getBookById(bookId);
    return {
      en: [{ verse: 1, text: `Loading scripture for ${book.nameEn} ${chapterNum}...` }],
      ta: [{ verse: 1, text: `${book.nameTa} ${chapterNum} வசனங்கள் ஏற்றப்படுகின்றன...` }]
    };
  }

  return { en: enVerses, ta: taVerses };
}

export function isDataReady() {
  return isLoaded;
}

export function getRawBibleData() {
  return { english: englishBibleRaw, tamil: tamilBibleRaw };
}
