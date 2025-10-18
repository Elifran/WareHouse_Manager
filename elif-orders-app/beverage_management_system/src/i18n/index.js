import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import mgTranslations from './locales/mg.json';

const resources = {
  en: {
    translation: enTranslations
  },
  fr: {
    translation: frTranslations
  },
  mg: {
    translation: mgTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    debug: false,
    
    detection: {
      order: ['sessionStorage', 'localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['sessionStorage', 'localStorage', 'cookie'],
      lookupSessionStorage: 'i18nextLng',
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
      cookieMinutes: 60 * 24 * 30, // 30 days
      cookieDomain: window.location.hostname,
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Language mapping for better detection
    load: 'languageOnly',
    
    // Supported languages
    supportedLngs: ['en', 'fr', 'mg'],
    
    // Language names for display
    lng: 'fr', // Default language
    
    // Namespaces
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Save language to storage on change
    saveMissing: false,
    
    // React options
    react: {
      useSuspense: false,
    },
  });

export default i18n;
