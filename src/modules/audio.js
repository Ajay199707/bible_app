let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta'; // Default audio language to Tamil (தமிழ்)
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;
let availableVoices = [];

export function initAudio() {
  if (!synth) return;

  const loadVoices = () => {
    availableVoices = synth.getVoices();
  };

  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
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

  // Speak verse number and verse text
  const textToRead = `${vItem.verse}. ${vItem.text}`;
  currentUtterance = new SpeechSynthesisUtterance(textToRead);

  // Set language & rate
  currentUtterance.rate = playbackRate;
  currentUtterance.pitch = 1.0;

  if (currentLang === 'ta') {
    currentUtterance.lang = 'ta-IN';
    // Search for best Tamil voice
    const voices = availableVoices.length > 0 ? availableVoices : synth.getVoices();
    const taVoice = voices.find(v => 
      v.lang.toLowerCase().includes('ta') || 
      v.name.toLowerCase().includes('tamil') ||
      v.name.toLowerCase().includes('ta-in')
    );
    if (taVoice) {
      currentUtterance.voice = taVoice;
    }
  } else {
    currentUtterance.lang = 'en-US';
    const voices = availableVoices.length > 0 ? availableVoices : synth.getVoices();
    const enVoice = voices.find(v => 
      v.lang.toLowerCase().startsWith('en') && 
      (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David'))
    );
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
    console.warn('Audio TTS playback warning:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      setTimeout(speakNextVerse, 200);
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
    synth.cancel();
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
