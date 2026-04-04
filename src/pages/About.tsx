/**
 * AirQuiz — About / Why? page.
 * Bilingual (EN/AR) story page with field-test stats.
 * Upgraded UI with glassmorphism, animations, and high-impact stats.
 */

import { useTranslation } from '@/i18n/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Clock, Users, Wifi, Zap, Github, Target, BookOpen, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

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
        { icon: Users, label: t('about.scale'), value: t('about.scaleVal'), highlight: true },
        { icon: Clock, label: t('about.duration'), value: t('about.durationVal') },
        { icon: Wifi, label: t('about.infra'), value: t('about.infraVal') },
        { icon: Zap, label: t('about.perf'), value: t('about.perfVal') },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden" dir={dir}>
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent -z-10" />
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />
            <div className="absolute top-1/2 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl opacity-30 -z-10" />

            {/* header */}
            <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-primary/10 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <img src={logo} alt="AirQuiz" className="h-8 w-auto dark:brightness-0 dark:invert transition-transform hover:scale-105" />
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* main */}
            <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-16 w-full relative">
                {/* hero section */}
                <div className={`text-center space-y-6 animate-in fade-in slide-in-from-top-8 duration-700 ${isAr ? 'font-[IBM_Plex_Sans_Arabic]' : ''}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                        <Target className="h-3 w-3" /> {isAr ? 'رسالتنا' : 'Our Mission'}
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground bg-clip-text">
                        {t('about.title')}
                    </h1>
                    <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        {t('about.subtitle')}
                    </p>
                </div>

                {/* story / vision */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="md:col-span-8 prose prose-lg dark:prose-invert max-w-none">
                        {(isAr ? storyAR : storyEN).split('\n\n').map((paragraph, i) => (
                            <p key={i} className={`text-foreground/80 leading-relaxed text-lg ${isAr ? 'text-right' : ''}`}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                    <div className="md:col-span-4 space-y-4">
                        <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative">
                             <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Quote className="h-12 w-12" />
                            </div>
                            <CardContent className="p-6">
                                <p className={`italic text-primary/80 ${isAr ? 'text-right font-[IBM_Plex_Sans_Arabic]' : ''}`}>
                                    {isAr 
                                        ? '"تحويل التعليم في الجزائر إلى رقمنة حقيقية، أداة تلو الأخرى."'
                                        : '"Transforming education in Algeria through practical digitization, one tool at a time."'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                        <div className="bg-secondary/30 rounded-2xl p-6 border border-border/50 flex flex-col items-center text-center space-y-3">
                            <BookOpen className="h-8 w-8 text-primary" />
                            <h3 className="font-bold">{isAr ? 'نهج عملي' : 'Pragmatic Approach'}</h3>
                            <p className="text-sm text-muted-foreground">{isAr ? 'بناء حلول تعمل في الظروف الحقيقية' : 'Building solutions that work in real-world conditions'}</p>
                        </div>
                    </div>
                </div>

                {/* field test section */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                    <div className={`space-y-3 ${isAr ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="h-px flex-1 bg-border" />
                             <h2 className="text-3xl font-black">{t('about.fieldTest')}</h2>
                             <div className="h-px flex-1 bg-border" />
                        </div>
                        <p className="text-muted-foreground text-center text-lg">{t('about.fieldTestDesc')}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.map(({ icon: Icon, label, value, highlight }) => (
                            <Card 
                                key={label} 
                                className={`
                                    group relative border bg-card/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300
                                    ${highlight ? 'ring-2 ring-primary border-primary/20 scale-[1.02] sm:scale-[1.05] z-10' : 'hover:border-primary/30'}
                                `}
                            >
                                {highlight && (
                                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg animate-bounce">
                                        {isAr ? 'نشط' : 'Active'}
                                    </div>
                                )}
                                <CardContent className="p-6 flex items-center gap-5">
                                    <div className={`
                                        h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-6
                                        ${highlight ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-primary/10 text-primary'}
                                    `}>
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <div className={isAr ? 'text-right flex-1' : ''}>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>{label}</p>
                                        <p className="text-lg font-black text-foreground">{value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* developer + open source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                    <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group overflow-hidden relative">
                        <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Users className="h-32 w-32" />
                        </div>
                        <CardContent className={`p-8 space-y-3 ${isAr ? 'text-right' : ''}`}>
                            <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">{t('about.developer')}</p>
                            <p className="text-3xl font-black text-foreground">
                                {isAr ? 'صلاح الدين مدكور' : 'Salah Eddine Medkour'}
                            </p>
                            <p className="text-sm font-medium text-muted-foreground/80 lowercase">medkoursalaheddine@gmail.com</p>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group">
                        <CardContent className={`p-8 space-y-4 ${isAr ? 'text-right' : ''}`}>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">{t('about.openSource')}</p>
                                <Github className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed font-medium">{t('about.openSourceDesc')}</p>
                            <a
                                href="https://github.com/salahmed-ctrlz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm transition-all hover:gap-4 ${isAr ? 'flex-row-reverse' : ''}`}
                            >
                                <Github className="h-4 w-4" />
                                <span>GitHub Repository</span>
                            </a>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
