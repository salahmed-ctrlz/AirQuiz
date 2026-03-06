/**
 * AirQuiz — Student card with live progress display.
 * Shows answer count, online status, and score.
 */

import { cn } from '@/lib/utils';
import { User, Check } from 'lucide-react';
import type { Student } from '@/lib/types';

interface StudentCardProps {
  student: Student;
  showScore?: boolean;
  totalQuestions?: number;
}

export function StudentCard({ student, showScore = true, totalQuestions }: StudentCardProps) {
  const progressPct = totalQuestions ? Math.round((student.answersCount / totalQuestions) * 100) : 0;

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 bg-card transition-all duration-200',
        student.isOnline ? 'border-border' : 'border-border/50 opacity-60',
        student.hasAnswered && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* online indicator */}
      <span
        className={cn(
          'absolute top-3 right-3 h-3 w-3 rounded-full',
          student.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
        )}
      />

      {/* answered indicator */}
      {student.hasAnswered && (
        <span className="absolute top-3 right-8 flex items-center gap-1 text-xs text-primary font-medium">
          <Check className="h-3 w-3" />
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {student.firstName} {student.lastName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {student.group}
            </span>
            {showScore && (
              <span className="text-xs text-muted-foreground">
                Score: <span className="font-medium text-foreground">{student.score}</span>
              </span>
            )}
          </div>
          {/* live progress bar */}
          {student.answersCount > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{student.answersCount}{totalQuestions ? `/${totalQuestions}` : ''} answered</span>
                {totalQuestions ? <span>{progressPct}%</span> : null}
              </div>
              {totalQuestions ? (
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
