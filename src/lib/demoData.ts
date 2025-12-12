// Demo mode mock data
import type { Student, Question, Exam, RoomState } from './types';

export const demoStudents: Student[] = [
  { id: '1', firstName: 'Ahmed', lastName: 'Hassan', group: 'G1', isOnline: true, hasAnswered: true, score: 3, isCorrect: true },
  { id: '2', firstName: 'Sara', lastName: 'Ali', group: 'G1', isOnline: true, hasAnswered: true, score: 2, isCorrect: false },
  { id: '3', firstName: 'Mohamed', lastName: 'Ibrahim', group: 'G2', isOnline: true, hasAnswered: false, score: 4 },
  { id: '4', firstName: 'Fatima', lastName: 'Omar', group: 'G2', isOnline: false, hasAnswered: false, score: 1 },
  { id: '5', firstName: 'Youssef', lastName: 'Mahmoud', group: 'G3', isOnline: true, hasAnswered: true, score: 5, isCorrect: true },
  { id: '6', firstName: 'Nour', lastName: 'Ahmed', group: 'G3', isOnline: true, hasAnswered: false, score: 2 },
  { id: '7', firstName: 'Omar', lastName: 'Khaled', group: 'G4', isOnline: true, hasAnswered: true, score: 3, isCorrect: true },
  { id: '8', firstName: 'Layla', lastName: 'Mostafa', group: 'G5', isOnline: false, hasAnswered: false, score: 0 },
];

export const demoQuestions: Question[] = [
  {
    id: 1,
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    timeLimit: 30,
  },
  {
    id: 2,
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    timeLimit: 25,
  },
  {
    id: 3,
    text: 'What is 2 + 2?',
    options: ['3', '4', '5', '22'],
    correctIndex: 1,
    timeLimit: 15,
  },
  {
    id: 4,
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctIndex: 1,
    timeLimit: 30,
  },
  {
    id: 5,
    text: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctIndex: 3,
    timeLimit: 25,
  },
];

export const demoExam: Exam = {
  title: 'General Knowledge Quiz',
  institution: 'Demo University',
  subject: 'General Studies',
  year: '2024',
  questions: demoQuestions,
};

export const demoRoomState: RoomState = {
  roomId: 'DEMO-1234',
  exam: demoExam,
  currentQuestionIndex: 0,
  isActive: false,
  isRevealed: false,
  students: demoStudents,
  totalQuestions: demoQuestions.length,
};
