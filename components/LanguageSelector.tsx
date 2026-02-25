import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../services/languageContext.tsx';

interface LanguageSelectorProps {
    /** Modo de exibição: 'dropdown' (padrão) ou 'minimal' (só bandeira + seta) */
    variant?: 'dropdown' | 'minimal' | 'full';
    className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    variant = 'dropdown',
    className = '',
}) => {
    const { locale, setLocale, availableLanguages, currentLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (code: typeof locale) => {
        setLocale(code);
        setIsOpen(false);
    };

    // ============================================================
    // VARIANTE MINIMAL — só bandeira e seta (para o header)
    // ============================================================
    if (variant === 'minimal') {
        return (
            <div className={`relative ${className}`} ref={ref}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 p-2.5 text-slate-500 dark:text-slate-400
                     hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    title={currentLanguage.label}
                    aria-label={`Idioma atual: ${currentLanguage.label}`}
                >
                    <span className="text-lg leading-none">{currentLanguage.flag}</span>
                    <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-2xl
                          shadow-2xl border border-slate-100 dark:border-slate-800 z-[100]
                          overflow-hidden animate-in slide-in-from-top-2 duration-150">
                        {availableLanguages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                            transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-left
                            ${locale === lang.code
                                        ? 'text-legal-bronze bg-legal-bronze/5 dark:bg-legal-bronze/10'
                                        : 'text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                <span className="text-base">{lang.flag}</span>
                                <span className="flex-1">{lang.nativeName}</span>
                                {locale === lang.code && (
                                    <Check size={14} className="text-legal-bronze shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============================================================
    // VARIANTE FULL — bandeira + nome + seta (para Settings/Perfil)
    // ============================================================
    if (variant === 'full') {
        return (
            <div className={`relative ${className}`} ref={ref}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800
                     border border-slate-200 dark:border-slate-700 rounded-2xl
                     hover:border-legal-bronze/40 transition-all group"
                >
                    <Globe size={18} className="text-legal-bronze shrink-0" />
                    <span className="text-base">{currentLanguage.flag}</span>
                    <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 text-left">
                        {currentLanguage.label}
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl
                          shadow-2xl border border-slate-100 dark:border-slate-800 z-[100]
                          overflow-hidden animate-in slide-in-from-top-2 duration-150">
                        {availableLanguages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                className={`w-full flex items-center gap-4 px-5 py-4 text-sm font-medium
                            transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-left
                            border-b border-slate-50 dark:border-slate-800 last:border-0
                            ${locale === lang.code
                                        ? 'text-legal-bronze bg-legal-bronze/5 dark:bg-legal-bronze/10'
                                        : 'text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                <span className="text-xl">{lang.flag}</span>
                                <div className="flex-1">
                                    <p className="font-bold leading-none">{lang.nativeName}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{lang.label}</p>
                                </div>
                                {locale === lang.code && (
                                    <Check size={16} className="text-legal-bronze shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ============================================================
    // VARIANTE DROPDOWN — padrão compacto
    // ============================================================
    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2
                   text-slate-600 dark:text-slate-300
                   hover:bg-slate-100 dark:hover:bg-slate-800
                   rounded-xl transition-all text-sm font-bold border
                   border-slate-200 dark:border-slate-700"
            >
                <span className="text-base">{currentLanguage.flag}</span>
                <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl
                        shadow-2xl border border-slate-100 dark:border-slate-800 z-[100]
                        overflow-hidden animate-in slide-in-from-top-2 duration-150">
                    {availableLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                          transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-left
                          ${locale === lang.code
                                    ? 'text-legal-bronze bg-legal-bronze/5'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                        >
                            <span className="text-base">{lang.flag}</span>
                            <span className="flex-1">{lang.label}</span>
                            {locale === lang.code && <Check size={14} className="text-legal-bronze" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
