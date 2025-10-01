# Internationalization (i18n) Guide

This document explains how to use the internationalization system in the Beverage Management System.

## Overview

The application supports 3 languages:
- **English (en)** - Default language
- **French (fr)** - Français
- **Malagasy (mg)** - Malagasy

## Features

### Automatic Language Detection
- Detects system language on first visit
- Falls back to English if system language is not supported
- Remembers user's language preference in localStorage

### Language Selector
- Available in the navbar (when logged in)
- Available on the login page
- Shows current language with flag and name
- Dropdown with all available languages

### Translation System
- Uses react-i18next for translation management
- Comprehensive translation files for all UI elements
- Support for interpolation and pluralization
- Namespace organization for better maintainability

## Usage

### Basic Translation

```javascript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### Using the Custom Hook

```javascript
import { useTranslation } from '../hooks/useTranslation';

const MyComponent = () => {
  const { 
    t, 
    getCurrentLanguage, 
    changeLanguage, 
    formatCurrency, 
    formatDate 
  } = useTranslation();
  
  const currentLang = getCurrentLanguage();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>Current language: {currentLang.name} {currentLang.flag}</p>
      <p>Price: {formatCurrency(99.99)}</p>
      <p>Date: {formatDate(new Date())}</p>
      <button onClick={() => changeLanguage('fr')}>
        Switch to French
      </button>
    </div>
  );
};
```

### Translation with Interpolation

```javascript
const { t } = useTranslation();

// In translation file: "welcome_message": "Welcome, {{name}}!"
return <h1>{t('auth.welcome_message', { name: user.name })}</h1>;
```

### Translation with Pluralization

```javascript
const { t } = useTranslation();

// In translation file:
// "items_count": "{{count}} item",
// "items_count_plural": "{{count}} items"
return <p>{t('common.items_count', { count: items.length })}</p>;
```

## Translation File Structure

```
src/i18n/locales/
├── en.json (English)
├── fr.json (French)
└── mg.json (Malagasy)
```

### Translation Keys Organization

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "inventory": "Inventory"
  },
  "auth": {
    "login": "Login",
    "username": "Username"
  },
  "errors": {
    "general_error": "An error occurred",
    "required_field": "This field is required"
  }
}
```

## Adding New Translations

### 1. Add to Translation Files

Add the new key to all language files:

**en.json:**
```json
{
  "new_section": {
    "new_key": "New Text"
  }
}
```

**fr.json:**
```json
{
  "new_section": {
    "new_key": "Nouveau Texte"
  }
}
```

**mg.json:**
```json
{
  "new_section": {
    "new_key": "Sokajy vaovao"
  }
}
```

### 2. Use in Component

```javascript
const { t } = useTranslation();
return <p>{t('new_section.new_key')}</p>;
```

## Language Detection Logic

The system detects language in this order:

1. **localStorage** - User's previously selected language
2. **navigator.language** - Browser/system language
3. **htmlTag** - HTML lang attribute
4. **fallback** - English (en)

### Supported Browser Languages

- **English**: en, en-US, en-GB, etc.
- **French**: fr, fr-FR, fr-CA, etc.
- **Malagasy**: mg, mg-MG

## Language Selector Component

The `LanguageSelector` component provides:

- Current language display with flag
- Dropdown with all available languages
- Click to change language
- Automatic persistence to localStorage
- Responsive design
- Accessibility support

### Usage

```javascript
import LanguageSelector from '../components/LanguageSelector';

const MyComponent = () => {
  return (
    <div>
      <LanguageSelector />
    </div>
  );
};
```

## Formatting Functions

### Currency Formatting

```javascript
const { formatCurrency } = useTranslation();

// Automatically formats based on current language
formatCurrency(99.99); // $99.99 (EN), 99,99 € (FR), 99,99 $ (MG)
```

### Date Formatting

```javascript
const { formatDate } = useTranslation();

// Automatically formats based on current language
formatDate(new Date()); // January 1, 2024 (EN), 1 janvier 2024 (FR), 1 Janoary 2024 (MG)
```

### Number Formatting

```javascript
const { formatNumber } = useTranslation();

// Automatically formats based on current language
formatNumber(1234.56); // 1,234.56 (EN), 1 234,56 (FR), 1 234,56 (MG)
```

## Best Practices

### 1. Use Descriptive Keys

```javascript
// Good
t('inventory.product_name')
t('sales.payment_status')

// Avoid
t('text1')
t('label2')
```

### 2. Organize by Feature

```javascript
// Good organization
{
  "inventory": {
    "title": "Inventory Management",
    "add_product": "Add Product",
    "edit_product": "Edit Product"
  },
  "sales": {
    "title": "Sales Management",
    "create_sale": "Create Sale",
    "edit_sale": "Edit Sale"
  }
}
```

### 3. Use Interpolation for Dynamic Content

```javascript
// Good
t('welcome_message', { name: user.name })

// Avoid concatenation
t('welcome') + ' ' + user.name
```

### 4. Handle Missing Translations

```javascript
// The system automatically falls back to the key if translation is missing
t('missing.key'); // Returns "missing.key" if not found
```

## Testing Translations

### 1. Manual Testing

- Change language using the language selector
- Verify all text updates correctly
- Check formatting functions work properly
- Test on different screen sizes

### 2. Translation Coverage

- Ensure all user-facing text uses translation keys
- Check that all three languages have the same keys
- Verify no hardcoded text remains

### 3. Browser Testing

- Test with different browser language settings
- Verify language detection works correctly
- Check localStorage persistence

## Troubleshooting

### Common Issues

1. **Translation not showing**
   - Check if the key exists in all language files
   - Verify the key path is correct
   - Ensure the component is using `useTranslation()`

2. **Language not changing**
   - Check browser console for errors
   - Verify i18n is properly initialized
   - Check localStorage for language preference

3. **Formatting not working**
   - Verify the locale is supported
   - Check if the formatting function is being used correctly
   - Test with different number/date formats

### Debug Mode

Enable debug mode in i18n configuration:

```javascript
// In src/i18n/index.js
i18n.init({
  debug: true, // Enable debug mode
  // ... other options
});
```

## Future Enhancements

### Planned Features

1. **RTL Support** - Right-to-left language support
2. **More Languages** - Additional language support
3. **Translation Management** - Admin interface for translations
4. **Auto-translation** - Integration with translation services
5. **Context-aware Translations** - Different translations based on user role

### Adding New Languages

To add a new language:

1. Create new translation file (e.g., `es.json` for Spanish)
2. Add language to `supportedLngs` in i18n config
3. Add language to `LanguageSelector` component
4. Update language detection logic if needed
5. Test thoroughly with native speakers

## Support

For issues with internationalization:

1. Check this documentation
2. Review the translation files
3. Test with different browsers
4. Contact the development team

---

*This guide is updated as new features are added to the internationalization system.*
