import { cn } from '@/lib/utils';
import { RATING_CONFIG } from '@/lib/constants';

interface RatingSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingSelector({ value, onChange, disabled }: RatingSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
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
              'flex items-center justify-center rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all',
              isSelected
                ? `${config.bgColor} ${config.color} border-current shadow-sm`
                : 'border-transparent bg-muted text-muted-foreground hover:border-border hover:bg-muted/80',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
