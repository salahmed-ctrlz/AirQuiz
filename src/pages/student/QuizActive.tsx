/**
 * AirQuiz — Student Quiz Active View.
 * Handles question display, navigation, flagging, answers, and connection health.
 *
 * Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import type { Question } from '@/lib/types';
import { useTranslation } from '@/i18n/LanguageContext';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Clock, Flag, WifiOff } from 'lucide-react';

// detect RTL text for Arabic exam support
const isArabic = (text: string): boolean => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

export default function QuizActive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  // core state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // navigation
  const [currentIndex, setCurrentIndex] = useState(0);

  // flag-for-review: persisted in sessionStorage so it survives reconnects
  const [flagged, setFlagged] = useState<Set<number>>(() => {
    const stored = sessionStorage.getItem('flaggedQuestions');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      sessionStorage.setItem('flaggedQuestions', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // socket hook
  const { status, connect, send, isDemo } = useSocket({
    onConnect: () => {
      if (studentInfo) {
        send({ type: 'JOIN', payload: studentInfo });
      }
    },
    onStartExam: (qs, duration, end) => {
      setQuestions(qs);
      setEndTime(end);
      setIsLocked(false);
      setCurrentIndex(0);
    },
    onExamStatus: (active, remaining) => {
      if (active && remaining > 0) {
        const calculatedEnd = new Date(Date.now() + remaining * 1000).toISOString();
        setEndTime(calculatedEnd);
        sessionStorage.setItem('examEndTime', calculatedEnd);
        setIsLocked(false);
      } else if (!active) {
        setIsLocked(true);
      }
    },
    onExamEnded: () => {
      setIsLocked(true);
      toast({ title: t('quiz.examEnded'), description: t('quiz.timeUp'), variant: "destructive" });
    },
    onFullResults: (results, finalScore) => {
      sessionStorage.setItem('examResults', JSON.stringify(results));
      sessionStorage.setItem('finalScore', String(finalScore));
      navigate('/results');
    },
    onAckSubmission: () => { /* silent */ },
    onError: (msg) => {
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
    onExamExtended: (duration, end) => {
      setEndTime(end);
      toast({ title: t('quiz.timeExtended'), description: t('quiz.moreTime'), className: "bg-green-50 border-green-200 text-green-900" });
    }
  });

  // load session on mount
  useEffect(() => {
    const sInfo = sessionStorage.getItem('studentInfo');
    if (!sInfo) { navigate('/student'); return; }
    setStudentInfo(JSON.parse(sInfo));

    const storedQuestions = sessionStorage.getItem('examQuestions');
    const storedEndTime = sessionStorage.getItem('examEndTime');

    if (!storedQuestions || !storedEndTime) { navigate('/waiting'); return; }

    // if exam already expired, clear stale data
    if (new Date(storedEndTime).getTime() < Date.now()) {
      sessionStorage.removeItem('examQuestions');
      sessionStorage.removeItem('examEndTime');
      sessionStorage.removeItem('answers');
      sessionStorage.removeItem('flaggedQuestions');
      navigate('/waiting');
      return;
    }

    const loadedQs = JSON.parse(storedQuestions);
    setQuestions(loadedQs.map((q: any) => ({ ...q, id: q.question_id || q.id })));
    setEndTime(storedEndTime);

    const storedAnswers = sessionStorage.getItem('answers');
    if (storedAnswers) setAnswers(JSON.parse(storedAnswers));

    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // countdown timer
  useEffect(() => {
    if (!endTime) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((new Date(endTime).getTime() - Date.now()) / 1000));
      setTimeRemaining(diff);
      if (diff <= 0) { setIsLocked(true); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const handleSelectAnswer = useCallback((questionId: number, option: string) => {
    if (isLocked) return;
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    sessionStorage.setItem('answers', JSON.stringify(newAnswers));
    send({ type: 'SUBMIT_ANSWER', payload: { questionId, selectedOption: option } });
  }, [isLocked, send, answers]);

  const handleNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // loading state
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={dir}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t('quiz.loading')}</span>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isDisconnected = status !== 'connected' && status !== 'connecting';

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col" dir={dir}>
      {/* === RECONNECTING OVERLAY === */}
      {status !== 'connected' && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border rounded-2xl p-8 shadow-2xl text-center space-y-4 max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('quiz.connectionLost')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('quiz.reconnecting')}<br />
                <span className="text-xs">{t('quiz.answersSaved')}</span>
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        </div>
      )}

      {/* === HEADER — nav bubbles + timer === */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-2 py-2 shadow-sm">
        <div className="container max-w-4xl mx-auto flex items-center gap-2 justify-between">
          <img src={logo} alt="AirQuiz" className="h-6 w-auto hidden md:block dark:brightness-0 dark:invert" />

          {/* question navigation bubbles */}
          <div className="flex-1 overflow-x-auto scrollbar-hide mx-1">
            <div className="flex gap-1.5 items-center">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                    relative h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all flex-shrink-0
                    ${currentIndex === idx
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : answers[q.id]
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}
                  `}
                >
                  {idx + 1}
                  {/* flag indicator: small orange dot */}
                  {flagged.has(q.id) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* progress counter */}
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              {answeredCount}/{questions.length}
            </span>
            {timeRemaining !== null && (
              <div className={`px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 ${timeRemaining < 60 ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900/40 dark:text-red-400' : 'bg-secondary text-foreground'
                }`}>
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </div>
            )}
            {/* connection heartbeat dot */}
            <div className={`h-2.5 w-2.5 rounded-full transition-colors ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`} title={status} />
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col justify-center">
        {isLocked ? (
          /* exam finished view */
          <div className="flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500 mt-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <div className="h-28 w-28 rounded-full bg-blue-50 dark:bg-blue-950 border-4 border-blue-100 dark:border-blue-800 flex items-center justify-center relative z-10">
                <CheckCircle className="h-14 w-14 text-blue-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">{t('done.goodJob')}</h2>
              <p className="text-muted-foreground text-lg px-6">
                {t('done.completed')}
              </p>
            </div>
            <div className="w-full max-w-xs bg-card border rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium mb-2">{t('done.status')}</p>
              <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 py-2 rounded-lg font-medium">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('done.submitted')}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {t('done.waitForResults')}
              </p>
            </div>
          </div>
        ) : (
          /* active question card */
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="bg-secondary/20 border-b py-3 px-4">
                <CardTitle
                  className="text-base sm:text-lg flex justify-between items-start font-medium leading-relaxed"
                  dir={isArabic(currentQuestion.text) ? 'rtl' : 'ltr'}
                >
                  <span className={isArabic(currentQuestion.text) ? 'text-right w-full' : ''}>
                    <span className={`text-muted-foreground ${isArabic(currentQuestion.text) ? 'ml-1' : 'mr-1'}`}>Q{currentIndex + 1}.</span> {currentQuestion.text}
                  </span>
                  {/* flag toggle */}
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`ml-2 p-1.5 rounded-md transition-colors flex-shrink-0 ${flagged.has(currentQuestion.id)
                        ? 'text-orange-500 bg-orange-500/10'
                        : 'text-muted-foreground/40 hover:text-orange-400 hover:bg-orange-500/5'
                      }`}
                    title={flagged.has(currentQuestion.id) ? t('quiz.unflag') : t('quiz.flag')}
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 px-4 pb-6">
                {currentQuestion.imageUrl && (
                  <div className="mb-4 flex justify-center">
                    <img src={currentQuestion.imageUrl} alt="Question" className="rounded-lg max-h-48 object-contain" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelectAnswer(currentQuestion.id, option)}
                      disabled={isLocked}
                      dir={isArabic(option) ? 'rtl' : 'ltr'}
                      className={`
                        p-3.5 rounded-lg transition-all border relative text-sm sm:text-base
                        ${isArabic(option) ? 'text-right' : 'text-left'}
                        ${answers[currentQuestion.id] === option
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm ring-1 ring-blue-600/20'
                          : 'border-input hover:border-blue-300 hover:bg-accent'}
                        ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className={`flex items-center justify-between gap-3 ${isArabic(option) ? 'flex-row-reverse' : ''}`}>
                        <span className="font-medium text-foreground">{option}</span>
                        {answers[currentQuestion.id] === option && (
                          <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* navigation controls — no answer gate on Next */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={handlePrev} disabled={currentIndex === 0} className="h-12 text-base">
                <ChevronLeft className="h-5 w-5 ltr:mr-1 rtl:ml-1" /> {t('quiz.previous')}
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button
                  size="lg"
                  onClick={() => { setIsLocked(true); toast({ title: t('quiz.examFinished'), description: t('quiz.submitted') }); }}
                  className="h-12 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                >
                  {t('quiz.finish')} <CheckCircle className="h-5 w-5 ltr:ml-2 rtl:mr-2" />
                </Button>
              ) : (
                <Button size="lg" onClick={handleNext} className="h-12 text-base">
                  {t('quiz.next')} <ChevronRight className="h-5 w-5 ltr:ml-1 rtl:mr-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
