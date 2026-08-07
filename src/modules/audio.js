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

  // Pre-create/unlock HTML5 Audio element in synchronous click context
  if (typeof window !== 'undefined') {
    if (!htmlAudioElement) {
      htmlAudioElement = new Audio();
    }
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

  // Check native SpeechSynthesis for Tamil voice
  const voices = synth ? (synth.getVoices() || []) : [];
  const taVoice = voices.find(v => 
    (v.lang || '').toLowerCase().includes('ta') || 
    (v.name || '').toLowerCase().includes('tamil')
  );

  if (currentLang === 'ta') {
    if (taVoice) {
      playNativeSpeechSynthesis(textToRead, taVoice);
    } else {
      // Use pre-unlocked HTML5 Audio stream for Tamil
      playTamilAudioDirectStream(textToRead);
    }
  } else {
    playNativeSpeechSynthesis(textToRead, null);
  }
}

function playTamilAudioDirectStream(text) {
  cleanupBlobOnly();

  const cleanText = text.slice(0, 200);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ta&q=${encodeURIComponent(cleanText)}`;

  // Fetch as Blob with no-referrer
  fetch(ttsUrl, { referrerPolicy: 'no-referrer' })
    .then(res => res.blob())
    .then(blob => {
      if (!isPlaying || isPausedState) return;

      activeBlobUrl = URL.createObjectURL(blob);
      if (!htmlAudioElement) htmlAudioElement = new Audio();

      htmlAudioElement.src = activeBlobUrl;
      htmlAudioElement.playbackRate = playbackRate;

      htmlAudioElement.onended = () => {
        cleanupBlobOnly();
        if (isPlaying && !isPausedState) {
          activeVerseIndex++;
          speakNextVerse();
        }
      };

      htmlAudioElement.onerror = (err) => {
        console.warn('Tamil audio stream playback warning:', err);
        cleanupBlobOnly();
        if (isPlaying && !isPausedState) {
          activeVerseIndex++;
          setTimeout(speakNextVerse, 150);
        }
      };

      const playPromise = htmlAudioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Audio play promise blocked, trying native speech fallback:', err);
          playNativeSpeechSynthesis(text, null);
        });
      }
    })
    .catch(err => {
      console.warn('Fetch Tamil audio failed, using native speech fallback:', err);
      playNativeSpeechSynthesis(text, null);
    });
}

function playNativeSpeechSynthesis(text, customVoice) {
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

    if (customVoice) {
      currentUtterance.voice = customVoice;
    } else {
      const voices = synth.getVoices() || [];
      if (voices.length > 0) {
        if (currentLang === 'ta') {
          const taV = voices.find(v => (v.lang || '').toLowerCase().includes('ta') || (v.name || '').toLowerCase().includes('tamil'));
          if (taV) currentUtterance.voice = taV;
        } else {
          const enV = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
          if (enV) currentUtterance.voice = enV;
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

function cleanupBlobOnly() {
  if (activeBlobUrl) {
    try { URL.revokeObjectURL(activeBlobUrl); } catch (e) {}
    activeBlobUrl = null;
  }
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
    } catch (e) {}
  }

  cleanupBlobOnly();
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
