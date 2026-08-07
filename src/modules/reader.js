import { getBookById } from '../data/books.js';
import { getChapterScripture } from '../data/bibleData.js';
import { isBookmarked, getVerseHighlight, getVerseNote } from './storage.js';

export function renderReaderContent(containerEl, bookId, chapter, options = {}) {
  const { viewMode = 'parallel', fontSize = 'md', lineHeight = 'relaxed', activeTtsVerse = -1 } = options;
  const book = getBookById(bookId);
  const scripture = getChapterScripture(bookId, chapter);

  containerEl.innerHTML = '';
  containerEl.className = `reader-container view-mode-${viewMode} font-size-${fontSize} line-height-${lineHeight}`;

  // Reader Header Title
  const headerDiv = document.createElement('div');
  headerDiv.className = 'reader-header-title';
  
  if (viewMode === 'parallel') {
    headerDiv.innerHTML = `
      <h2>${book.nameEn} ${chapter} <span class="divider-slash">|</span> <span class="ta-font">${book.nameTa} ${chapter}</span></h2>
      <p class="sub-heading">Parallel Bible View (English KJV & தமிழ் வேதாகமம்)</p>
    `;
  } else if (viewMode === 'ta') {
    headerDiv.innerHTML = `
      <h2 class="ta-font">${book.nameTa} ${chapter}</h2>
      <p class="sub-heading">தமிழ் சத்திய வேதாகமம் (BSI)</p>
    `;
  } else {
    headerDiv.innerHTML = `
      <h2>${book.nameEn} ${chapter}</h2>
      <p class="sub-heading">Holy Bible (King James Version)</p>
    `;
  }
  containerEl.appendChild(headerDiv);

  // Verses Grid Wrapper
  const versesWrapper = document.createElement('div');
  versesWrapper.className = 'verses-wrapper';

  const enList = scripture.en;
  const taList = scripture.ta;
  const maxVerses = Math.max(enList.length, taList.length);

  for (let i = 0; i < maxVerses; i++) {
    const verseNum = i + 1;
    const enObj = enList.find(v => v.verse === verseNum) || { verse: verseNum, text: '' };
    const taObj = taList.find(v => v.verse === verseNum) || { verse: verseNum, text: '' };

    const verseRow = document.createElement('div');
    const highlightColor = getVerseHighlight(bookId, chapter, verseNum);
    const bookmarked = isBookmarked(bookId, chapter, verseNum);
    const noteText = getVerseNote(bookId, chapter, verseNum);

    verseRow.className = `verse-row ${highlightColor ? `highlight-${highlightColor}` : ''} ${activeTtsVerse === verseNum ? 'tts-active' : ''}`;
    verseRow.dataset.verse = verseNum;
    verseRow.dataset.bookId = bookId;
    verseRow.dataset.chapter = chapter;

    if (viewMode === 'parallel') {
      verseRow.innerHTML = `
        <div class="verse-cell verse-en">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${enObj.text}</span>
        </div>
        <div class="verse-cell verse-ta ta-font">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${taObj.text}</span>
        </div>
        <div class="verse-actions-toolbar">
          <button class="action-btn btn-bookmark ${bookmarked ? 'active' : ''}" title="Bookmark / புக்மார்க்" data-action="bookmark">
            <i class="fa-solid fa-bookmark"></i>
          </button>
          <button class="action-btn btn-highlight" title="Highlight / கலர் குறிப்பு" data-action="highlight">
            <i class="fa-solid fa-highlighter"></i>
          </button>
          <button class="action-btn btn-note ${noteText ? 'has-note' : ''}" title="Notes / குறிப்புகள்" data-action="note">
            <i class="fa-solid fa-note-sticky"></i>
          </button>
          <button class="action-btn btn-copy" title="Copy Verse / பிரதியெடு" data-action="copy">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
      `;
    } else if (viewMode === 'ta') {
      verseRow.innerHTML = `
        <div class="verse-cell verse-ta single-cell ta-font">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${taObj.text}</span>
        </div>
        <div class="verse-actions-toolbar">
          <button class="action-btn btn-bookmark ${bookmarked ? 'active' : ''}" title="Bookmark" data-action="bookmark"><i class="fa-solid fa-bookmark"></i></button>
          <button class="action-btn btn-highlight" title="Highlight" data-action="highlight"><i class="fa-solid fa-highlighter"></i></button>
          <button class="action-btn btn-note ${noteText ? 'has-note' : ''}" title="Notes" data-action="note"><i class="fa-solid fa-note-sticky"></i></button>
          <button class="action-btn btn-copy" title="Copy" data-action="copy"><i class="fa-solid fa-copy"></i></button>
        </div>
      `;
    } else {
      verseRow.innerHTML = `
        <div class="verse-cell verse-en single-cell">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${enObj.text}</span>
        </div>
        <div class="verse-actions-toolbar">
          <button class="action-btn btn-bookmark ${bookmarked ? 'active' : ''}" title="Bookmark" data-action="bookmark"><i class="fa-solid fa-bookmark"></i></button>
          <button class="action-btn btn-highlight" title="Highlight" data-action="highlight"><i class="fa-solid fa-highlighter"></i></button>
          <button class="action-btn btn-note ${noteText ? 'has-note' : ''}" title="Notes" data-action="note"><i class="fa-solid fa-note-sticky"></i></button>
          <button class="action-btn btn-copy" title="Copy" data-action="copy"><i class="fa-solid fa-copy"></i></button>
        </div>
      `;
    }

    if (noteText) {
      const noteBadge = document.createElement('div');
      noteBadge.className = 'verse-note-badge';
      noteBadge.innerHTML = `<i class="fa-solid fa-pencil"></i> <span>${noteText}</span>`;
      verseRow.appendChild(noteBadge);
    }

    versesWrapper.appendChild(verseRow);
  }

  containerEl.appendChild(versesWrapper);
}
