import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import type { ConnectionStatus as Status } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: Status;
  isDemo?: boolean;
  className?: string;
}

export function ConnectionStatus({ status, isDemo, className }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: isDemo ? 'Demo Mode' : 'Connected',
      color: 'text-success',
      bgColor: 'bg-success/10',
      dotColor: 'bg-success',
    },
    connecting: {
      icon: Loader2,
      label: 'Connecting...',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      dotColor: 'bg-warning',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      dotColor: 'bg-muted-foreground',
    },
    error: {
      icon: AlertCircle,
      label: 'Connection Error',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      dotColor: 'bg-destructive',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full animate-pulse', config.dotColor)} />
      <Icon className={cn('h-4 w-4', status === 'connecting' && 'animate-spin')} />
      <span>{config.label}</span>
    </div>
  );
}
