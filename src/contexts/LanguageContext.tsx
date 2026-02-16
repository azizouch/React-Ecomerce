import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';

export type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage
  const saved = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
  const [language, setLanguageState] = useState<Language>((saved as Language) || 'en');

  useEffect(() => {
    // Apply language to localStorage and HTML element
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    
    // Set text direction for Arabic
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.className = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
      document.body.className = '';
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value?.[k] !== undefined) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') return key;

    if (!vars) return value;

    // simple placeholder replacement: {name}, {count}, etc.
    let out = value;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
