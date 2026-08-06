import { BIBLE_BOOKS, getBookById } from './data/books.js';
import { getChapterScripture, initBibleData } from './data/bibleData.js';
import { renderReaderContent } from './modules/reader.js';
import { 
  getSettings, saveSettings, getLastRead, saveLastRead, 
  toggleBookmark, setHighlight, saveVerseNote, getVerseNote, 
  getBookmarks, getNotes 
} from './modules/storage.js';
import { playChapterVerses, pauseAudio, resumeAudio, stopAudio, setPlaybackRate, getAudioState, initAudio } from './modules/audio.js';
import { searchBible } from './modules/search.js';
import { getDailyVerse, copyVerseToClipboard } from './modules/dailyVerse.js';
import { READING_PLANS } from './modules/plans.js';

// Application State
let settings = getSettings();
let lastRead = getLastRead();
let currentBookId = lastRead.bookId || 43; // Default John
let currentChapter = lastRead.chapter || 1;
let currentTtsVerse = -1;
let currentTtsLang = 'en';
let editingNoteVerseObj = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initAudio();
  applySettings(settings);
  
  // Load full authentic Bible datasets first
  initBibleData().then(() => {
    loadScripture(currentBookId, currentChapter);
  });
  
  setupEventListeners();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
});

function loadScripture(bookId, chapter) {
  currentBookId = Number(bookId);
  currentChapter = Number(chapter);
  saveLastRead(currentBookId, currentChapter);

  const book = getBookById(currentBookId);

  // Update navbar title label
  const labelEl = document.getElementById('current-book-label');
  if (labelEl) {
    labelEl.textContent = `${book.nameEn} ${currentChapter} | ${book.nameTa} ${currentChapter}`;
  }

  // Update chapter nav buttons
  const prevBtn = document.getElementById('btn-prev-chap');
  const nextBtn = document.getElementById('btn-next-chap');
  if (prevBtn) prevBtn.disabled = (currentBookId === 1 && currentChapter === 1);
  if (nextBtn) nextBtn.disabled = (currentBookId === 66 && currentChapter === book.chapters);

  // Stop audio if playing new chapter
  stopAudio();
  updateAudioUiState();

  // Render reader content
  const root = document.getElementById('reader-root');
  renderReaderContent(root, currentBookId, currentChapter, {
    viewMode: settings.viewMode,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    activeTtsVerse: currentTtsVerse
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applySettings(newSettings) {
  settings = saveSettings(newSettings);

  // Theme
  document.documentElement.setAttribute('data-theme', settings.theme);

  // View Mode Pills
  document.querySelectorAll('.mode-pills-group .mode-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === settings.viewMode);
  });

  // Re-render reader if mounted
  const root = document.getElementById('reader-root');
  if (root && root.children.length > 0) {
    renderReaderContent(root, currentBookId, currentChapter, {
      viewMode: settings.viewMode,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      activeTtsVerse: currentTtsVerse
    });
  }
}

function setupEventListeners() {
  // Brand Header Click
  document.getElementById('btn-brand')?.addEventListener('click', () => {
    loadScripture(43, 1); // Jump to John 1
  });

  // Chapter Navigation Arrows
  document.getElementById('btn-prev-chap')?.addEventListener('click', () => {
    if (currentChapter > 1) {
      loadScripture(currentBookId, currentChapter - 1);
    } else if (currentBookId > 1) {
      const prevBook = getBookById(currentBookId - 1);
      loadScripture(prevBook.id, prevBook.chapters);
    }
  });

  document.getElementById('btn-next-chap')?.addEventListener('click', () => {
    const currentBook = getBookById(currentBookId);
    if (currentChapter < currentBook.chapters) {
      loadScripture(currentBookId, currentChapter + 1);
    } else if (currentBookId < 66) {
      loadScripture(currentBookId + 1, 1);
    }
  });

  // View Mode Pills Toggle (Parallel | English | Tamil)
  document.querySelectorAll('.mode-pills-group .mode-pill[data-mode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.target.dataset.mode;
      if (mode) {
        applySettings({ viewMode: mode });
      }
    });
  });

  // Open Book Selector Modal
  document.getElementById('btn-open-book-modal')?.addEventListener('click', () => {
    renderBookSelector();
    openModal('modal-books');
  });

  // Open Search Modal
  document.getElementById('btn-open-search')?.addEventListener('click', () => {
    openModal('modal-search');
    document.getElementById('search-input')?.focus();
  });

  // Search Input Event
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    const q = e.target.value;
    const container = document.getElementById('search-results-container');
    if (!q || q.trim().length < 2) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">Type at least 2 characters to search scripture.</p>`;
      return;
    }

    const results = searchBible(q, { limit: 40 });
    if (results.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching verses found for "${q}".</p>`;
      return;
    }

    container.innerHTML = results.map(r => `
      <div class="search-result-item" data-book-id="${r.bookId}" data-chap="${r.chapter}" data-verse="${r.verse}">
        <div class="search-result-ref">${r.bookNameEn} ${r.chapter}:${r.verse} | ${r.bookNameTa} ${r.chapter}:${r.verse}</div>
        <div style="font-size: 0.95rem; color: var(--text-main);">${highlightQuery(r.text, q)}</div>
      </div>
    `).join('');

    // Add click listeners to jump
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const bId = Number(item.dataset.bookId);
        const chap = Number(item.dataset.chap);
        closeModal('modal-search');
        loadScripture(bId, chap);
      });
    });
  });

  // Open Daily Verse Modal
  document.getElementById('btn-open-daily')?.addEventListener('click', () => {
    const dv = getDailyVerse();
    document.getElementById('daily-en-text').textContent = `"${dv.textEn}"`;
    document.getElementById('daily-ta-text').textContent = `"${dv.textTa}"`;
    document.getElementById('daily-ref-text').textContent = `${dv.refEn} | ${dv.refTa}`;
    openModal('modal-daily');
  });

  document.getElementById('btn-copy-daily')?.addEventListener('click', () => {
    const dv = getDailyVerse();
    copyVerseToClipboard(dv, 'dual').then(() => {
      alert('Verse copied to clipboard!');
    });
  });

  document.getElementById('btn-read-daily')?.addEventListener('click', () => {
    const dv = getDailyVerse();
    closeModal('modal-daily');
    loadScripture(dv.bookId, dv.chapter);
  });

  // Open Plans Modal
  document.getElementById('btn-open-plans')?.addEventListener('click', () => {
    renderReadingPlans();
    openModal('modal-plans');
  });

  // Open Saved Bookmarks Modal
  document.getElementById('btn-open-saved')?.addEventListener('click', () => {
    renderSavedModal();
    openModal('modal-saved');
  });

  // Open Settings Modal
  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    openModal('modal-settings');
  });

  // Settings Controls
  document.getElementById('setting-theme-dark')?.addEventListener('click', () => applySettings({ theme: 'dark' }));
  document.getElementById('setting-theme-sepia')?.addEventListener('click', () => applySettings({ theme: 'sepia' }));
  document.getElementById('setting-theme-light')?.addEventListener('click', () => applySettings({ theme: 'light' }));

  document.getElementById('setting-size-sm')?.addEventListener('click', () => applySettings({ fontSize: 'sm' }));
  document.getElementById('setting-size-md')?.addEventListener('click', () => applySettings({ fontSize: 'md' }));
  document.getElementById('setting-size-lg')?.addEventListener('click', () => applySettings({ fontSize: 'lg' }));
  document.getElementById('setting-size-xl')?.addEventListener('click', () => applySettings({ fontSize: 'xl' }));

  // Audio Narration Controls
  const playBtn = document.getElementById('btn-audio-play-pause');
  const stopBtn = document.getElementById('btn-audio-stop');
  const langEnBtn = document.getElementById('btn-audio-lang-en');
  const langTaBtn = document.getElementById('btn-audio-lang-ta');
  const speedSelect = document.getElementById('audio-speed-select');

  langEnBtn?.addEventListener('click', () => {
    currentTtsLang = 'en';
    langEnBtn.classList.add('active');
    langTaBtn.classList.remove('active');
  });

  langTaBtn?.addEventListener('click', () => {
    currentTtsLang = 'ta';
    langTaBtn.classList.add('active');
    langEnBtn.classList.remove('active');
  });

  speedSelect?.addEventListener('change', (e) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
  });

  playBtn?.addEventListener('click', () => {
    const audioState = getAudioState();
    if (audioState.isPlaying) {
      if (audioState.isPaused) {
        resumeAudio();
      } else {
        pauseAudio();
      }
    } else {
      // Start reading chapter
      const scripture = getChapterScripture(currentBookId, currentChapter);
      const versesToRead = currentTtsLang === 'ta' ? scripture.ta : scripture.en;

      playChapterVerses(
        versesToRead,
        currentTtsLang,
        parseFloat(speedSelect ? speedSelect.value : 1.0),
        (verseNum) => {
          currentTtsVerse = verseNum;
          updateAudioUiState();
          // Highlight active verse in reader
          const root = document.getElementById('reader-root');
          renderReaderContent(root, currentBookId, currentChapter, {
            viewMode: settings.viewMode,
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            activeTtsVerse: currentTtsVerse
          });
        },
        () => {
          currentTtsVerse = -1;
          updateAudioUiState();
        }
      );
    }
    updateAudioUiState();
  });

  stopBtn?.addEventListener('click', () => {
    stopAudio();
    currentTtsVerse = -1;
    updateAudioUiState();
    const root = document.getElementById('reader-root');
    renderReaderContent(root, currentBookId, currentChapter, {
      viewMode: settings.viewMode,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      activeTtsVerse: -1
    });
  });

  // Reader Action Delegation (Bookmark, Highlight, Note, Copy, Audio)
  document.getElementById('reader-root')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;

    const row = btn.closest('.verse-row');
    if (!row) return;

    const bookId = Number(row.dataset.bookId);
    const chapter = Number(row.dataset.chapter);
    const verse = Number(row.dataset.verse);
    const action = btn.dataset.action;

    if (action === 'bookmark') {
      toggleBookmark(bookId, chapter, verse);
      btn.classList.toggle('active');
    } else if (action === 'highlight') {
      // Cycle highlight colors: gold -> emerald -> blue -> rose -> none
      const currentH = row.className.match(/highlight-(\w+)/)?.[1] || 'none';
      const colors = ['none', 'gold', 'emerald', 'blue', 'rose', 'violet'];
      const nextColor = colors[(colors.indexOf(currentH) + 1) % colors.length];
      setHighlight(bookId, chapter, verse, nextColor);
      loadScripture(currentBookId, currentChapter);
    } else if (action === 'note') {
      editingNoteVerseObj = { bookId, chapter, verse };
      const book = getBookById(bookId);
      document.getElementById('note-verse-ref-label').textContent = `${book.nameEn} ${chapter}:${verse} (${book.nameTa} ${chapter}:${verse})`;
      document.getElementById('note-input-text').value = getVerseNote(bookId, chapter, verse);
      openModal('modal-note-editor');
    } else if (action === 'copy') {
      const scripture = getChapterScripture(bookId, chapter);
      const enV = scripture.en.find(v => v.verse === verse);
      const taV = scripture.ta.find(v => v.verse === verse);
      const book = getBookById(bookId);
      copyVerseToClipboard({
        textEn: enV ? enV.text : '',
        textTa: taV ? taV.text : '',
        refEn: `${book.nameEn} ${chapter}:${verse}`,
        refTa: `${book.nameTa} ${chapter}:${verse}`
      }).then(() => {
        alert('Verse copied to clipboard!');
      });
    } else if (action === 'audio') {
      const scripture = getChapterScripture(bookId, chapter);
      const versesToRead = currentTtsLang === 'ta' ? scripture.ta.filter(v => v.verse === verse) : scripture.en.filter(v => v.verse === verse);
      playChapterVerses(versesToRead, currentTtsLang, 1.0, (vNum) => {
        currentTtsVerse = vNum;
      }, () => {
        currentTtsVerse = -1;
      });
    }
  });

  // Save Note Modal Button
  document.getElementById('btn-save-note')?.addEventListener('click', () => {
    if (editingNoteVerseObj) {
      const val = document.getElementById('note-input-text').value;
      saveVerseNote(editingNoteVerseObj.bookId, editingNoteVerseObj.chapter, editingNoteVerseObj.verse, val);
      closeModal('modal-note-editor');
      loadScripture(currentBookId, currentChapter);
    }
  });

  // Close Modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.dataset.close;
      closeModal(modalId);
    });
  });

  // Close modal on outside backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
}

function updateAudioUiState() {
  const iconState = document.getElementById('audio-icon-state');
  const audioState = getAudioState();
  if (iconState) {
    if (audioState.isPlaying && !audioState.isPaused) {
      iconState.className = 'fa-solid fa-pause';
    } else {
      iconState.className = 'fa-solid fa-play';
    }
  }
}

// Book Selector Modal Renderer
function renderBookSelector() {
  const booksContainer = document.getElementById('books-list-container');
  const booksView = document.getElementById('books-grid-view');
  const chaptersView = document.getElementById('chapters-grid-view');

  booksView.style.display = 'block';
  chaptersView.style.display = 'none';

  let currentTestamentFilter = 'all';

  function renderBooks() {
    const list = BIBLE_BOOKS.filter(b => {
      if (currentTestamentFilter === 'OT') return b.testament === 'OT';
      if (currentTestamentFilter === 'NT') return b.testament === 'NT';
      return true;
    });

    booksContainer.innerHTML = list.map(b => `
      <div class="book-card-item" data-book-id="${b.id}">
        <div class="name-en">${b.nameEn}</div>
        <div class="name-ta ta-font">${b.nameTa}</div>
      </div>
    `).join('');

    booksContainer.querySelectorAll('.book-card-item').forEach(card => {
      card.addEventListener('click', () => {
        const bId = Number(card.dataset.bookId);
        showChaptersGrid(bId);
      });
    });
  }

  // Testament tabs
  document.querySelectorAll('.testament-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.testament-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentTestamentFilter = e.target.dataset.testament;
      renderBooks();
    });
  });

  renderBooks();
}

function showChaptersGrid(bookId) {
  const book = getBookById(bookId);
  const booksView = document.getElementById('books-grid-view');
  const chaptersView = document.getElementById('chapters-grid-view');
  const titleHeader = document.getElementById('selected-book-title-header');
  const chapContainer = document.getElementById('chapters-list-container');

  booksView.style.display = 'none';
  chaptersView.style.display = 'block';
  titleHeader.textContent = `${book.nameEn} | ${book.nameTa}`;

  let chapButtons = '';
  for (let c = 1; c <= book.chapters; c++) {
    chapButtons += `<button class="chap-num-btn" data-chap="${c}">${c}</button>`;
  }
  chapContainer.innerHTML = chapButtons;

  chapContainer.querySelectorAll('.chap-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chap = Number(btn.dataset.chap);
      closeModal('modal-books');
      loadScripture(bookId, chap);
    });
  });

  const backBtn = document.getElementById('btn-back-to-books');
  if (backBtn) {
    backBtn.onclick = () => {
      booksView.style.display = 'block';
      chaptersView.style.display = 'none';
    };
  }
}

// Reading Plans Renderer
function renderReadingPlans() {
  const container = document.getElementById('plans-container-body');
  container.innerHTML = READING_PLANS.map(plan => `
    <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem;">
      <h4 style="color: var(--accent-gold); font-size: 1.1rem; margin-bottom: 0.3rem;">${plan.titleEn} | ${plan.titleTa}</h4>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">${plan.descriptionEn}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${plan.days.slice(0, 8).map(d => `
          <button class="nav-btn" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;" onclick="window.jumpToPlanDay(${d.bookId}, ${d.chapter})">
            Day ${d.day}: ${d.refEn}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  window.jumpToPlanDay = (bId, chap) => {
    closeModal('modal-plans');
    loadScripture(bId, chap);
  };
}

