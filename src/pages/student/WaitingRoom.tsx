/**
 * AirQuiz — Student Waiting Room.
 * Waits for admin to start exam, then auto-navigates to /quiz.
 * Includes a sessionStorage poll as failsafe for instant-start.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/i18n/LanguageContext';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StudentInfo {
  firstName: string;
  lastName: string;
  group: string;
  room_id: string;
}

export default function WaitingRoom() {
  const navigate = useNavigate();
  const { t, dir } = useTranslation();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { status, connect, disconnect, send, isDemo } = useSocket({
    onConnect: () => { /* join logic moved to effect */ },
    onJoined: (studentId, roomState, previousAnswers) => {
      console.log("JOINED success, verifying room alignment:", roomState.roomId);
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('roomState', JSON.stringify(roomState));
      
      // Store previous answers from server so QuizActive can restore them
      if (previousAnswers && Object.keys(previousAnswers).length > 0) {
        sessionStorage.setItem('answers', JSON.stringify(previousAnswers));
      }
      
      // CRITICAL: Standardize the session for the actual roomId the server assigned
      if (roomState.roomId) {
          const stored = sessionStorage.getItem('studentInfo');
          if (stored) {
              const parsed = JSON.parse(stored);
              const updated = { ...parsed, room_id: roomState.roomId };
              sessionStorage.setItem('studentInfo', JSON.stringify(updated));
              setStudentInfo(updated);
          }
      }
      
      setIsJoined(true);
      setErrorMessage(null);
    },
    onStartExam: (questions, duration, endTime) => {
      console.log("Exam starting with", questions.length, "questions");
      sessionStorage.setItem('examQuestions', JSON.stringify(questions));
      sessionStorage.setItem('examEndTime', endTime);
      navigate('/quiz');
    },
    onExamStatus: (active, remaining) => {
      if (active && remaining > 0) {
        console.log('Exam active with', remaining, 's remaining. Waiting for questions...');
      }
    },
    onError: (message) => {
      console.error('Socket error:', message);
      setErrorMessage(message);
    },
  });

  // load student info
  useEffect(() => {
    const stored = sessionStorage.getItem('studentInfo');
    if (!stored) { navigate('/student'); return; }
    const parsed = JSON.parse(stored);
    if (!parsed.room_id) { navigate('/student'); return; }
    setStudentInfo(parsed);
  }, [navigate]);

  // connect once on mount + disconnect on unmount
  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // join room when connected — handles both initial connect and reconnect
  useEffect(() => {
    if (!studentInfo) return;
    if (status === 'connected' && !isJoined) {
      send({ type: 'JOIN', payload: studentInfo });
    }
    if (status === 'disconnected') setIsJoined(false);
  }, [studentInfo, status, isJoined, send]);

  // FAILSAFE: poll sessionStorage every 2s so we never miss a start_exam event.
  // This catches the edge case where the socket event fires during a React re-render
  // and the onStartExam callback doesn't trigger navigation.
  useEffect(() => {
    const poll = setInterval(() => {
      const qs = sessionStorage.getItem('examQuestions');
      const et = sessionStorage.getItem('examEndTime');
      if (qs && et) {
        clearInterval(poll);
        navigate('/quiz');
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [navigate]);

  if (!studentInfo) return null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir={dir}>
      <header className="px-5 pt-4 pt-safe">
        <img src={logo} alt="AirQuiz" className="h-9 w-auto dark:brightness-0 dark:invert" />
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-10">
        <p className="text-muted-foreground">{t('login.group')} {studentInfo.group}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{studentInfo.firstName} {studentInfo.lastName}</h1>

        {errorMessage ? (
          <div className="mt-8 space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('waiting.errorJoining')}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button variant="outline" className="h-12 w-full" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('waiting.back')}
            </Button>
          </div>
        ) : (
          <div className="mt-10 flex items-start gap-4" role="status" aria-live="polite">
            {isJoined ? (
              <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-success" />
            ) : (
              <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
            )}
            <div>
              <p className="text-lg font-medium">{isJoined ? t('waiting.youAreIn') : t('waiting.connecting')}</p>
              <p className="text-muted-foreground">{isJoined ? t('waiting.waitingForHost') : t('waiting.pleaseWait')}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {t('waiting.keepOpen')}
              </p>
            </div>
          </div>
        )}

        <div className="mt-10">
          <ConnectionStatus status={status} isDemo={isDemo} />
        </div>
      </main>
    </div>
  );
}
