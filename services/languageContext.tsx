import React, { createContext, useContext, useState, useEffect } from 'react';
import { ptBR } from '../locales/pt-BR.ts';
import { en } from '../locales/en.ts';
import { es } from '../locales/es.ts';
import type { Translations } from '../locales/pt-BR.ts';

// ============================================================
// IDIOMAS DISPONÍVEIS
// ============================================================

export type Locale = 'pt-BR' | 'en' | 'es';

export interface LanguageOption {
    code: Locale;
    label: string;
    flag: string;
    nativeName: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
    { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷', nativeName: 'Português' },
    { code: 'en', label: 'English', flag: '🇺🇸', nativeName: 'English' },
    { code: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
];

const TRANSLATIONS: Record<Locale, Translations> = {
    'pt-BR': ptBR,
    'en': en,
    'es': es,
};

// ============================================================
// CONTEXTO
// ============================================================

interface LanguageContextType {
    locale: Locale;
    t: Translations;
    setLocale: (locale: Locale) => void;
    availableLanguages: LanguageOption[];
    currentLanguage: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>(() => {
        const saved = localStorage.getItem('lexhub-locale') as Locale | null;
        if (saved && TRANSLATIONS[saved]) return saved;

        // Detectar o idioma do navegador
        const browserLang = navigator.language;
        if (browserLang.startsWith('pt')) return 'pt-BR';
        if (browserLang.startsWith('es')) return 'es';
        return 'en';
    });

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('lexhub-locale', newLocale);
        // Atualizar o atributo lang do HTML para acessibilidade e SEO
        document.documentElement.setAttribute('lang', newLocale);
    };

    useEffect(() => {
        document.documentElement.setAttribute('lang', locale);
    }, [locale]);

    const currentLanguage = AVAILABLE_LANGUAGES.find(l => l.code === locale) ?? AVAILABLE_LANGUAGES[0]!;

    return (
        <LanguageContext.Provider value={{
            locale,
            t: TRANSLATIONS[locale],
            setLocale,
            availableLanguages: AVAILABLE_LANGUAGES,
            currentLanguage,
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

// ============================================================
// HOOK
// ============================================================

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage deve ser usado dentro de LanguageProvider');
    return context;
};
