/**
 * AirQuiz — Student Results Page (Mobile-First).
 * Score display with animated hero, collapsible per-question details.
 *
 * Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Home, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Footer } from '@/components/Footer';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';

interface StudentInfo {
  firstName: string;
  lastName: string;
  group: string;
}

interface QuestionResult {
  question_id: number;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  statistics?: Record<string, number>;
}

export default function Results() {
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('studentInfo');
    const score   = sessionStorage.getItem('finalScore');
    const rawResults  = sessionStorage.getItem('examResults');
    const rawQuestions = sessionStorage.getItem('examQuestions');

    if (stored)       setStudentInfo(JSON.parse(stored));
    if (score)        setFinalScore(parseInt(score, 10));
    if (rawResults)   setResults(JSON.parse(rawResults));
    if (rawQuestions) setQuestions(JSON.parse(rawQuestions));
  }, []);

  const handleBackToHome = () => {
    sessionStorage.clear();
    navigate('/');
  };

  // FIX: use questions.length (the exam's question count),
  // not Object.keys(results).length (which only counts answered ones).
  const totalQuestions = questions.length || Object.keys(results).length;
  const correctCount   = Object.values(results).filter(r => r.is_correct).length;
  const percentage     = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const scoreColor =
    percentage >= 80 ? 'text-green-600' :
    percentage >= 50 ? 'text-amber-500' :
    'text-red-500';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-4">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          {/* Logo */}
          <div className="flex justify-center pt-2">
            <img src={logo} alt="AirQuiz" className="h-10 w-auto dark:brightness-0 dark:invert" />
          </div>

          <Card className="border-2 overflow-hidden">
            {/* Celebration header */}
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/20 mb-4">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Quiz Complete!</h1>
              {studentInfo && (
                <p className="text-muted-foreground mt-1">
                  Great job, {studentInfo.firstName}!
                </p>
              )}
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Score display */}
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
                  Your Final Score
                </p>
                <p className={`text-7xl font-black tabular-nums ${scoreColor}`}>
                  {finalScore}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {correctCount} / {totalQuestions} correct
                </p>

                {/* Visual progress bar */}
                <div className="mt-4 mx-auto max-w-xs">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>0%</span>
                    <span className="font-semibold">{percentage}%</span>
                    <span>100%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        percentage >= 80 ? 'bg-green-500' :
                        percentage >= 50 ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Show/hide details toggle */}
              {Object.keys(results).length > 0 && (
                <Button
                  variant="outline"
                  className="w-full h-12 text-base touch-manipulation"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? (
                    <>Hide Details <ChevronUp className="ml-2 h-4 w-4" /></>
                  ) : (
                    <>View Answer Details <ChevronDown className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              )}

              {/* Detailed per-question results */}
              {showDetails && Object.keys(results).length > 0 && (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto scroll-momentum scrollbar-hide -mx-1 px-1">
                  {questions.map((q, index) => {
                    // Exhaustive key matching — backend may use numeric or string keys
                    const jsonId = q.question_id !== undefined ? q.question_id : q.id;
                    const result =
                      results[jsonId]          ||
                      results[String(jsonId)]  ||
                      results[q.id]            ||
                      results[String(q.id)]    ||
                      (q.question_id !== undefined
                        ? results[q.question_id] || results[String(q.question_id)]
                        : null);

                    if (!result) return null;

                    const isCorrect = result.is_correct;

                    return (
                      <Card
                        key={jsonId}
                        className={`border-l-4 ${
                          isCorrect
                            ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
                            : 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
                        }`}
                      >
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm font-medium flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <span>
                              <span className="text-muted-foreground">Q{index + 1}.</span> {q.text}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 text-sm space-y-2">
                          {/* Correct answer */}
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-muted-foreground text-xs">Correct:</span>
                            <span className="font-semibold text-green-700 dark:text-green-400">{result.correct_answer}</span>
                          </div>
                          {/* User's answer */}
                          <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                            isCorrect
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'
                              : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                          }`}>
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground text-xs">Your answer:</span>
                            <span className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {result.user_answer || 'No answer'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Thank you message */}
              <div className="text-center p-4 rounded-xl bg-secondary/50">
                <p className="text-foreground text-sm">
                  Thank you for participating in today's quiz session!
                </p>
              </div>

              {/* Back button */}
              <Button
                onClick={handleBackToHome}
                className="w-full h-12 text-base touch-manipulation"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
