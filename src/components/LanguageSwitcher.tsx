/**
 * AirQuiz — Language switcher toggle (EN ↔ عر).
 */

import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
    const { locale, setLocale } = useLanguage();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            title={locale === 'en' ? 'التبديل إلى العربية' : 'Switch to English'}
            className="relative"
        >
            <Languages className="h-[1.2rem] w-[1.2rem]" />
            <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded px-0.5 leading-tight">
                {locale === 'en' ? 'عر' : 'EN'}
            </span>
        </Button>
    );
}
