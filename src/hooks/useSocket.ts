/**
 * AirQuiz - Classroom Assessment Platform
 * WebSocket Hook - Handles real-time communication
 * 
 * @author Salah Eddine Medkour
 * @copyright 2024 Salah Eddine Medkour. All rights reserved.
 * @license MIT
 * @see https://github.com/salahmed-ctrlz
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '@/lib/config';
import type { ConnectionStatus, ClientEvent, RoomState, Student, Question } from '@/lib/types';

interface UseSocketOptions {
  onConnect?: () => void;
  onJoined?: (studentId: string, roomState: RoomState, previousAnswers?: Record<string, string>) => void;
  onStartExam?: (questions: Question[], durationSeconds: number, endTime: string) => void;
  onExamStatus?: (active: boolean, remainingSeconds: number) => void;
  onExamEnded?: () => void;
  onFullResults?: (results: Record<number, any>, finalScore: number) => void;
  onAckSubmission?: (success: boolean) => void;
  onDashboardUpdate?: (students: Student[], answeredCount: number, examActive: boolean, timeRemaining: number) => void;
  onError?: (message: string) => void;
  onRoomInfo?: (data: { room_id: string, code: string }) => void;
  onRoomList?: (rooms: { id: string, code: string, name: string }[]) => void;

  onNewQuestion?: (question: Omit<Question, 'correctIndex'>, questionNumber: number, total: number) => void;
  onShowResult?: (correctIndex: number, yourAnswer?: number) => void;
  onExamExtended?: (durationSeconds: number, endTime: string) => void;
  onRoomReset?: (message: string) => void;
}

interface UseSocketReturn {
  status: ConnectionStatus;
  connect: () => void;
  disconnect: () => void;
  send: (event: ClientEvent) => void;
  requestRooms: () => void;
  isDemo: boolean;
  toggleDemo: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isDemo, setIsDemo] = useState(config.demoMode);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  const connectingRef = useRef(false); // Prevent race conditions

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (isDemo) {
      setStatus('connected');
      optionsRef.current.onConnect?.();
      return;
    }

    // Prevent multiple connection attempts using ref (avoids stale state)
    if (socketRef.current) {
      // Already have a socket, just ensure it's connected
      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
      return;
    }

    if (connectingRef.current) return;

    connectingRef.current = true;
    setStatus('connecting');

    try {
      // Create Socket.IO connection
      socketRef.current = io(config.socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: config.reconnection.baseDelay,
        reconnectionDelayMax: config.reconnection.maxDelay,
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setStatus('connected');
        optionsRef.current.onConnect?.();
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        connectingRef.current = false; // Allow reconnection
        setStatus('disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setStatus('error');
      });

      // auto-rejoin after network recovery so session is restored
      socketRef.current.on('reconnect', () => {
        console.log('🔄 Socket.IO reconnected — re-authenticating');
        setStatus('connected');
        optionsRef.current.onConnect?.();
      });

      socketRef.current.on('reconnect_failed', () => {
        console.error('Socket.IO reconnection failed after all attempts');
        setStatus('error');
      });

      // Backend events
      const handleStartExam = (data: any) => {
        console.log('Start exam received:', data);
        const mappedQuestions = (data.questions || []).map((q: any) => ({
          ...q,
          id: q.question_id || q.id // Map backend question_id to frontend id
        }));
        optionsRef.current.onStartExam?.(mappedQuestions, data.duration_seconds, data.end_time);
      };

      socketRef.current.on('start_exam', handleStartExam);
      socketRef.current.on('START_EXAM', handleStartExam);

      const handleJoined = (data: any) => {
        console.log('Join success (JOINED):', data);
        optionsRef.current.onJoined?.(
          data.studentId || data.student_id,
          data.roomState,
          data.previous_answers || data.previousAnswers
        );
      };

      socketRef.current.on('join_success', handleJoined);
      socketRef.current.on('JOINED', handleJoined);

      socketRef.current.on('exam_ended', () => {
        console.log('Exam ended');
        optionsRef.current.onExamEnded?.();
      });

      socketRef.current.on('exam_questions', (questions: any) => {
        console.log('Exam questions loaded via restore:', questions);
        const mappedQuestions = questions.map((q: any) => ({
          ...q,
          id: q.question_id
        }));

        // Get the endTime we stored from restore_session, or calculate from remaining
        let endTime = sessionStorage.getItem('examEndTime') || '';
        const remaining = parseInt(sessionStorage.getItem('examRemaining') || '0', 10);

        if (!endTime && remaining > 0) {
          endTime = new Date(Date.now() + remaining * 1000).toISOString();
        }

        // Call onStartExam with proper endTime
        optionsRef.current.onStartExam?.(mappedQuestions, remaining, endTime);
      });

      const handleFullResults = (data: any) => {
        console.log('Full results:', data);
        optionsRef.current.onFullResults?.(data.results, data.final_score);
      };

      socketRef.current.on('full_results', handleFullResults);
      socketRef.current.on('FULL_RESULTS', handleFullResults);

      socketRef.current.on('answer_acknowledged', (data: any) => {
        console.log('Answer acknowledged:', data);
        optionsRef.current.onAckSubmission?.(true);
      });

      socketRef.current.on('dashboard_update', (data: any) => {
        // Map backend snake_case to frontend camelCase
        const students = (data.students || []).map((s: any) => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          group: s.group,
          score: s.score,
          isOnline: s.is_online,
          hasAnswered: s.has_answered,
          answersCount: s.answers_count || 0,
          assignedCount: s.assigned_count || 0
        }));
        optionsRef.current.onDashboardUpdate?.(
          students,
          data.answered_count || 0,
          data.exam_active || false,
          data.time_remaining || 0
        );
      });

      socketRef.current.on('exam_extended', (data: any) => {
        console.log('Exam extended:', data);
        optionsRef.current.onExamExtended?.(data.duration_seconds, data.end_time);
      });

      socketRef.current.on('room_info', (data: any) => {
        console.log('Room Info received:', data);
        optionsRef.current.onRoomInfo?.(data);
      });

      socketRef.current.on('rooms_list', (data: any[]) => {
        console.log('Rooms List received:', data);
        optionsRef.current.onRoomList?.(data);
      });

      socketRef.current.on('error', (data: any) => {
        console.error('Socket.IO error:', data);
        optionsRef.current.onError?.(data.message);
      });

      // Room reset — admin cleared the session
      const handleRoomReset = (data: any) => {
        console.log('Room was reset by admin:', data);
        optionsRef.current.onRoomReset?.(data?.message || 'Session reset.');
      };
      socketRef.current.on('ROOM_RESET', handleRoomReset);
      socketRef.current.on('room_reset', handleRoomReset);

    } catch (e) {
      console.error('Failed to create Socket.IO connection:', e);
      setStatus('error');
    }
  }, [isDemo, status]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, []);

  const requestRooms = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('get_rooms');
    }
  }, []);

  const send = useCallback((event: ClientEvent) => {
    if (isDemo) {
      // Demo logic would go here
      return;
    }

    if (!socketRef.current?.connected) {
      console.warn('Socket not connected, cannot send:', event);
      return;
    }

    switch (event.type) {
      case 'JOIN':
        socketRef.current.emit('join', {
          first_name: event.payload.firstName,
          last_name: event.payload.lastName,
          group: event.payload.group,
          room_id: event.payload.room_id
        });
        break;

      case 'SUBMIT_ANSWER':
        const studentId = sessionStorage.getItem('studentId');
        const option = event.payload.selectedOption;

        socketRef.current.emit('submit_answer', {
          student_id: event.payload.studentId || studentId,
          question_id: event.payload.questionId,
          option: option
        });
        break;

      case 'ADMIN_START_EXAM':
        const start_payload = {
          duration_minutes: event.payload.durationMinutes,
          room_id: event.payload.room_id,
          questions_count: event.payload.questions_count,
          shuffle: event.payload.shuffle,
          capacity: event.payload.capacity
        };
        socketRef.current.emit('admin_start_exam', start_payload);
        break;

      case 'ADMIN_END_EXAM':
        socketRef.current.emit('admin_end_exam', { room_id: event.payload?.room_id });
        break;

      case 'ADMIN_REVEAL_RESULTS':
        socketRef.current.emit('admin_reveal_results', { room_id: event.payload?.room_id });
        break;

      case 'ADMIN_RESET_ROOM':
        socketRef.current.emit('admin_reset_room', { room_id: event.payload?.room_id });
        break;

      case 'ADMIN_EXPORT_CSV':
        socketRef.current.emit('admin_export_csv', { room_id: event.payload?.room_id });
        break;

      case 'JOIN_ROOM_ADMIN':
        socketRef.current.emit('join_room_admin', { room_id: event.payload.room_id });
        break;

      case 'ADMIN_EXTEND_EXAM':
        socketRef.current.emit('admin_extend_exam', {
          room_id: event.payload.room_id,
          minutes: event.payload.minutes
        });
        break;
    }
  }, [isDemo]);

  // Cleanup
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const toggleDemo = useCallback(() => {
    setIsDemo(prev => !prev);
  }, []);

  return { status, connect, disconnect, send, requestRooms, isDemo, toggleDemo };
}
