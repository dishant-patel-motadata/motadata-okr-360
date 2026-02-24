import { cn } from '@/lib/utils';
import { CYCLE_STATUS_CONFIG } from '@/lib/constants';
import type { CycleStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = CYCLE_STATUS_CONFIG[status as CycleStatus];

  if (config) {
    return (
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.className, className)}>
        {config.label}
      </span>
    );
  }

  // Fallback for reviewer/assignment statuses
  const statusStyles: Record<string, string> = {
    PENDING: 'bg-muted text-muted-foreground',
    IN_PROGRESS: 'bg-rating-moderate-bg text-rating-moderate',
    COMPLETED: 'bg-rating-outstanding-bg text-rating-outstanding',
    SUBMITTED: 'bg-rating-outstanding-bg text-rating-outstanding',
    DRAFT: 'bg-muted text-muted-foreground',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[status] || 'bg-muted text-muted-foreground', className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
