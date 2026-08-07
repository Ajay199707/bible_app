let htmlAudioElement = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta'; // Default Tamil
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;

export function initAudio() {
  stopAudio();
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  stopAudio();

  if (!verses || verses.length === 0) return;

  // Pre-create HTML5 audio element on user gesture
  if (typeof window !== 'undefined' && !htmlAudioElement) {
    htmlAudioElement = new Audio();
  }

  versesQueue = verses;
  currentLang = lang || 'ta';
  playbackRate = rate || 1.0;
  activeVerseIndex = 0;
  onVerseHighlightCallback = onVerseHighlight;
  onEndCallback = onComplete;
  isPlaying = true;
  isPausedState = false;

  speakNextVerse();
}

function speakNextVerse() {
  if (activeVerseIndex < 0 || activeVerseIndex >= versesQueue.length || !isPlaying) {
    isPlaying = false;
    isPausedState = false;
    activeVerseIndex = -1;
    if (onEndCallback) onEndCallback();
    return;
  }

  const vItem = versesQueue[activeVerseIndex];
  if (onVerseHighlightCallback) {
    onVerseHighlightCallback(vItem.verse, activeVerseIndex);
  }

  const textToRead = vItem.text ? vItem.text.trim() : '';
  if (!textToRead) {
    activeVerseIndex++;
    speakNextVerse();
    return;
  }

  playDirectAudioStream(textToRead, currentLang);
}

function playDirectAudioStream(text, lang) {
  if (!htmlAudioElement) {
    htmlAudioElement = new Audio();
  }

  // Sanitize text length per verse chunk
  const cleanText = text.slice(0, 250);
  const targetLang = lang === 'ta' ? 'ta' : 'en';
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;

  // Use no-referrer policy to bypass domain referrer blocking on GitHub Pages & mobile
  htmlAudioElement.referrerPolicy = 'no-referrer';
  htmlAudioElement.src = ttsUrl;
  htmlAudioElement.playbackRate = playbackRate;

  htmlAudioElement.onended = () => {
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  };

  htmlAudioElement.onerror = (err) => {
    console.warn('Audio stream error for verse:', activeVerseIndex, err);
    // Pause on error instead of rapidly skipping all verses
    stopAudio();
  };

  const playPromise = htmlAudioElement.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn('Audio play promise blocked by browser:', err);
      stopAudio();
    });
  }
}

export function pauseAudio() {
  if (isPlaying) {
    isPausedState = true;
    if (htmlAudioElement && !htmlAudioElement.paused) {
      try { htmlAudioElement.pause(); } catch (e) {}
    }
  }
}

export function resumeAudio() {
  if (isPausedState) {
    isPausedState = false;
    if (htmlAudioElement && htmlAudioElement.paused) {
      try { htmlAudioElement.play(); } catch (e) {}
    }
  }
}

export function stopAudio() {
  isPlaying = false;
  isPausedState = false;
  activeVerseIndex = -1;
  versesQueue = [];

  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.currentTime = 0;
      htmlAudioElement.src = '';
    } catch (e) {}
  }
}

export function setPlaybackRate(rate) {
  playbackRate = rate;
  if (htmlAudioElement) {
    htmlAudioElement.playbackRate = rate;
  }
}

export function getAudioState() {
  return {
    isPlaying,
    isPaused: isPausedState,
    activeVerseIndex,
    currentLang
  };
}
