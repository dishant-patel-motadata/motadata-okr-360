import { cn } from '@/lib/utils';
import { LABEL_TO_RATING } from '@/lib/constants';
import type { RatingLabel, Role } from '@/lib/types';

interface ScoreBadgeProps {
  score?: number;
  label: RatingLabel;
  viewerRole: Role;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, label, viewerRole, size = 'md' }: ScoreBadgeProps) {
  const config = LABEL_TO_RATING[label];
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border font-medium', config.bgColor, config.color, config.borderColor, sizes[size])}>
      {viewerRole !== 'IC' && score !== undefined && (
        <span className="font-semibold">{score.toFixed(2)} —</span>
      )}
      <span>{label}</span>
    </span>
  );
}
