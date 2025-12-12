// AirQuiz Type Definitions

export interface Student {
  id: string; // Changed to string to match backend usage often
  firstName: string;
  lastName: string;
  group: string;
  isOnline: boolean;
  hasAnswered: boolean;
  score: number;
  lastAnswer?: string;
  isCorrect?: boolean;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex?: number; // Optional because students don't see it (backend sends Omit<...>)
  timeLimit: number;
  imageUrl?: string;
}

export interface Exam {
  title: string;
  institution: string;
  subject: string;
  year: string;
  questions: Question[];
}

export interface RoomState {
  roomId: string;
  exam: Exam | null;
  currentQuestionIndex: number;
  isActive: boolean;
  isRevealed: boolean;
  students: Student[];
  totalQuestions: number;
}

// WebSocket Events
export type ClientEvent =
  | { type: 'JOIN'; payload: { firstName: string; lastName: string; group: string; room_id?: string } }
  | { type: 'SUBMIT_ANSWER'; payload: { questionId: number; selectedOption: string; studentId?: string } }
  | { type: 'ADMIN_START_EXAM'; payload: { durationMinutes: number; room_id?: string; exam_title?: string } }
  | { type: 'ADMIN_END_EXAM'; payload?: { room_id?: string } }
  | { type: 'ADMIN_REVEAL_RESULTS'; payload?: { room_id?: string } }
  | { type: 'ADMIN_RESET_ROOM'; payload?: { room_id?: string } }
  | { type: 'ADMIN_EXPORT_CSV'; payload?: { room_id?: string } }
  | { type: 'ADMIN_EXTEND_EXAM'; payload: { room_id: string; minutes: number } }
  | { type: 'JOIN_ROOM_ADMIN'; payload: { room_id: string } };

export type ServerEvent =
  | { type: 'JOINED'; payload: { studentId: string; roomState: RoomState } }
  | { type: 'UPDATE_DASHBOARD'; payload: { students: Student[]; answeredCount: number; examActive: boolean; timeRemaining: number } }
  | { type: 'START_EXAM'; payload: { durationSeconds: number; endTime: string; questions: Question[] } }
  | { type: 'EXAM_ENDED' }
  | { type: 'ACK_SUBMISSION'; payload: { questionId: number; status: string } }
  | { type: 'FULL_RESULTS'; payload: { results: Record<number, any>; finalScore: number } }
  | { type: 'RESTORE_SESSION'; payload: { studentId: string; roomState: RoomState; examActive: boolean; remainingSeconds: number; previousAnswers?: Record<number, string> } }
  | { type: 'EXAM_QUESTIONS'; payload: Question[] }
  | { type: 'ERROR'; payload: { message: string } }
  // Legacy support for transition (optional)
  | { type: 'NEW_QUESTION'; payload: any }
  | { type: 'SHOW_RESULT'; payload: any };

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
