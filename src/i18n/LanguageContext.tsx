/**
 * AirQuiz — Language context for i18n (EN/AR) with RTL support.
 * Persists language choice in localStorage, sets document dir and lang dynamically.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { translations, type TranslationKey } from './translations.ts';

type Locale = 'en' | 'ar';
type Dir = 'ltr' | 'rtl';

interface LanguageContextValue {
    locale: Locale;
    dir: Dir;
    setLocale: (locale: Locale) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'airquiz-lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'ar' ? 'ar' : 'en') as Locale;
    });

    const dir: Dir = locale === 'ar' ? 'rtl' : 'ltr';

    // sync document attributes whenever locale changes
    useEffect(() => {
        document.documentElement.dir = dir;
        document.documentElement.lang = locale;
    }, [locale, dir]);

    const setLocale = useCallback((next: Locale) => {
        localStorage.setItem(STORAGE_KEY, next);
        setLocaleState(next);
    }, []);

    const t = useCallback((key: TranslationKey): string => {
        return translations[locale]?.[key] ?? translations['en'][key] ?? key;
    }, [locale]);

    return (
        <LanguageContext.Provider value={{ locale, dir, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

/** Access the current language and direction. */
export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
}

/** Shorthand for the translation function. */
export function useTranslation() {
    const { t, dir, locale } = useLanguage();
    return { t, dir, locale };
}
