import { useTranslation as useI18nTranslation } from 'react-i18next';

// Custom hook that provides additional functionality
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  // Helper function to get current language info
  const getCurrentLanguage = () => {
    return {
      code: i18n.language,
      name: getLanguageName(i18n.language),
      flag: getLanguageFlag(i18n.language)
    };
  };

  // Helper function to get language name
  const getLanguageName = (code) => {
    const names = {
      'en': 'English',
      'fr': 'Français',
      'mg': 'Malagasy'
    };
    return names[code] || 'English';
  };

  // Helper function to get language flag
  const getLanguageFlag = (code) => {
    const flags = {
      'en': '🇺🇸',
      'fr': '🇫🇷',
      'mg': '🇲🇬'
    };
    return flags[code] || '🇺🇸';
  };

  // Helper function to change language
  const changeLanguage = (code) => {
    return i18n.changeLanguage(code);
  };

  // Helper function to check if language is RTL
  const isRTL = () => {
    // Currently all supported languages are LTR
    return false;
  };

  // Helper function to format currency based on language
  const formatCurrency = (amount, currency = 'USD') => {
    const locale = i18n.language === 'mg' ? 'mg-MG' : 
                   i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      // Fallback to simple formatting
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  // Helper function to format date based on language
  const formatDate = (date, options = {}) => {
    const locale = i18n.language === 'mg' ? 'mg-MG' : 
                   i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    try {
      return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(new Date(date));
    } catch (error) {
      // Fallback to simple formatting
      return new Date(date).toLocaleDateString();
    }
  };

  // Helper function to format number based on language
  const formatNumber = (number, options = {}) => {
    const locale = i18n.language === 'mg' ? 'mg-MG' : 
                   i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    
    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      // Fallback to simple formatting
      return number.toString();
    }
  };

  return {
    t,
    i18n,
    getCurrentLanguage,
    getLanguageName,
    getLanguageFlag,
    changeLanguage,
    isRTL,
    formatCurrency,
    formatDate,
    formatNumber
  };
};

export default useTranslation;
