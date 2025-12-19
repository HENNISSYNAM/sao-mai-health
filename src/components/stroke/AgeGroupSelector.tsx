import React from 'react';
import { cn } from '@/lib/utils';
import { User, Baby, Users, UserCheck } from 'lucide-react';

type AgeGroup = '<18' | '18-35' | '36-55' | '>55';

interface AgeGroupSelectorProps {
  value: AgeGroup;
  onChange: (value: AgeGroup) => void;
  className?: string;
}

const ageGroups: { value: AgeGroup; label: string; icon: React.ReactNode; description: string }[] = [
  { value: '<18', label: 'Dưới 18', icon: <Baby className="h-4 w-4" />, description: 'Thanh thiếu niên' },
  { value: '18-35', label: '18-35', icon: <User className="h-4 w-4" />, description: 'Thanh niên' },
  { value: '36-55', label: '36-55', icon: <Users className="h-4 w-4" />, description: 'Trung niên' },
  { value: '>55', label: 'Trên 55', icon: <UserCheck className="h-4 w-4" />, description: 'Cao tuổi' },
];

const AgeGroupSelector: React.FC<AgeGroupSelectorProps> = ({ value, onChange, className }) => {
  return (
    <div className={cn("flex gap-2", className)}>
      {ageGroups.map((group) => (
        <button
          key={group.value}
          onClick={() => onChange(group.value)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200",
            value === group.value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-card hover:bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "p-2 rounded-lg",
            value === group.value ? "bg-primary/20" : "bg-muted/50"
          )}>
            {group.icon}
          </div>
          <span className="text-xs font-medium">{group.label}</span>
        </button>
      ))}
    </div>
  );
};

export default AgeGroupSelector;
