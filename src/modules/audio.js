import { getSettings } from './storage.js';

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
  if (typeof window !== 'undefined' && !htmlAudioElement) {
    try {
      htmlAudioElement = new Audio();
    } catch (e) {}
  }
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
  if (typeof window !== 'undefined' && !htmlAudioElement) {
    try {
      htmlAudioElement = new Audio();
    } catch (e) {}
  }
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

  // Try ResponsiveVoice first as it is cross-browser stable and avoids SpeechSynthesis bugs
  if (typeof responsiveVoice !== 'undefined') {
    playAudioStream(textToRead, itemLang);
  } else if (synth) {
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

    const targetLang = itemLang === 'en' ? 'en-US' : (itemLang === 'ta' ? 'ta-IN' : (itemLang === 'hi' ? 'hi-IN' : (itemLang === 'ml' ? 'ml-IN' : (itemLang === 'te' ? 'te-IN' : (itemLang === 'kn' ? 'kn-IN' : 'en-US')))));
    currentUtterance.lang = targetLang;

    const settings = getSettings();
    const gender = settings.voiceGender || 'male';

    // Pick best available voice for language and gender
    const voices = availableVoices.length > 0 ? availableVoices : (synth.getVoices() || []);
    if (voices.length > 0) {
      // Find voices of target language
      const langVoices = voices.filter(v => {
        const l = (v.lang || '').toLowerCase();
        return l.startsWith(itemLang) || l.includes(itemLang);
      });

      if (langVoices.length > 0) {
        // Look for the preferred gender
        let matchedVoice = langVoices.find(v => {
          const name = (v.name || '').toLowerCase();
          const voiceGender = (name.includes('female') || name.includes('zira') || name.includes('susan') || name.includes('hazel') || name.includes('heera') || name.includes('karen') || name.includes('samantha')) ? 'female' : 
                              (name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('ravi')) ? 'male' : '';
          return voiceGender === gender;
        });

        if (!matchedVoice) {
          // If no specific gender match, try to just pick a fallback
          matchedVoice = langVoices[0];
        }
        currentUtterance.voice = matchedVoice;
      } else {
        // No system voice for this language, fallback to stream
        playAudioStream(text, itemLang);
        return;
      }
    } else {
      // If voices array is empty, fallback to stream for all languages
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
    const settings = getSettings();
    const gender = settings.voiceGender || 'male';
    let rvLang;
    if (itemLang === 'ta') {
      rvLang = (gender === 'female') ? 'Tamil Female' : 'Tamil Male';
    } else {
      rvLang = (gender === 'female') ? 'UK English Female' : 'UK English Male';
    }

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
    } catch (e) {}
  } else {
    try {
      htmlAudioElement = new Audio();
    } catch (e) {}
  }

  if (htmlAudioElement) {
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
