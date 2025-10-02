# Language Support Setup

## Overview

Your application now supports **Hebrew (RTL)** and **English (LTR)** with full internationalization (i18n) support using `react-i18next`.

**Default Language:** Hebrew (עברית)

## What Was Implemented

### 1. i18n Infrastructure
- **Package Dependencies**: Added `i18next` and `react-i18next` to `package.json`
- **Configuration**: Created `/src/i18n/config.js` with language initialization
- **Translation Files**:
  - `/src/i18n/locales/he.json` - Hebrew translations
  - `/src/i18n/locales/en.json` - English translations

### 2. RTL/LTR Support
- **App.js**: Added automatic direction switching based on selected language
- **RTL CSS**: Created `/src/styles/rtl.css` with comprehensive RTL support
- **Font Support**: Hebrew uses Rubik font, English uses Merriweather font
- Document direction (`dir="rtl"` or `dir="ltr"`) is automatically set

### 3. Language Settings UI
- **Settings Modal**: Added new "Language Settings" tab as the first tab
- **Language Selector**: Radio button UI to choose between Hebrew and English
- **Real-time Preview**: Visual feedback showing which language is selected
- All Settings Modal text has been translated

### 4. Settings Integration
- **Default Language**: Set to Hebrew in `DefaultSettings.js`
- **LocalStorage**: Language preference is saved and persists across sessions
- **Apply Changes**: Language switch takes effect when "Apply Changes" is clicked

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install the new dependencies:
- `i18next@^23.11.5`
- `react-i18next@^14.1.2`

### 2. Run the Application

```bash
npm start
```

The app will start with Hebrew as the default language.

### 3. Test Language Switching

1. Open the application
2. Click on Settings (or press CTRL+H)
3. The "Language Settings" tab should be the first tab (highlighted)
4. Select either Hebrew or English
5. Click "Apply Changes"
6. The UI will immediately switch to the selected language with appropriate text direction

## How It Works

### Language Detection
The app checks localStorage for saved language preference on startup. If no preference is found, it defaults to Hebrew.

### Translation Usage
Components use the `useTranslation` hook from `react-i18next`:

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('common.save')}</div>;
}
```

### Direction Switching
The App component automatically updates:
- `document.documentElement.dir` - Sets text direction
- `document.documentElement.lang` - Sets language attribute
- `document.body.style.fontFamily` - Sets appropriate font

### RTL CSS
The `/src/styles/rtl.css` file contains automatic RTL adjustments for:
- Margins and padding (ml-*, mr-*, pl-*, pr-*)
- Flexbox direction
- Text alignment
- Borders
- Positioning
- Icon flipping
- Spacing utilities

## Translation Structure

### Available Translation Keys

#### Common
- `common.apply`, `common.cancel`, `common.save`, etc.

#### Settings
- `settings.title`, `settings.languageSettings`, `settings.hebrew`, `settings.english`, etc.

#### Fields
- `fields.name`, `fields.role`, `fields.department`, etc.

#### Navigation
- `navigation.home`, `navigation.center`, `navigation.filter`, etc.

#### Landing Page
- `landingPage.title`, `landingPage.welcome`, etc.

#### Toast Messages
- `toast.pleaseSelectTable`, `toast.pdfDownloaded`, etc.

#### Errors
- `errors.genericError`, `errors.networkError`, etc.

See `/src/i18n/locales/he.json` and `/src/i18n/locales/en.json` for complete translation keys.

## Next Steps (For Future Development)

### To Add Translations to Other Components:

1. Import the translation hook:
   ```javascript
   import { useTranslation } from 'react-i18next';
   ```

2. Use it in your component:
   ```javascript
   const { t } = useTranslation();
   ```

3. Replace hard-coded strings:
   ```javascript
   // Before
   <button>Save</button>

   // After
   <button>{t('common.save')}</button>
   ```

4. Add the translation keys to both:
   - `/src/i18n/locales/he.json`
   - `/src/i18n/locales/en.json`

### To Add a New Language:

1. Create a new translation file: `/src/i18n/locales/[language-code].json`
2. Copy the structure from `he.json` or `en.json`
3. Translate all strings
4. Add the language to `/src/i18n/config.js`:
   ```javascript
   resources: {
     he: { translation: heTranslations },
     en: { translation: enTranslations },
     [newLanguage]: { translation: newLanguageTranslations }
   }
   ```
5. Add the language option to SettingsModal

## Files Modified

### Core Files
- `/code/package.json` - Added i18n dependencies (i18next, react-i18next)
- `/code/src/index.js` - Import i18n config before App renders
- `/code/src/App.js` - Added language and direction management with useEffect
- `/code/src/components/ToolsComponents/DefaultSettings.js` - Added DEFAULT_LANGUAGE = 'he'
- `/code/src/components/ToolsComponents/SettingsModal.js` - Added language tab and full translations

### New Files
- `/code/src/i18n/config.js` - i18n configuration with synchronous initialization
- `/code/src/i18n/locales/he.json` - Complete Hebrew translations
- `/code/src/i18n/locales/en.json` - Complete English translations
- `/code/src/styles/rtl.css` - Comprehensive RTL support styles
- `/code/LANGUAGE_SETUP.md` - This documentation file

## Important Notes

1. **Default Language**: The app defaults to Hebrew with RTL layout
2. **Initialization**: i18n is initialized in `index.js` BEFORE App component renders
3. **Synchronous Loading**: Uses `useSuspense: false` for immediate loading
4. **Font Families**:
   - Hebrew: Rubik (already included in your fonts)
   - English: Merriweather (already included in your fonts)
5. **Settings Persistence**: Language preference is saved to localStorage
6. **RTL Support**: Comprehensive RTL CSS with `!important` flags
7. **Icon Flipping**: Icons are NOT automatically flipped (prevents layout issues)
8. **Spacing Preserved**: RTL CSS designed to maintain proper spacing

## Troubleshooting

### If app starts in English instead of Hebrew:
1. Open browser console and check for i18n initialization logs
2. Check localStorage: `localStorage.getItem('orgChartSettings')`
3. Clear localStorage to reset: `localStorage.clear()` then refresh
4. The app should log: "Using default language: Hebrew (he)"

### If language doesn't change after clicking Apply:
1. Check browser console for errors
2. Verify the settings modal is saving to localStorage
3. Try refreshing the page after changing language
4. Check console for: "Loaded language from localStorage: [language]"

### If RTL layout has spacing issues:
1. Check that `/src/styles/rtl.css` is imported in `index.js`
2. Verify `document.documentElement.dir` is set to "rtl" in console
3. Check that margin/padding classes (ml-, mr-, pl-, pr-) are being overridden
4. Some custom components may need `!important` flags in RTL CSS

### If icons are flipped incorrectly:
1. The RTL CSS no longer flips ALL icons by default
2. Only icons with class `.flip-rtl` will be flipped
3. Most UI icons should NOT be flipped in RTL

### If translations don't appear:
1. Verify translation keys exist in both `he.json` and `en.json`
2. Check that component is using `useTranslation` hook
3. Ensure `t()` function is called with correct key path
4. Check console for any i18n warnings

### Quick Reset:
```javascript
// Run this in browser console to reset to Hebrew
localStorage.clear();
window.location.reload();
```

## Contact

For questions or issues with the language implementation, refer to the official react-i18next documentation:
https://react.i18next.com/
