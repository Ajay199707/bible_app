let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let htmlAudioElement = null;
let activeBlobUrl = null;
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

  // Check if native SpeechSynthesis has native Tamil voice installed
  const voices = synth ? (synth.getVoices() || []) : [];
  const hasNativeTaVoice = voices.some(v => 
    (v.lang || '').toLowerCase().includes('ta') || 
    (v.name || '').toLowerCase().includes('tamil')
  );

  if (currentLang === 'ta' && !hasNativeTaVoice) {
    // ----------------------------------------------------
    // Unrestricted Blob-based Tamil Audio Streamer
    // ----------------------------------------------------
    playTamilBlobAudioStream(textToRead);
  } else {
    // ----------------------------------------------------
    // Native Web Speech API Engine
    // ----------------------------------------------------
    playNativeSpeechSynthesis(textToRead);
  }
}

function playTamilBlobAudioStream(text) {
  cleanupBlobAudio();

  // Limit chunk size for reliable TTS response
  const cleanText = text.slice(0, 200);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ta&q=${encodeURIComponent(cleanText)}`;

  fetch(ttsUrl, { referrerPolicy: 'no-referrer' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      if (!isPlaying || isPausedState) return;

      activeBlobUrl = URL.createObjectURL(blob);
      htmlAudioElement = new Audio(activeBlobUrl);
      htmlAudioElement.playbackRate = playbackRate;

      htmlAudioElement.onended = () => {
        cleanupBlobAudio();
        if (isPlaying && !isPausedState) {
          activeVerseIndex++;
          speakNextVerse();
        }
      };

      htmlAudioElement.onerror = (err) => {
        console.warn('Tamil blob audio play warning:', err);
        cleanupBlobAudio();
        if (isPlaying && !isPausedState) {
          activeVerseIndex++;
          setTimeout(speakNextVerse, 150);
        }
      };

      return htmlAudioElement.play();
    })
    .catch(err => {
      console.warn('Failed to fetch Tamil blob audio stream, trying native speech fallback:', err);
      playNativeSpeechSynthesis(text);
    });
}

function playNativeSpeechSynthesis(text) {
  if (!synth) {
    activeVerseIndex++;
    speakNextVerse();
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
      console.warn('Native SpeechSynthesis warning:', err);
      if (isPlaying && !isPausedState) {
        activeVerseIndex++;
        setTimeout(speakNextVerse, 150);
      }
    };

    synth.speak(currentUtterance);
  } catch (e) {
    activeVerseIndex++;
    speakNextVerse();
  }
}

function cleanupBlobAudio() {
  if (activeBlobUrl) {
    try { URL.revokeObjectURL(activeBlobUrl); } catch (e) {}
    activeBlobUrl = null;
  }
  if (htmlAudioElement) {
    try {
      htmlAudioElement.pause();
      htmlAudioElement.src = '';
    } catch (e) {}
    htmlAudioElement = null;
  }
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

  cleanupBlobAudio();
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
