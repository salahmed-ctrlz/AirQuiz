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
import { Home, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
    percentage >= 80 ? 'text-success' :
    percentage >= 50 ? 'text-warning' :
    'text-destructive';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-4">
        <div className="w-full max-w-2xl mx-auto space-y-5">
          {/* Logo */}
          <div className="flex justify-center pt-2">
            <img src={logo} alt="AirQuiz" className="h-10 w-auto dark:brightness-0 dark:invert" />
          </div>

          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="pt-2 text-center">
                {studentInfo && (
                  <p className="text-muted-foreground">{studentInfo.firstName}, your result</p>
                )}
                <p className={`mt-2 text-7xl font-semibold tabular-nums ${scoreColor}`} dir="ltr">
                  {correctCount}<span className="text-3xl text-muted-foreground"> / {totalQuestions}</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{percentage}% correct</p>
                <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${
                      percentage >= 80 ? 'bg-success' : percentage >= 50 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
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
                            ? 'border-l-green-500 bg-success/10'
                            : 'border-l-red-500 bg-destructive/10'
                        }`}
                      >
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm font-medium flex items-start gap-2">
                            {isCorrect ? (
                              <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            )}
                            <span>
                              <span className="text-muted-foreground">Q{index + 1}.</span> {q.text}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 text-sm space-y-2">
                          {/* Correct answer */}
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/40">
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            <span className="text-muted-foreground text-xs">Correct:</span>
                            <span className="font-semibold text-success">{result.correct_answer}</span>
                          </div>
                          {/* User's answer */}
                          <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                            isCorrect
                              ? 'bg-success/10 border-success/40'
                              : 'bg-destructive/10 border-destructive/40'
                          }`}>
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground text-xs">Your answer:</span>
                            <span className={`font-semibold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
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
