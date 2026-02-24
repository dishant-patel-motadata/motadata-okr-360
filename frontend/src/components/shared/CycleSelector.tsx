import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCycles } from '@/hooks/useCycles';

interface CycleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  status?: string;
}

export function CycleSelector({ value, onChange, status }: CycleSelectorProps) {
  const { data } = useCycles({ limit: 50, status });
  const cycles = data?.data || [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select a cycle" />
      </SelectTrigger>
      <SelectContent>
        {cycles.map((cycle) => (
          <SelectItem key={cycle.cycle_id} value={cycle.cycle_id}>
            {cycle.cycle_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
