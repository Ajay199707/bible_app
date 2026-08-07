let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
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

  // Check if browser has native Tamil SpeechSynthesis voice
  const voices = synth ? (synth.getVoices() || []) : [];
  const hasNativeTaVoice = voices.some(v => (v.lang || '').toLowerCase().includes('ta') || (v.name || '').toLowerCase().includes('tamil'));

  if (currentLang === 'ta' && !hasNativeTaVoice) {
    // ----------------------------------------------------
    // Online High-Quality Tamil Audio Stream Fallback
    // ----------------------------------------------------
    playOnlineAudioStream(textToRead, 'ta');
  } else {
    // ----------------------------------------------------
    // Native Web Speech API Engine
    // ----------------------------------------------------
    playNativeSpeechSynthesis(textToRead);
  }
}

function playNativeSpeechSynthesis(text) {
  if (!synth) {
    playOnlineAudioStream(text, currentLang);
    return;
  }

  try {
    if (synth.paused) synth.resume();
    if (synth.speaking) synth.cancel();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = playbackRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    const targetLang = currentLang === 'ta' ? 'ta-IN' : 'en-US';
    currentUtterance.lang = targetLang;

    const voices = synth.getVoices() || [];
    if (voices.length > 0) {
      if (currentLang === 'ta') {
        const taVoice = voices.find(v => (v.lang || '').toLowerCase().includes('ta') || (v.name || '').toLowerCase().includes('tamil'));
        if (taVoice) currentUtterance.voice = taVoice;
      } else {
        const enVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
        if (enVoice) currentUtterance.voice = enVoice;
      }
    }

    currentUtterance.onend = () => {
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        speakNextVerse();
      }
    };

    currentUtterance.onerror = (err) => {
      console.warn('Native SpeechSynthesis fallback to audio stream:', err);
      if (isPlaying && !isPausedState) {
        playOnlineAudioStream(text, currentLang);
      }
    };

    synth.speak(currentUtterance);
  } catch (e) {
    playOnlineAudioStream(text, currentLang);
  }
}

function playOnlineAudioStream(text, lang) {
  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
    } catch (e) {}
  }

  // Google Translate TTS audio stream URL
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang === 'ta' ? 'ta' : 'en'}&q=${encodeURIComponent(text)}`;

  htmlAudioElement = new Audio(ttsUrl);
  htmlAudioElement.playbackRate = playbackRate;

  htmlAudioElement.onended = () => {
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      speakNextVerse();
    }
  };

  htmlAudioElement.onerror = (err) => {
    console.warn('Online audio stream error, skipping to next verse:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      setTimeout(speakNextVerse, 200);
    }
  };

  htmlAudioElement.play().catch(err => {
    console.warn('HTML5 Audio playback blocked or failed:', err);
    if (isPlaying && !isPausedState) {
      activeVerseIndex++;
      setTimeout(speakNextVerse, 300);
    }
  });
}

export function pauseAudio() {
  if (isPlaying) {
    isPausedState = true;
    if (synth && synth.speaking) {
      try { synth.pause(); } catch (e) {}
    }
    if (htmlAudioElement) {
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
      htmlAudioElement.currentTime = 0;
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
