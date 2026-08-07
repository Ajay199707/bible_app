let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta'; // Default Tamil
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;

export function initAudio() {
  if (!synth) return;
  // Ensure synth is not stuck in paused state on page load
  try {
    if (synth.paused) {
      synth.resume();
    }
  } catch (e) {}
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  if (!verses || verses.length === 0 || !synth) return;

  // Unstick synth if browser left it in paused state
  try {
    if (synth.paused) synth.resume();
    if (synth.speaking) synth.cancel();
  } catch (e) {}

  versesQueue = verses;
  currentLang = lang || 'ta';
  playbackRate = rate || 1.0;
  activeVerseIndex = 0;
  onVerseHighlightCallback = onVerseHighlight;
  onEndCallback = onComplete;
  isPlaying = true;
  isPausedState = false;

  // Short timeout to allow synth.cancel() to clean up cleanly
  setTimeout(() => {
    speakNextVerse();
  }, 50);
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
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = playbackRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    const targetLang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
    currentUtterance.lang = targetLang;

    // Check available voices
    const voices = synth.getVoices() || [];
    if (voices.length > 0) {
      if (currentLang === 'ta') {
        const taVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          const n = (v.name || '').toLowerCase();
          return l.includes('ta') || n.includes('tamil');
        });
        if (taVoice) {
          currentUtterance.voice = taVoice;
        }
      } else {
        const enVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          return l.startsWith('en');
        });
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
      console.warn('Audio TTS utterance warning/end:', err);
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        setTimeout(speakNextVerse, 100);
      }
    };

    if (synth.paused) synth.resume();
    synth.speak(currentUtterance);
  } catch (err) {
    console.error('SpeechSynthesis error:', err);
    activeVerseIndex++;
    speakNextVerse();
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
    try {
      synth.cancel();
    } catch (e) {}
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
