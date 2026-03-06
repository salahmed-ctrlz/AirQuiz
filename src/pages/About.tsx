/**
 * AirQuiz — About / Why? page.
 * Bilingual (EN/AR) story page with field-test stats.
 */

import { useTranslation } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, Wifi, Zap, Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

// full story content kept outside the component to avoid re-creation
const storyEN = `I built AirQuiz to fix a universal teaching nightmare: the inefficiency and error-prone nature of grading paper exams for 180+ students.

Aligned with the Ministry of Higher Education's 'Zero Paper' initiative, and faced with university labs lacking internet or LAN, I developed an offline-first platform. It transforms a single laptop into a local server, allowing students to take real-time exams via a dedicated Wi-Fi network.

I replaced stacks of paper with a local network. This project turned a logistical headache into a smooth, automated operation.`;

const storyAR = `قمت بتطوير AirQuiz لحل كابوس يواجه كل أستاذ: عدم كفاءة وصعوبة تصحيح الامتحانات الورقية لأكثر من 180 طالبًا يدويًا.

تماشياً مع هدف وزارة التعليم العالي "صفر ورقة"، ونظرًا لافتقار المخابر التي أشرفت عليها لشبكة الإنترنت، قمت بتطوير هذه المنصة التي تعمل محليًا (Offline-first). يحول النظام جهازي المحمول إلى خادم محلي، مما يتيح للطلاب إجراء الامتحانات في الوقت الفعلي عبر شبكة Wi-Fi مخصصة.

لقد استبدلت أكوام الورق بشبكة محلية مخصصة. نال هذا الابتكار ترحيب الطلاب وحوّل عبئًا لوجستيًا إلى عملية آلية سلسة.`;

export default function About() {
    const { t, dir, locale } = useTranslation();
    const navigate = useNavigate();
    const isAr = locale === 'ar';

    const stats = [
        { icon: Clock, label: t('about.duration'), value: t('about.durationVal') },
        { icon: Users, label: t('about.scale'), value: t('about.scaleVal') },
        { icon: Wifi, label: t('about.infra'), value: t('about.infraVal') },
        { icon: Zap, label: t('about.perf'), value: t('about.perfVal') },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col" dir={dir}>
            {/* header */}
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <img src={logo} alt="AirQuiz" className="h-8 w-auto dark:brightness-0 dark:invert" />
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* main */}
            <main className="flex-1 max-w-4xl mx-auto px-4 py-10 space-y-12 w-full">
                {/* hero */}
                <div className={`text-center space-y-4 ${isAr ? 'font-[IBM_Plex_Sans_Arabic]' : ''}`}>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{t('about.title')}</h1>
                    <p className="text-xl text-muted-foreground">{t('about.subtitle')}</p>
                </div>

                {/* story */}
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    {(isAr ? storyAR : storyEN).split('\n\n').map((paragraph, i) => (
                        <p key={i} className={`text-foreground/90 leading-relaxed text-lg ${isAr ? 'text-right' : ''}`}>
                            {paragraph}
                        </p>
                    ))}
                </div>

                {/* field test section */}
                <div className="space-y-6">
                    <div className={`space-y-2 ${isAr ? 'text-right' : ''}`}>
                        <h2 className="text-2xl font-bold">{t('about.fieldTest')}</h2>
                        <p className="text-muted-foreground">{t('about.fieldTestDesc')}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {stats.map(({ icon: Icon, label, value }) => (
                            <Card key={label} className="border bg-card hover:shadow-md transition-shadow">
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className={isAr ? 'text-right flex-1' : ''}>
                                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                                        <p className="font-semibold text-foreground mt-0.5">{value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* developer + open source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className={`p-6 space-y-2 ${isAr ? 'text-right' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">{t('about.developer')}</p>
                            <p className="text-xl font-bold">
                                {isAr ? 'صلاح الدين مدكور' : 'Salah Eddine Medkour'}
                            </p>
                            <p className="text-sm text-muted-foreground">medkoursalaheddine@gmail.com</p>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className={`p-6 space-y-3 ${isAr ? 'text-right' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">{t('about.openSource')}</p>
                            <p className="text-sm text-foreground/80">{t('about.openSourceDesc')}</p>
                            <a
                                href="https://github.com/salahmed-ctrlz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ${isAr ? 'flex-row-reverse' : ''}`}
                            >
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