// Saved Bookmarks & Notes Renderer
function renderSavedModal() {
  const container = document.getElementById('saved-container-body');
  const bookmarks = getBookmarks();
  const notesMap = getNotes();

  let html = `<h4 style="color: var(--accent-gold); margin-bottom: 0.75rem;">Bookmarks (${bookmarks.length})</h4>`;

  if (bookmarks.length === 0) {
    html += `<p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">No bookmarks saved yet. Click the bookmark icon on any verse to save it.</p>`;
  } else {
    html += `<div style="margin-bottom: 1.5rem;">` + bookmarks.map(b => {
      const book = getBookById(b.bookId);
      return `
        <div class="search-result-item" onclick="window.jumpToSaved(${b.bookId}, ${b.chapter})">
          <div class="search-result-ref"><i class="fa-solid fa-bookmark" style="color: var(--accent-gold);"></i> ${book.nameEn} ${b.chapter}:${b.verse} (${book.nameTa} ${b.chapter}:${b.verse})</div>
        </div>
      `;
    }).join('') + `</div>`;
  }

  const noteKeys = Object.keys(notesMap);
  html += `<h4 style="color: var(--accent-gold); margin-bottom: 0.75rem;">Verse Notes (${noteKeys.length})</h4>`;

  if (noteKeys.length === 0) {
    html += `<p style="font-size: 0.9rem; color: var(--text-muted);">No notes created yet. Click the note icon on any verse to write reflection notes.</p>`;
  } else {
    html += noteKeys.map(key => {
      const [bId, chap, vNum] = key.split('_').map(Number);
      const book = getBookById(bId);
      const note = notesMap[key];
      return `
        <div class="search-result-item" onclick="window.jumpToSaved(${bId}, ${chap})">
          <div class="search-result-ref"><i class="fa-solid fa-note-sticky" style="color: var(--accent-blue);"></i> ${book.nameEn} ${chap}:${vNum}</div>
          <div style="font-size: 0.9rem; color: var(--text-main); margin-top: 0.2rem;">"${note.text}"</div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = html;

  window.jumpToSaved = (bId, chap) => {
    closeModal('modal-saved');
    loadScripture(bId, chap);
  };
}

function highlightQuery(text, query) {
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, `<mark style="background: var(--accent-gold); color: #fff; padding: 0 2px; border-radius: 3px;">$1</mark>`);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
