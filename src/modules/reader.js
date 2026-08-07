import { getBookById } from '../data/books.js';
import { getChapterScripture } from '../data/bibleData.js';
import { getLangByCode } from '../data/languages.js';
import { isBookmarked, getVerseHighlight, getVerseNote } from './storage.js';

export function renderReaderContent(containerEl, bookId, chapter, options = {}) {
  const { viewMode = 'parallel', fontSize = 'md', lineHeight = 'relaxed', activeTtsVerse = -1,
    primaryLang = 'en', secondaryLang = 'ta' } = options;
  const book = getBookById(bookId);
  const scripture = getChapterScripture(bookId, chapter);
  const pLang = getLangByCode(primaryLang);
  const sLang = getLangByCode(secondaryLang);

  containerEl.innerHTML = '';
  containerEl.className = `reader-container view-mode-${viewMode} font-size-${fontSize} line-height-${lineHeight}`;

  // Reader Header Title
  const headerDiv = document.createElement('div');
  headerDiv.className = 'reader-header-title';

  if (viewMode === 'parallel') {
    headerDiv.innerHTML = `
      <h2>${book.nameEn} ${chapter} <span class="divider-slash">|</span> <span class="${sLang.fontClass}">${book.nameEn} ${chapter}</span></h2>
      <p class="sub-heading">Parallel Bible View (${pLang.name} & ${sLang.nativeName})</p>
    `;
  } else {
    headerDiv.innerHTML = `
      <h2 class="${pLang.fontClass}">${book.nameEn} ${chapter}</h2>
      <p class="sub-heading">${pLang.nativeName} Bible</p>
    `;
  }
  containerEl.appendChild(headerDiv);

  // Verses Grid Wrapper
  const versesWrapper = document.createElement('div');
  versesWrapper.className = 'verses-wrapper';

  const primaryList = scripture.primary || scripture.en || [];
  const secondaryList = scripture.secondary || scripture.ta || [];
  const maxVerses = Math.max(primaryList.length, secondaryList.length);

  for (let i = 0; i < maxVerses; i++) {
    const verseNum = i + 1;
    const pObj = primaryList.find(v => v.verse === verseNum) || { verse: verseNum, text: '' };
    const sObj = secondaryList.find(v => v.verse === verseNum) || { verse: verseNum, text: '' };

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
        <div class="verse-cell verse-en ${pLang.fontClass}">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${pObj.text}</span>
        </div>
        <div class="verse-cell verse-ta ${sLang.fontClass}">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${sObj.text}</span>
        </div>
        <div class="verse-actions-toolbar">
          <button class="action-btn btn-bookmark ${bookmarked ? 'active' : ''}" title="Bookmark" data-action="bookmark">
            <i class="fa-solid fa-bookmark"></i>
          </button>
          <button class="action-btn btn-highlight" title="Highlight" data-action="highlight">
            <i class="fa-solid fa-highlighter"></i>
          </button>
          <button class="action-btn btn-note ${noteText ? 'has-note' : ''}" title="Notes" data-action="note">
            <i class="fa-solid fa-note-sticky"></i>
          </button>
          <button class="action-btn btn-copy" title="Copy" data-action="copy">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button class="action-btn btn-audio-verse" title="Listen (${pLang.name} + ${sLang.name})" data-action="audio-verse">
            <i class="fa-solid fa-volume-high"></i>
          </button>
        </div>
      `;
    } else {
      verseRow.innerHTML = `
        <div class="verse-cell single-cell ${pLang.fontClass}">
          <span class="verse-num">${verseNum}</span>
          <span class="verse-text">${pObj.text}</span>
        </div>
        <div class="verse-actions-toolbar">
          <button class="action-btn btn-bookmark ${bookmarked ? 'active' : ''}" title="Bookmark" data-action="bookmark"><i class="fa-solid fa-bookmark"></i></button>
          <button class="action-btn btn-highlight" title="Highlight" data-action="highlight"><i class="fa-solid fa-highlighter"></i></button>
          <button class="action-btn btn-note ${noteText ? 'has-note' : ''}" title="Notes" data-action="note"><i class="fa-solid fa-note-sticky"></i></button>
          <button class="action-btn btn-copy" title="Copy" data-action="copy"><i class="fa-solid fa-copy"></i></button>
          <button class="action-btn btn-audio-verse" title="Listen (${pLang.name})" data-action="audio-verse"><i class="fa-solid fa-volume-high"></i></button>
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

