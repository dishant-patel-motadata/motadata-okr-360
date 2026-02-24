import { cn } from '@/lib/utils';
import { RATING_CONFIG } from '@/lib/constants';

interface RatingSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingSelector({ value, onChange, disabled }: RatingSelectorProps) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((rating) => {
        const config = RATING_CONFIG[rating];
        const isSelected = value === rating;
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all',
              isSelected
                ? `${config.bgColor} ${config.color} border-current shadow-sm`
                : 'border-transparent bg-muted text-muted-foreground hover:border-border',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <span className="text-lg font-bold">{rating}</span>
            <span className="text-center leading-tight">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
