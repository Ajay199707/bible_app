// Language registry for Holy Bible App
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English',    flag: 'EN', dataFile: 'english_bible.json',   rvVoice: 'UK English Male', fontClass: '',        bibleName: 'Holy Bible' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',      flag: 'TA', dataFile: 'tamil_bible.json',     rvVoice: 'Tamil Male',      fontClass: 'ta-font', bibleName: 'தமிழ் வேதாகமம்' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',     flag: 'HI', dataFile: 'hindi_bible.json',     rvVoice: 'Hindi Male',      fontClass: '',        bibleName: 'पवित्र बाइबिल' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',     flag: 'ML', dataFile: 'malayalam_bible.json', rvVoice: 'Malayalam Male',  fontClass: '',        bibleName: 'സത്യവേദപുസ്തകം' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',     flag: 'TE', dataFile: 'telugu_bible.json',    rvVoice: 'Telugu Male',     fontClass: '',        bibleName: 'పరిశుద్ధ గ్రంథము' },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ',      flag: 'KN', dataFile: 'kannada_bible.json',   rvVoice: 'Kannada Male',    fontClass: '',        bibleName: 'ಪರಿಶುದ್ಧ ಬೈಬಲ್' },
];

export function getLangByCode(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}
