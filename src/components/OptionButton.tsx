import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface OptionButtonProps {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isRevealed: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export function OptionButton({
  index,
  text,
  isSelected,
  isCorrect,
  isRevealed,
  isDisabled,
  onClick,
}: OptionButtonProps) {
  const getStateClasses = () => {
    if (isRevealed) {
      if (isCorrect) {
        return 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300';
      }
      if (isSelected && !isCorrect) {
        return 'bg-destructive/20 border-destructive text-destructive';
      }
      return 'bg-muted/50 border-border text-muted-foreground opacity-50';
    }
    if (isSelected) {
      return 'bg-primary/20 border-primary text-primary ring-2 ring-primary/30';
    }
    return 'bg-card border-border hover:bg-accent hover:border-accent-foreground/20';
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'relative w-full p-4 sm:p-6 rounded-xl border-2 transition-all duration-200',
        'flex items-center gap-4 text-left',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        'disabled:cursor-not-allowed',
        getStateClasses()
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg',
          isRevealed && isCorrect
            ? 'bg-emerald-500 text-white'
            : isRevealed && isSelected && !isCorrect
            ? 'bg-destructive text-destructive-foreground'
            : isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isRevealed && isCorrect ? (
          <Check className="h-5 w-5" />
        ) : isRevealed && isSelected && !isCorrect ? (
          <X className="h-5 w-5" />
        ) : (
          optionLabels[index]
        )}
      </span>
      <span className="flex-1 text-base sm:text-lg font-medium">{text}</span>
    </button>
  );
}
