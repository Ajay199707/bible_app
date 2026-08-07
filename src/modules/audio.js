let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta'; // 'ta' | 'en'
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;

export function initAudio() {
  stopAudio();
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  // Cancel previous speech when starting a brand new chapter/verse sequence
  stopAudio();

  if (!verses || verses.length === 0 || !synth) return;

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

  try {
    // Unstick synth if browser left it in paused state
    if (synth.paused) {
      synth.resume();
    }

    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = playbackRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // Language configuration
    const targetLang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
    currentUtterance.lang = targetLang;

    // Pick best available voice for language if available
    const voices = synth.getVoices() || [];
    if (voices.length > 0) {
      if (currentLang === 'ta') {
        const taVoice = voices.find(v => (v.lang || '').toLowerCase().includes('ta') || (v.name || '').toLowerCase().includes('tamil'));
        if (taVoice) {
          currentUtterance.voice = taVoice;
        }
      } else {
        const enVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
        if (enVoice) {
          currentUtterance.voice = enVoice;
        }
      }
    }

    currentUtterance.onend = () => {
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        speakNextVerse();
      }
    };

    currentUtterance.onerror = (err) => {
      console.warn('SpeechSynthesis utterance end/error:', err);
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        speakNextVerse();
      }
    };

    synth.speak(currentUtterance);
  } catch (err) {
    console.error('SpeechSynthesis error:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  }
}

export function pauseAudio() {
  if (synth && isPlaying) {
    try {
      synth.pause();
    } catch (e) {}
    isPausedState = true;
  }
}

export function resumeAudio() {
  if (synth && isPausedState) {
    try {
      synth.resume();
    } catch (e) {}
    isPausedState = false;
  }
}

export function stopAudio() {
  isPlaying = false;
  isPausedState = false;
  activeVerseIndex = -1;
  versesQueue = [];

  if (synth) {
    try {
      synth.cancel();
    } catch (e) {}
  }
}

export function setPlaybackRate(rate) {
  playbackRate = rate;
  if (currentUtterance && isPlaying) {
    stopAudio();
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
