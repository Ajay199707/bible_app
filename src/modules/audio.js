
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

export function playChapterVerses(verses, defaultLang = 'ta', rate = 1.0, onVerseHighlight = null, onComplete = null) {
  stopAudio();

  if (!verses || verses.length === 0) return;

  versesQueue = verses.map(v => ({
    ...v,
    lang: v.lang || defaultLang
  }));
  
  currentLang = defaultLang;
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
  const itemLang = vItem.lang || currentLang;
  
  if (!textToRead) {
    activeVerseIndex++;
    speakNextVerse();
    return;
  }

  // Try Web Speech API first
  if (synth) {
    playWebSpeech(textToRead, itemLang);
  } else {
    playAudioStream(textToRead, itemLang);
  }
}

function playWebSpeech(text, itemLang) {
  try {
    if (synth.paused) synth.resume();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = playbackRate;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    const langObj = getLangByCode(itemLang);
    const targetLang = itemLang === 'en' ? 'en-US' : (itemLang === 'ta' ? 'ta-IN' : (itemLang === 'hi' ? 'hi-IN' : (itemLang === 'ml' ? 'ml-IN' : (itemLang === 'te' ? 'te-IN' : (itemLang === 'kn' ? 'kn-IN' : 'en-US')))));
    currentUtterance.lang = targetLang;

    // Pick best available voice for language
    const voices = availableVoices.length > 0 ? availableVoices : (synth.getVoices() || []);
    if (voices.length > 0) {
      if (itemLang !== 'en') {
        const localVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          const n = (v.name || '').toLowerCase();
          return l.includes(itemLang) || n.includes(langObj.name.toLowerCase());
        });
        if (localVoice) {
          currentUtterance.voice = localVoice;
        } else {
          // No local voice found on system, fallback immediately
          playAudioStream(text, itemLang);
          return;
        }
      } else {
        const enVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
        if (enVoice) currentUtterance.voice = enVoice;
      }
    } else if (itemLang !== 'en') {
      // If voices array is empty (can happen on some browsers), fallback to stream for local languages
      playAudioStream(text, itemLang);
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
      playAudioStream(text, itemLang);
    };

    synth.speak(currentUtterance);
  } catch (e) {
    playAudioStream(text, itemLang);
  }
}

function playAudioStream(text, itemLang) {
  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
    } catch (e) {}
  }

  if (typeof responsiveVoice !== 'undefined') {
    try {
      responsiveVoice.cancel();
    } catch (e) {}
  }

  const cleanText = text.slice(0, 250);
  const targetLang = itemLang;
  
  if (typeof responsiveVoice !== 'undefined') {
    const rvLang = (itemLang === 'ta') ? 'Tamil Male' : 'UK English Male';
    responsiveVoice.speak(cleanText, rvLang, {
      rate: playbackRate,
      onend: () => {
        if (isPlaying && !isPausedState) {
          activeVerseIndex++;
          speakNextVerse();
        }
      },
      onerror: (err) => {
        console.warn('ResponsiveVoice error:', err);
        fallbackToGoogleTTS(cleanText, targetLang);
      }
    });
  } else {
    fallbackToGoogleTTS(cleanText, targetLang);
  }
}

function fallbackToGoogleTTS(cleanText, targetLang) {
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
    if (typeof responsiveVoice !== 'undefined') {
      try { responsiveVoice.pause(); } catch (e) {}
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
    if (typeof responsiveVoice !== 'undefined') {
      try { responsiveVoice.resume(); } catch (e) {}
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

  if (typeof responsiveVoice !== 'undefined') {
    try {
      responsiveVoice.cancel();
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
