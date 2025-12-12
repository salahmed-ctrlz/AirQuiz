import { cn } from '@/lib/utils';
import { User, Check } from 'lucide-react';
import type { Student } from '@/lib/types';

interface StudentCardProps {
  student: Student;
  showScore?: boolean;
}

export function StudentCard({ student, showScore = true }: StudentCardProps) {
  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 bg-card transition-all duration-200',
        student.isOnline ? 'border-border' : 'border-border/50 opacity-60',
        student.hasAnswered && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Online indicator */}
      <span
        className={cn(
          'absolute top-3 right-3 h-3 w-3 rounded-full',
          student.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
        )}
      />

      {/* Answered indicator */}
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
        </div>
      </div>
    </div>
  );
}
