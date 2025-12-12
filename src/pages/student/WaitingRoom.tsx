/**
 * AirQuiz - Classroom Assessment Platform
 * Student Waiting Room
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';
import { Loader2, User, AlertCircle } from 'lucide-react';
import logo from '@/assets/AirQuizLogoBLACKndBlueMain.svg';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StudentInfo {
  firstName: string;
  lastName: string;
  group: string;
  room_id: string; // Ensure this is typed
}

export default function WaitingRoom() {
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { status, connect, send, isDemo } = useSocket({
    onConnect: () => {
      // Logic moved to effect to ensure studentInfo is ready
    },
    onJoined: (studentId, roomState) => {
      sessionStorage.setItem('studentId', studentId);
      sessionStorage.setItem('roomState', JSON.stringify(roomState));
      setIsJoined(true);
      setErrorMessage(null); // Clear errors
    },
    onStartExam: (questions, duration, endTime) => {
      sessionStorage.setItem('examQuestions', JSON.stringify(questions));
      sessionStorage.setItem('examEndTime', endTime);
      navigate('/quiz');
    },
    onExamStatus: (active, remaining) => {
      // Don't navigate here - wait for onStartExam which has the questions
      // Just log that we know an exam is active
      if (active && remaining > 0) {
        console.log('Exam is active with', remaining, 'seconds remaining. Waiting for questions...');
      }
    },
    onError: (message) => {
      console.error('Socket error received:', message);
      setErrorMessage(message);
    },
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('studentInfo');
    if (!stored) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(stored);

    // Quick validation
    if (!parsed.room_id) {
      console.error("Missing Room ID in session storage");
      navigate('/');
      return;
    }
    setStudentInfo(parsed);
  }, [navigate]);

  // Connect once on mount
  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join room when connected (handles both initial connect and reconnect)
  useEffect(() => {
    if (!studentInfo) return;

    // Send join when connected and not yet joined
    if (status === 'connected' && !isJoined) {
      console.log("Sending join request to room:", studentInfo.room_id);
      send({ type: 'JOIN', payload: studentInfo });
    }

    // Reset isJoined on disconnect so we rejoin on reconnect
    if (status === 'disconnected') {
      setIsJoined(false);
    }
  }, [studentInfo, status, isJoined, send]);


  if (!studentInfo) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <img src={logo} alt="AirQuiz" className="h-12 w-auto" />
        </div>

        <Card className="border-2 shadow-lg">
          <CardContent className="pt-6 space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {studentInfo.firstName} {studentInfo.lastName}
                </p>
                <p className="text-sm text-muted-foreground">Group {studentInfo.group}</p>
                <p className="text-xs text-muted-foreground mt-1">Room: <span className="font-mono text-primary">{studentInfo.room_id}</span></p>
              </div>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Joining Room</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Connection Status */}
            <div className="flex justify-center">
              <ConnectionStatus status={status} isDemo={isDemo} />
            </div>

            {/* Waiting Animation */}
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
                  {isJoined ? 'You are in!' : 'Connecting to Room...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isJoined ? "Waiting for host to start..." : "Please wait..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
