import { BIBLE_BOOKS, getBookById } from '../data/books.js';
import { getChapterScripture } from '../data/bibleData.js';

const INSPIRATIONAL_VERSES = [
  { bookId: 19, chapter: 23, verse: 1 }, // Psalm 23:1
  { bookId: 19, chapter: 91, verse: 1 }, // Psalm 91:1
  { bookId: 43, chapter: 3, verse: 16 }, // John 3:16
  { bookId: 40, chapter: 6, verse: 33 }, // Matthew 6:33
  { bookId: 45, chapter: 8, verse: 28 }, // Romans 8:28
  { bookId: 20, chapter: 3, verse: 5 },  // Proverbs 3:5
  { bookId: 46, chapter: 13, verse: 13 }, // 1 Cor 13:13
  { bookId: 66, chapter: 21, verse: 4 }  // Rev 21:4
];

export function getDailyVerse() {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % INSPIRATIONAL_VERSES.length;
  const target = INSPIRATIONAL_VERSES[index];

  const book = getBookById(target.bookId);
  const scripture = getChapterScripture(target.bookId, target.chapter);

  const enV = scripture.en.find(v => v.verse === target.verse) || scripture.en[0];
  const taV = scripture.ta.find(v => v.verse === target.verse) || scripture.ta[0];

  return {
    bookId: book.id,
    bookNameEn: book.nameEn,
    bookNameTa: book.nameTa,
    chapter: target.chapter,
    verse: target.verse,
    refEn: `${book.nameEn} ${target.chapter}:${target.verse}`,
    refTa: `${book.nameTa} ${target.chapter}:${target.verse}`,
    textEn: enV.text,
    textTa: taV.text
  };
}

export function copyVerseToClipboard(verseObj, lang = 'dual') {
  let output = '';
  if (lang === 'en') {
    output = `"${verseObj.textEn}" — ${verseObj.refEn} (Holy Bible)`;
  } else if (lang === 'ta') {
    output = `"${verseObj.textTa}" — ${verseObj.refTa} (வேதாகமம்)`;
  } else {
    output = `"${verseObj.textEn}"\n${verseObj.refEn}\n\n"${verseObj.textTa}"\n${verseObj.refTa}\n(Holy Bible / வேதாகமம்)`;
  }

  return navigator.clipboard.writeText(output).then(() => true).catch(() => false);
}
