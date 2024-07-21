// src/utils/languageUtils.js

export const getLanguage = (text) => {
  const hebrewChars = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
  const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  if (hebrewChars.test(text)) return 'hebrew';
  if (arabicChars.test(text)) return 'arabic';
  return 'default';
};

export const getFontClass = (language) => {
  switch (language) {
    case 'hebrew':
      return 'font-hebrew';
    case 'arabic':
      return 'font-merriweather';
    case 'default':
      return 'font-merriweather';
    default:
      return 'font-merriweather'; // This ensures we always return a font class
  }
};

export const getTextAlignClass = (language) => {
  return language !== 'default' ? 'text-right' : 'text-left';
};

export const getFlexDirectionClass = (language) => {
  return language !== 'default' ? 'flex-row-reverse' : 'flex-row';
};

export const getTextDirection = (language) => {
  return language !== 'default' ? 'rtl' : 'ltr';
};