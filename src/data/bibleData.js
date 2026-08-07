// Cache: langCode -> raw bible data
const bibleCache = {};
let loadPromise = null;

export function initBibleData() {
  if (bibleCache['en'] && bibleCache['ta']) return Promise.resolve(true);

  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  loadPromise = Promise.all([
    fetch(`${cleanBase}data/english_bible.json`).then(res => res.json()).then(data => { bibleCache['en'] = data; }),
    fetch(`${cleanBase}data/tamil_bible.json`).then(res => res.json()).then(data => { bibleCache['ta'] = data; })
  ]).catch(err => console.error('Failed to load Bible data:', err)).then(() => true);

  return loadPromise;
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

  const enVerses = getVersesFromRaw(bibleCache['en'], bookIndex, chapterIndex);
  const taVerses = getVersesFromRaw(bibleCache['ta'], bookIndex, chapterIndex);

  if (enVerses.length === 0 && taVerses.length === 0) {
    const book = getBookById(bookId);
    return {
      en: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
      ta: [{ verse: 1, text: `Loading ${book.nameEn} ${chapterNum}...` }],
    };
  }

  return {
    en: enVerses,
    ta: taVerses,
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
