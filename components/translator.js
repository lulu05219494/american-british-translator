const americanOnly = require('./american-only.js');
const americanToBritishSpelling = require('./american-to-british-spelling.js');
const americanToBritishTitles = require("./american-to-british-titles.js")
const britishOnly = require('./british-only.js')

const LOCALES = ['american-to-british', 'british-to-american'];

function invert(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Keep the capital first letter of the original word ("Paracetamol" -> "Tylenol")
function matchCase(original, translated) {
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return translated[0].toUpperCase() + translated.slice(1);
  }
  return translated;
}

function buildDictionary(locale) {
  if (locale === 'american-to-british') {
    return { ...americanOnly, ...americanToBritishSpelling, ...americanToBritishTitles };
  }
  return { ...britishOnly, ...invert(americanToBritishSpelling), ...invert(americanToBritishTitles) };
}

// One regex for the whole dictionary, longest phrases first, so that
// "car boot sale" wins over "boot" and nothing gets translated twice
function buildRegex(dictionary, timePattern) {
  const keys = Object.keys(dictionary)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  // A word must not be glued to letters, digits, apostrophes or hyphens;
  // titles end with "." so only the start needs that check for them
  const words = `(?<![\\w'-])(?:${keys.join('|')})(?![\\w'-])`;
  return new RegExp(`${timePattern}|${words}`, 'gi');
}

class Translator {

  constructor() {
    this.dictionaries = {};
    this.regexes = {};
    LOCALES.forEach(locale => {
      const dictionary = buildDictionary(locale);
      const lowerDictionary = {};
      Object.keys(dictionary).forEach(key => { lowerDictionary[key.toLowerCase()] = dictionary[key]; });
      this.dictionaries[locale] = lowerDictionary;
      const timePattern = locale === 'american-to-british' ? '\\b\\d{1,2}:\\d{2}\\b' : '\\b\\d{1,2}\\.\\d{2}\\b';
      this.regexes[locale] = buildRegex(dictionary, timePattern);
    });
  }

  isValidLocale(locale) {
    return LOCALES.includes(locale);
  }

  // Returns the translated text; with highlight = true every translated
  // piece is wrapped in <span class="highlight">...</span>
  translate(text, locale, highlight = false) {
    if (!this.isValidLocale(locale)) throw new Error('Invalid value for locale field');

    const dictionary = this.dictionaries[locale];
    return text.replace(this.regexes[locale], match => {
      let translated;
      if (/^\d/.test(match)) {
        translated = locale === 'american-to-british' ? match.replace(':', '.') : match.replace('.', ':');
      } else {
        translated = matchCase(match, dictionary[match.toLowerCase()]);
      }
      return highlight ? `<span class="highlight">${translated}</span>` : translated;
    });
  }

}

module.exports = Translator;
