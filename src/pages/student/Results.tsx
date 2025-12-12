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
    const score = sessionStorage.getItem('finalScore');
    const examResults = sessionStorage.getItem('examResults');
    const examQuestions = sessionStorage.getItem('examQuestions');

    if (stored) {
      setStudentInfo(JSON.parse(stored));
    }
    if (score) {
      setFinalScore(parseInt(score, 10));
    }
    if (examResults) {
      setResults(JSON.parse(examResults));
    }
    if (examQuestions) {
      setQuestions(JSON.parse(examQuestions));
    }
  }, []);

  const handleBackToHome = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const totalQuestions = Object.keys(results).length || questions.length;
  const correctCount = Object.values(results).filter(r => r.is_correct).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 p-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div className="flex justify-center">
            <img src={logo} alt="AirQuiz" className="h-12 w-auto" />
          </div>

          <Card className="border-2 overflow-hidden">
            {/* Celebration Header */}
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/20 mb-4">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Quiz Complete!</h1>
              {studentInfo && (
                <p className="text-muted-foreground mt-2">
                  Great job, {studentInfo.firstName}!
                </p>
              )}
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Score Display */}
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Your Final Score
                </p>
                <p className="text-6xl font-bold text-primary tabular-nums">
                  {finalScore}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {correctCount} / {totalQuestions} correct
                </p>
              </div>

              {/* Show/Hide Details Toggle */}
              {Object.keys(results).length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? (
                    <>Hide Details <ChevronUp className="ml-2 h-4 w-4" /></>
                  ) : (
                    <>View Answer Details <ChevronDown className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              )}

              {/* Detailed Results */}
              {showDetails && Object.keys(results).length > 0 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {questions.map((q, index) => {
                    const questionId = q.question_id || q.id;
                    const result = results[questionId];
                    if (!result) return null;

                    const isCorrect = result.is_correct;

                    return (
                      <Card
                        key={questionId}
                        className={`border-l-4 ${isCorrect ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}
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
                          {/* Show the correct answer prominently */}
                          <div className="flex items-center gap-2 p-2 rounded bg-green-100 border border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-muted-foreground">Correct:</span>
                            <span className="font-semibold text-green-700">{result.correct_answer}</span>
                          </div>

                          {/* Show user's answer */}
                          <div className={`flex items-center gap-2 p-2 rounded ${isCorrect ? 'bg-green-50 border border-green-100' : 'bg-red-100 border border-red-200'}`}>
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-muted-foreground">Your answer:</span>
                            <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {result.user_answer || 'No answer'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Thank You Message */}
              <div className="text-center p-4 rounded-xl bg-secondary/50">
                <p className="text-foreground">
                  Thank you for participating in today's quiz session!
                </p>
              </div>

              {/* Back Button */}
              <Button
                onClick={handleBackToHome}
                className="w-full h-12"
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

