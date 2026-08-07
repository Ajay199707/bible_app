let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let htmlAudioElement = null;
let isPlaying = false;
let isPausedState = false;
let activeVerseIndex = -1;
let versesQueue = [];
let currentLang = 'ta';
let playbackRate = 1.0;
let onVerseHighlightCallback = null;
let onEndCallback = null;
let availableVoices = [];

export function initAudio() {
  stopAudio();
  if (synth) {
    const updateVoices = () => {
      try {
        availableVoices = synth.getVoices() || [];
      } catch (e) {
        availableVoices = [];
      }
    };
    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }
}

export function playChapterVerses(verses, lang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  stopAudio();

  if (!verses || verses.length === 0) return;

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

  // Try Web Speech API first
  if (synth) {
    playWebSpeech(textToRead);
  } else {
    playAudioStream(textToRead);
  }
}

function playWebSpeech(text) {
  try {
    if (synth.paused) synth.resume();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = playbackRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    const targetLang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
    currentUtterance.lang = targetLang;

    // Pick best available voice for language
    const voices = availableVoices.length > 0 ? availableVoices : (synth.getVoices() || []);
    if (voices.length > 0) {
      if (currentLang === 'ta') {
        const taVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          const n = (v.name || '').toLowerCase();
          return l.includes('ta') || n.includes('tamil');
        });
        if (taVoice) {
          currentUtterance.voice = taVoice;
        } else {
          // No Tamil voice found on system, fallback immediately
          playAudioStream(text);
          return;
        }
      } else {
        const enVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
        if (enVoice) currentUtterance.voice = enVoice;
      }
    } else if (currentLang === 'ta') {
      // If voices array is empty (can happen on some browsers), fallback to stream for Tamil
      playAudioStream(text);
      return;
    }

    currentUtterance.onend = () => {
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        speakNextVerse();
      }
    };

    currentUtterance.onerror = (err) => {
      console.warn('WebSpeech error, trying Audio Stream fallback:', err);
      playAudioStream(text);
    };

    synth.speak(currentUtterance);
  } catch (e) {
    playAudioStream(text);
  }
}

function playAudioStream(text) {
  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
    } catch (e) {}
  }

  const cleanText = text.slice(0, 250);
  const targetLang = currentLang === 'ta' ? 'ta' : 'en';
  const ttsUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${targetLang}&q=${encodeURIComponent(cleanText)}`;

  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
    } catch (e) {}
  }

  htmlAudioElement = new Audio();
  htmlAudioElement.src = ttsUrl;
  htmlAudioElement.playbackRate = playbackRate;

  htmlAudioElement.onended = () => {
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  };

  htmlAudioElement.onerror = (err) => {
    console.warn('Audio stream play error:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      if (onEndCallback) onEndCallback();
    }
  };

  htmlAudioElement.play().catch(err => {
    console.warn('HTML5 Audio play blocked by browser policy:', err);
  });
}

export function pauseAudio() {
  if (isPlaying) {
    isPausedState = true;
    if (synth && synth.speaking) {
      try { synth.pause(); } catch (e) {}
    }
    if (htmlAudioElement && !htmlAudioElement.paused) {
      try { htmlAudioElement.pause(); } catch (e) {}
    }
  }
}

export function resumeAudio() {
  if (isPausedState) {
    isPausedState = false;
    if (synth && synth.paused) {
      try { synth.resume(); } catch (e) {}
    }
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

  if (synth) {
    try { synth.cancel(); } catch (e) {}
  }

  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
      htmlAudioElement = null;
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
