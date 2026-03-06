/**
 * AirQuiz — Landing page.
 * Split choice: "Student" / "Teacher" with i18n + language switcher.
 */

import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Info } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/i18n/LanguageContext';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

export default function Landing() {
    const navigate = useNavigate();
    const { t, dir } = useTranslation();

    return (
        <div className="min-h-screen flex flex-col bg-background" dir={dir}>
            {/* top bar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <LanguageSwitcher />
                <ThemeToggle />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-6 gap-10">
                {/* branding */}
                <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <img src={logo} alt="AirQuiz" className="h-20 w-auto mx-auto dark:brightness-0 dark:invert" />
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        {t('landing.subtitle')}
                    </p>
                </div>

                {/* role selection cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {/* student card */}
                    <button
                        onClick={() => navigate('/student')}
                        className="group relative flex flex-col items-center gap-5 p-10 rounded-2xl border-2 border-border
                       bg-card hover:border-primary hover:shadow-xl hover:shadow-primary/10
                       transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center
                            group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                            <GraduationCap className="h-10 w-10 text-primary" />
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-xl font-bold">{t('landing.student')}</h2>
                            <p className="text-sm text-muted-foreground">{t('landing.studentDesc')}</p>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-primary/20
                            group-hover:w-20 group-hover:bg-primary transition-all duration-300" />
                    </button>

                    {/* teacher card */}
                    <button
                        onClick={() => navigate('/admin')}
                        className="group relative flex flex-col items-center gap-5 p-10 rounded-2xl border-2 border-border
                       bg-card hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10
                       transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                        <div className="h-20 w-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center
                            group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                            <BookOpen className="h-10 w-10 text-emerald-500" />
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-xl font-bold">{t('landing.teacher')}</h2>
                            <p className="text-sm text-muted-foreground">{t('landing.teacherDesc')}</p>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-emerald-500/20
                            group-hover:w-20 group-hover:bg-emerald-500 transition-all duration-300" />
                    </button>
                </div>

                {/* about link */}
                <button
                    onClick={() => navigate('/about')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors animate-in fade-in duration-1000"
                >
                    <Info className="h-4 w-4" />
                    {t('landing.about')}
                </button>
            </main>

            <Footer />
        </div>
    );
}
