/**
 * AirQuiz — Student Quiz Active View (Mobile-First).
 * Full rewrite: 48px+ touch targets, bottom navigation bar, safe-area aware,
 * no submission storm on reconnect, ROOM_RESET redirection.
 *
 * Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import type { Question } from '@/lib/types';
import { useTranslation } from '@/i18n/LanguageContext';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Flag,
  WifiOff,
} from 'lucide-react';

// Detect RTL text for Arabic exam support
const isArabic = (text: string): boolean =>
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);

export default function QuizActive() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useTranslation();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track which answers have been acknowledged by server to prevent re-sync storm
  const syncedAnswersRef = useRef<Set<string>>(new Set());

  // Flag-for-review: persisted in sessionStorage so it survives reconnects
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

  // ── Socket hook ─────────────────────────────────────────────────────────────
  const { status, connect, send } = useSocket({
    onConnect: () => {
      // Re-join only if we have a session (no-op on first connect)
      if (studentInfo) {
        send({ type: 'JOIN', payload: studentInfo });
      }
    },
    onJoined: (_studentId, _roomState, previousAnswers) => {
      // Restore server-side answers, filling gaps only (local answers take priority)
      if (previousAnswers && Object.keys(previousAnswers).length > 0) {
        setAnswers(prev => {
          const merged = { ...prev };
          for (const [qId, opt] of Object.entries(previousAnswers)) {
            const numId = Number(qId);
            const key = isNaN(numId) ? (qId as unknown as number) : numId;
            if (!merged[key]) {
              merged[key] = opt;
            }
          }
          sessionStorage.setItem('answers', JSON.stringify(merged));
          return merged;
        });
      }
    },
    onStartExam: (qs, _duration, end) => {
      setQuestions(qs);
      setEndTime(end);
      setIsLocked(false);
      setCurrentIndex(0);
      sessionStorage.setItem('examQuestions', JSON.stringify(qs));
      sessionStorage.setItem('examEndTime', end);
      // Reset sync tracker on new exam
      syncedAnswersRef.current = new Set();
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
      toast({ title: t('quiz.examEnded'), description: t('quiz.timeUp'), variant: 'destructive' });
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
    onExamExtended: (_duration, end) => {
      setEndTime(end);
      sessionStorage.setItem('examEndTime', end);
      toast({
        title: t('quiz.timeExtended'),
        description: t('quiz.moreTime'),
        className: 'bg-green-50 border-green-200 text-green-900',
      });
    },
    onRoomReset: () => {
      // Admin reset the room — clear session and go back to waiting
      sessionStorage.removeItem('examQuestions');
      sessionStorage.removeItem('examEndTime');
      sessionStorage.removeItem('answers');
      sessionStorage.removeItem('flaggedQuestions');
      toast({ title: 'Session Ended', description: 'The administrator has reset this session.', variant: 'destructive' });
      navigate('/student');
    },
  });

  // ── Load session on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const sInfo = sessionStorage.getItem('studentInfo');
    if (!sInfo) { navigate('/student'); return; }
    setStudentInfo(JSON.parse(sInfo));

    const storedQuestions = sessionStorage.getItem('examQuestions');
    const storedEndTime = sessionStorage.getItem('examEndTime');

    if (!storedQuestions || !storedEndTime) { navigate('/waiting'); return; }

    // If exam already expired, clear stale data
    if (new Date(storedEndTime).getTime() < Date.now()) {
      sessionStorage.removeItem('examQuestions');
      sessionStorage.removeItem('examEndTime');
      sessionStorage.removeItem('answers');
      sessionStorage.removeItem('flaggedQuestions');
      navigate('/waiting');
      return;
    }

    const loadedQs = JSON.parse(storedQuestions);
    const normalizedQs = loadedQs.map((q: any) => ({
      ...q,
      id: q.id || q.question_id || Math.random(),
    }));
    setQuestions(normalizedQs);
    setEndTime(storedEndTime);

    const storedAnswers = sessionStorage.getItem('answers');
    if (storedAnswers) {
      const parsed = JSON.parse(storedAnswers);
      setAnswers(parsed);
      // Mark locally-held answers as already synced (don't re-send on connect)
      for (const key of Object.keys(parsed)) {
        syncedAnswersRef.current.add(key);
      }
    }

    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!endTime) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((new Date(endTime).getTime() - Date.now()) / 1000));
      setTimeRemaining(diff);
      if (diff <= 0) { setIsLocked(true); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // ── Debounced answer submission ──────────────────────────────────────────────
  const debouncedSubmit = useDebounce((questionId: number, option: string) => {
    send({ type: 'SUBMIT_ANSWER', payload: { questionId, selectedOption: option } });
    syncedAnswersRef.current.add(String(questionId));
  }, 400);

  const handleSelectAnswer = useCallback((questionId: number, option: string) => {
    if (isLocked) return;
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    sessionStorage.setItem('answers', JSON.stringify(newAnswers));
    debouncedSubmit(questionId, option);
  }, [isLocked, debouncedSubmit, answers]);

  // ── Smart reconnect-resync (no storm) ───────────────────────────────────────
  // Only re-submit answers that haven't been synced yet in this session.
  // This covers the case where the student answered offline.
  useEffect(() => {
    if (status === 'connected' && Object.keys(answers).length > 0) {
      const unsynced = Object.entries(answers).filter(
        ([qId]) => !syncedAnswersRef.current.has(qId)
      );
      if (unsynced.length > 0) {
        console.log(`🔄 Re-syncing ${unsynced.length} unsynced answer(s)...`);
        unsynced.forEach(([qId, opt]) => {
          send({ type: 'SUBMIT_ANSWER', payload: { questionId: parseInt(qId), selectedOption: opt as string } });
          syncedAnswersRef.current.add(qId);
        });
      }
    }
  }, [status]); // answers intentionally excluded to avoid loop

  const handleNext = () => { if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir={dir}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-base">{t('quiz.loading')}</span>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isUnansweredCurrent = !answers[currentQuestion.id];
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)' }}>

      {/* ── RECONNECTING OVERLAY ────────────────────────────────────────────── */}
      {status !== 'connected' && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
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

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Logo — hidden on tiny screens to save space */}
          <img src={logo} alt="AirQuiz" className="h-5 w-auto hidden sm:block dark:brightness-0 dark:invert flex-shrink-0" />

          {/* Question navigation bubbles — scrollable with momentum */}
          <div className="flex-1 overflow-x-auto scroll-momentum scrollbar-hide mx-1">
            <div className="flex gap-2 items-center py-1" style={{ minWidth: 'max-content' }}>
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Question ${idx + 1}`}
                  className={`
                    relative h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all flex-shrink-0 touch-manipulation
                    ${currentIndex === idx
                      ? 'bg-blue-600 text-white shadow-md scale-110 ring-2 ring-blue-300'
                      : answers[q.id]
                        ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}
                  `}
                >
                  {idx + 1}
                  {flagged.has(q.id) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right side: counter + timer + status dot */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {answeredCount}/{questions.length}
            </span>
            {timeRemaining !== null && (
              <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors ${
                timeRemaining < 60
                  ? 'bg-red-100 text-red-600 animate-pulse dark:bg-red-900/40 dark:text-red-400'
                  : 'bg-secondary text-foreground'
              }`}>
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </div>
            )}
            <div
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-colors ${
                status === 'connected' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`}
              title={status}
            />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 container max-w-3xl mx-auto px-3 py-4 flex flex-col">
        {isLocked ? (
          /* Exam finished view */
          <div className="flex flex-col items-center justify-center flex-1 space-y-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <div className="h-28 w-28 rounded-full bg-blue-50 dark:bg-blue-950 border-4 border-blue-100 dark:border-blue-800 flex items-center justify-center relative z-10">
                <CheckCircle className="h-14 w-14 text-blue-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">{t('done.goodJob')}</h2>
              <p className="text-muted-foreground text-lg px-6">{t('done.completed')}</p>
            </div>
            <div className="w-full max-w-xs bg-card border rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium mb-2">{t('done.status')}</p>
              <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 py-3 rounded-lg font-medium">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('done.submitted')}
              </div>
              <p className="text-xs text-muted-foreground mt-4">{t('done.waitForResults')}</p>
            </div>
          </div>
        ) : (
          /* Active question card */
          <div className="space-y-3 flex-1 flex flex-col">
            <Card className="border shadow-sm flex-1 flex flex-col">
              <CardHeader className="bg-secondary/20 border-b py-3 px-4">
                <CardTitle
                  className="text-base sm:text-lg flex justify-between items-start font-medium leading-relaxed"
                  dir={isArabic(currentQuestion.text) ? 'rtl' : 'ltr'}
                >
                  <span className={`flex-1 leading-snug ${isArabic(currentQuestion.text) ? 'text-right' : ''}`}>
                    <span className="text-muted-foreground text-sm mr-1">Q{currentIndex + 1}.</span>
                    {currentQuestion.text}
                  </span>
                  {/* Flag toggle — 44px touch target */}
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`ml-3 p-2 rounded-lg transition-colors flex-shrink-0 touch-manipulation ${
                      flagged.has(currentQuestion.id)
                        ? 'text-orange-500 bg-orange-500/10'
                        : 'text-muted-foreground/40 hover:text-orange-400 hover:bg-orange-500/5'
                    }`}
                    title={flagged.has(currentQuestion.id) ? t('quiz.unflag') : t('quiz.flag')}
                    aria-label={flagged.has(currentQuestion.id) ? 'Unflag question' : 'Flag question for review'}
                  >
                    <Flag className="h-5 w-5" />
                  </button>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 px-3 pb-4 flex-1">
                {currentQuestion.imageUrl && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question"
                      className="rounded-lg max-h-48 object-contain w-full"
                    />
                  </div>
                )}
                {/* Answer options — single column, generous touch targets */}
                <div className="flex flex-col gap-2.5">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = answers[currentQuestion.id] === option;
                    const optLabel = String.fromCharCode(65 + optIdx);
                    return (
                      <button
                        key={option}
                        onClick={() => handleSelectAnswer(currentQuestion.id, option)}
                        disabled={isLocked}
                        dir={isArabic(option) ? 'rtl' : 'ltr'}
                        className={`
                          min-h-[52px] px-4 py-3 rounded-xl border-2 transition-all touch-manipulation
                          text-sm sm:text-base text-left w-full
                          ${isArabic(option) ? 'text-right' : 'text-left'}
                          ${isSelected
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-600/30'
                            : 'border-border hover:border-blue-300 hover:bg-accent active:scale-[0.98]'}
                          ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div className={`flex items-center gap-3 ${isArabic(option) ? 'flex-row-reverse' : ''}`}>
                          {/* Option letter badge */}
                          <span className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}>
                            {optLabel}
                          </span>
                          <span className="font-medium text-foreground flex-1">{option}</span>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION BAR (fixed, safe-area aware) ──────────────────── */}
      {!isLocked && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-border shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="container max-w-3xl mx-auto px-3 py-3 flex gap-3">
            {/* Previous */}
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 h-12 text-base touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5 ltr:mr-1 rtl:ml-1" />
              {t('quiz.previous')}
            </Button>

            {/* Next or Finish */}
            {isLastQuestion ? (
              <Button
                size="lg"
                onClick={() => {
                  setIsLocked(true);
                  toast({ title: t('quiz.examFinished'), description: t('quiz.submitted') });
                }}
                className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 touch-manipulation"
              >
                <CheckCircle className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                {t('quiz.finish')}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNext}
                className={`flex-1 h-12 text-base touch-manipulation ${
                  isUnansweredCurrent ? 'opacity-90' : ''
                }`}
              >
                {t('quiz.next')}
                <ChevronRight className="h-5 w-5 ltr:ml-1 rtl:mr-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
