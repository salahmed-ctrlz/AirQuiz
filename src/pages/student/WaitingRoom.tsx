/**
 * AirQuiz — Student Waiting Room.
 * Waits for admin to start exam, then auto-navigates to /quiz.
 * Includes a sessionStorage poll as failsafe for instant-start.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/i18n/LanguageContext';
import { Loader2, User, AlertCircle } from 'lucide-react';
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

  const { status, connect, send, isDemo } = useSocket({
    onConnect: () => { /* join logic moved to effect */ },
    onJoined: (studentId, roomState) => {
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('roomState', JSON.stringify(roomState));
      setIsJoined(true);
      setErrorMessage(null);
    },
    onStartExam: (questions, duration, endTime) => {
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

  // connect once on mount
  useEffect(() => { connect(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir={dir}>
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <img src={logo} alt="AirQuiz" className="h-12 w-auto dark:brightness-0 dark:invert" />
        </div>

        <Card className="border-2 shadow-lg">
          <CardContent className="pt-6 space-y-6">
            {/* student info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {studentInfo.firstName} {studentInfo.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{t('login.group')} {studentInfo.group}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('login.room')}: <span className="font-mono text-primary">{studentInfo.room_id}</span>
                </p>
              </div>
            </div>

            {/* error display */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('waiting.errorJoining')}</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* connection status */}
            <div className="flex justify-center">
              <ConnectionStatus status={status} isDemo={isDemo} />
            </div>

            {/* waiting animation */}
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className={`h-16 w-16 text-primary ${isJoined ? 'animate-none' : 'animate-spin'}`} />
                  {isJoined && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-green-500 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isJoined ? t('waiting.youAreIn') : t('waiting.connecting')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isJoined ? t('waiting.waitingForHost') : t('waiting.pleaseWait')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
