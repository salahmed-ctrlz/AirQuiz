/**
 * AirQuiz - Classroom Assessment Platform
 * Student Quiz Active View
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';
import type { Question } from '@/lib/types';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';

// Helper function to detect if text contains Arabic characters
const isArabic = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicPattern.test(text);
};

export default function QuizActive() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  // Pagination State
  const [currentIndex, setCurrentIndex] = useState(0);

  // Socket Hook
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
      if (active) {
        // Recover timer if missing
        if (remaining > 0) {
          const calculatedEnd = new Date(Date.now() + remaining * 1000).toISOString();
          setEndTime(calculatedEnd);
          sessionStorage.setItem('examEndTime', calculatedEnd);
          setIsLocked(false);
        }
      } else {
        setIsLocked(true);
      }
    },
    onExamEnded: () => {
      setIsLocked(true);
      toast({
        title: "Exam Ended",
        description: "Time is up! Your answers are locked.",
        variant: "destructive"
      });
    },
    onFullResults: (results, finalScore) => {
      sessionStorage.setItem('examResults', JSON.stringify(results));
      sessionStorage.setItem('finalScore', String(finalScore));
      navigate('/results');
    },
    onAckSubmission: (success) => {
      // Silent ack
    },
    onError: (msg) => {
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
    onExamExtended: (duration, end) => {
      setEndTime(end);
      toast({
        title: "Time Extended",
        description: "The instructor has added more time.",
        className: "bg-green-50 border-green-200 text-green-900"
      });
    }
  });

  // Load initial data
  // NOTE: Empty deps - only run on mount
  useEffect(() => {
    const sInfo = sessionStorage.getItem('studentInfo');
    if (!sInfo) {
      // No student info, redirect to login
      navigate('/');
      return;
    }
    setStudentInfo(JSON.parse(sInfo));

    const storedQuestions = sessionStorage.getItem('examQuestions');
    const storedEndTime = sessionStorage.getItem('examEndTime');

    // Check if we have valid exam data
    if (!storedQuestions || !storedEndTime) {
      // No exam data, redirect to waiting room
      navigate('/waiting');
      return;
    }

    // Check if exam has already ended (end time in the past)
    const endTimeDate = new Date(storedEndTime);
    if (endTimeDate.getTime() < Date.now()) {
      // Exam has ended, clear stale data and redirect to waiting
      sessionStorage.removeItem('examQuestions');
      sessionStorage.removeItem('examEndTime');
      sessionStorage.removeItem('answers');
      navigate('/waiting');
      return;
    }

    // Valid exam data exists, load it
    const loadedQs = JSON.parse(storedQuestions);
    setQuestions(loadedQs.map((q: any) => ({ ...q, id: q.question_id || q.id })));
    setEndTime(storedEndTime);

    const storedAnswers = sessionStorage.getItem('answers');
    if (storedAnswers) {
      setAnswers(JSON.parse(storedAnswers));
    }

    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer Logic
  useEffect(() => {
    if (!endTime) return;

    const interval = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));

      setTimeRemaining(diff);

      if (diff <= 0) {
        setIsLocked(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const handleSelectAnswer = useCallback((questionId: number, option: string) => {
    if (isLocked) return;

    // Optimistic update
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    sessionStorage.setItem('answers', JSON.stringify(newAnswers));

    // Send to backend
    send({
      type: 'SUBMIT_ANSWER',
      payload: {
        questionId,
        selectedOption: option
      }
    });
  }, [isLocked, send, answers]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading Exam...</span>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Mobile-Optimized Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-2 py-2 shadow-sm">
        <div className="container max-w-4xl mx-auto flex items-center gap-2 justify-between">
          <img src={logo} alt="AirQuiz" className="h-6 w-auto hidden md:block" />

          {/* Question Bubbles - Scrollable */}
          <div className="flex-1 overflow-x-auto scollbar-hide mx-1">
            <div className="flex gap-1.5 items-center">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`
                              h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all flex-shrink-0
                              ${currentIndex === idx
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : answers[q.id]
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}
                          `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {timeRemaining !== null && (
              <div className={`px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 ${timeRemaining < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-secondary text-foreground'
                }`}>
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </div>
            )}
            {/* Compact Status */}
            <div className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-4 flex flex-col justify-center">
        {isLocked ? (
          <div className="flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in zoom-in duration-500 mt-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
              <div className="h-28 w-28 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center relative z-10">
                <CheckCircle className="h-14 w-14 text-blue-600" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-blue-950">Good Job!</h2>
              <p className="text-muted-foreground text-lg px-6">
                You've completed the exam. We've securely saved all your answers.
              </p>
            </div>

            <div className="w-full max-w-xs bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-blue-900 mb-2">Status</p>
              <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 rounded-lg font-medium">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Submitted
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Please wait for the instructor to reveal the results.
              </p>
            </div>
          </div>
        ) : (
          /* Question Card */
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
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600/20'
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

            {/* Navigation Controls - Simple & Big Targets */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="h-12 text-base"
              >
                <ChevronLeft className="mr-1 h-5 w-5" /> Previous
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button
                  size="lg"
                  onClick={() => {
                    setIsLocked(true);
                    toast({ title: 'Exam Finished', description: 'You have submitted your exam.' });
                  }}
                  disabled={!answers[currentQuestion.id]}
                  className="h-12 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                >
                  Finish <CheckCircle className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!answers[currentQuestion.id]}
                  className="h-12 text-base"
                >
                  Next <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
