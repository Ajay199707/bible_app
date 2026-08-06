let synth = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'en';
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;

export function initAudio() {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported on this browser.');
  }
}

export function playChapterVerses(verses, lang = 'en', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  stopAudio();

  if (!verses || verses.length === 0 || !synth) return;

  versesQueue = verses;
  currentLang = lang;
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

  const textToRead = `${vItem.verse}. ${vItem.text}`;
  currentUtterance = new SpeechSynthesisUtterance(textToRead);

  // Set language
  currentUtterance.lang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
  currentUtterance.rate = playbackRate;

  // Try finding best voice for Tamil or English
  const voices = synth.getVoices();
  if (currentLang === 'ta') {
    const taVoice = voices.find(v => v.lang.includes('ta') || v.lang.includes('TA'));
    if (taVoice) currentUtterance.voice = taVoice;
  } else {
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Samantha')));
    if (enVoice) currentUtterance.voice = enVoice;
  }

  currentUtterance.onend = () => {
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  };

  currentUtterance.onerror = (err) => {
    console.error('Audio TTS error:', err);
    activeVerseIndex++;
    speakNextVerse();
  };

  synth.speak(currentUtterance);
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
    // restart current verse with new rate
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
