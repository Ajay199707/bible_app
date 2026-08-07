let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta'; // Default language setting: Tamil
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;
let availableVoices = [];

export function initAudio() {
  if (!synth) return;

  // Make sure audio is completely stopped on initial load
  stopAudio();

  const loadVoices = () => {
    try {
      availableVoices = synth.getVoices() || [];
    } catch (e) {
      availableVoices = [];
    }
  };

  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  // Always stop previous speech before starting
  stopAudio();

  if (!verses || verses.length === 0 || !synth) return;

  versesQueue = verses;
  currentLang = lang || 'ta';
  playbackRate = rate;
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

  // Speak scripture text directly without reading "1, 2, 3" verse numbers aloud
  const textToRead = vItem.text ? vItem.text.trim() : '';
  if (!textToRead) {
    activeVerseIndex++;
    speakNextVerse();
    return;
  }

  currentUtterance = new SpeechSynthesisUtterance(textToRead);
  currentUtterance.rate = playbackRate;
  currentUtterance.pitch = 1.0;

  if (currentLang === 'ta') {
    currentUtterance.lang = 'ta-IN';
    
    // Find matching Tamil voice if available
    const voices = availableVoices.length > 0 ? availableVoices : (synth.getVoices() || []);
    const taVoice = voices.find(v => {
      const l = (v.lang || '').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return l.startsWith('ta') || l.includes('ta-in') || l.includes('ta_in') || n.includes('tamil') || n.includes('ta-in');
    });

    if (taVoice) {
      currentUtterance.voice = taVoice;
    }
  } else {
    currentUtterance.lang = 'en-US';
    
    const voices = availableVoices.length > 0 ? availableVoices : (synth.getVoices() || []);
    const enVoice = voices.find(v => {
      const l = (v.lang || '').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return l.startsWith('en') && (n.includes('google') || n.includes('natural') || n.includes('samantha') || n.includes('david'));
    });

    if (enVoice) {
      currentUtterance.voice = enVoice;
    }
  }

  currentUtterance.onend = () => {
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  };

  currentUtterance.onerror = (err) => {
    console.warn('Audio TTS error:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      setTimeout(speakNextVerse, 150);
    }
  };

  try {
    synth.speak(currentUtterance);
  } catch (e) {
    console.error('Failed to invoke SpeechSynthesis:', e);
    activeVerseIndex++;
    speakNextVerse();
  }
}

export function pauseAudio() {
  if (synth && isPlaying) {
    synth.pause();
    isPausedState = true;
  }
}

export function resumeAudio() {
  if (synth && isPausedState) {
    synth.resume();
    isPausedState = false;
  }
}

export function stopAudio() {
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {}
  }
  isPlaying = false;
  isPausedState = false;
  activeVerseIndex = -1;
  versesQueue = [];
}

export function setPlaybackRate(rate) {
  playbackRate = rate;
  if (currentUtterance && isPlaying) {
    synth.cancel();
    speakNextVerse();
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
