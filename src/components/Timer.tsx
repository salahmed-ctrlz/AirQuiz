import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isPaused?: boolean;
  className?: string;
}

export function Timer({ initialSeconds, onTimeUp, isPaused = false, className }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (isPaused || seconds <= 0) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, seconds, onTimeUp]);

  const percentage = (seconds / initialSeconds) * 100;
  const isWarning = seconds <= 10;
  const isCritical = seconds <= 5;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex items-center justify-center">
        <svg className="h-16 w-16 -rotate-90 transform">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={176}
            strokeDashoffset={176 - (176 * percentage) / 100}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-1000',
              isCritical ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-primary'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              isCritical && 'text-destructive animate-pulse'
            )}
          >
            {seconds}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">seconds</span>
      </div>
    </div>
  );
}
