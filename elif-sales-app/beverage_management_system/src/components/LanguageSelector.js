import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setCookie, getCookie } from '../utils/cookieUtils';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'mg', name: 'Malagasy', flag: '🇲🇬' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  // Load language from storage on mount
  useEffect(() => {
    const savedLanguage = sessionStorage.getItem('i18nextLng') || 
                         localStorage.getItem('i18nextLng') || 
                         getCookie('i18next') ||
                         'en';
    
    if (savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    
    // Save to sessionStorage (primary), localStorage (backup), and cookie (fallback)
    sessionStorage.setItem('i18nextLng', languageCode);
    localStorage.setItem('i18nextLng', languageCode);
    setCookie('i18next', languageCode, 30); // 30 days
    
    // Show success message
    const message = t('language.language_changed');
    // You can add a toast notification here if you have one
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="language-selector">
      <button 
        className="language-selector-button"
        onClick={toggleDropdown}
        aria-label={t('language.select_language')}
      >
        <span className="language-flag">{currentLanguage.flag}</span>
        <span className="language-name">{currentLanguage.name}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="language-dropdown">
          {languages.map((language) => (
            <button
              key={language.code}
              className={`language-option ${i18n.language === language.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(language.code)}
            >
              <span className="language-flag">{language.flag}</span>
              <span className="language-name">{language.name}</span>
              {i18n.language === language.code && (
                <span className="checkmark">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
