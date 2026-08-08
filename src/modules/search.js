import { BIBLE_BOOKS } from '../data/books.js';
import { getRawBibleData } from '../data/bibleData.js';

export function searchBible(query, options = {}) {
  const { lang = 'all', testament = 'all', limit = 50 } = options;
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();
  const { en: english, ta: tamil } = getRawBibleData();
  const results = [];

  const targetBooks = BIBLE_BOOKS.filter(b => {
    if (testament === 'OT') return b.testament === 'OT';
    if (testament === 'NT') return b.testament === 'NT';
    return true;
  });

  for (const book of targetBooks) {
    const bookIndex = book.id - 1;

    // Search English
    if ((lang === 'all' || lang === 'en') && english && english.Book && english.Book[bookIndex]) {
      const chapters = english.Book[bookIndex].Chapter || [];
      chapters.forEach((chapObj, cIdx) => {
        const chapNum = cIdx + 1;
        const verses = chapObj.Verse || [];
        verses.forEach((vObj, vIdx) => {
          const vNum = vIdx + 1;
          const text = vObj.Verse || '';
          if (text.toLowerCase().includes(cleanQuery)) {
            results.push({
              bookId: book.id,
              bookNameEn: book.nameEn,
              bookNameTa: book.nameTa,
              chapter: chapNum,
              verse: vNum,
              lang: 'en',
              text: text
            });
          }
        });
      });
    }

    // Search Tamil
    if ((lang === 'all' || lang === 'ta') && tamil && tamil.Book && tamil.Book[bookIndex]) {
      const chapters = tamil.Book[bookIndex].Chapter || [];
      chapters.forEach((chapObj, cIdx) => {
        const chapNum = cIdx + 1;
        const verses = chapObj.Verse || [];
        verses.forEach((vObj, vIdx) => {
          const vNum = vIdx + 1;
          const text = vObj.Verse || '';
          if (text.toLowerCase().includes(cleanQuery)) {
            results.push({
              bookId: book.id,
              bookNameEn: book.nameEn,
              bookNameTa: book.nameTa,
              chapter: chapNum,
              verse: vNum,
              lang: 'ta',
              text: text
            });
          }
        });
      });
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}
