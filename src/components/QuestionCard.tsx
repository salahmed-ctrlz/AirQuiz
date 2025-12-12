import { cn } from '@/lib/utils';
import type { Question } from '@/lib/types';

interface QuestionCardProps {
  question: Omit<Question, 'correctIndex'>;
  questionNumber: number;
  className?: string;
}

export function QuestionCard({ question, questionNumber, className }: QuestionCardProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Question {questionNumber}
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-relaxed">
        {question.text}
      </h2>
      {question.imageUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-border">
          <img
            src={question.imageUrl}
            alt={`Question ${questionNumber} illustration`}
            className="w-full h-auto max-h-64 object-contain bg-secondary"
          />
        </div>
      )}
    </div>
  );
}
