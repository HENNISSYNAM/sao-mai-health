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
  { value: '<18', label: '<18', icon: <Baby className="h-4 w-4" />, description: 'Thanh thiếu niên' },
  { value: '18-35', label: '18-35', icon: <User className="h-4 w-4" />, description: 'Thanh niên' },
  { value: '36-55', label: '36-55', icon: <Users className="h-4 w-4" />, description: 'Trung niên' },
  { value: '>55', label: '>55', icon: <UserCheck className="h-4 w-4" />, description: 'Cao tuổi' },
];

const AgeGroupSelector: React.FC<AgeGroupSelectorProps> = ({ value, onChange, className }) => {
  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {ageGroups.map((group) => (
        <button
          key={group.value}
          onClick={() => onChange(group.value)}
          className={cn(
            "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
            value === group.value
              ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10"
              : "bg-card hover:bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            value === group.value ? "bg-primary/20" : "bg-muted/50"
          )}>
            {group.icon}
          </div>
          <span className="text-xs font-bold">{group.label}</span>
          <span className="text-[9px] text-muted-foreground hidden sm:block">{group.description}</span>
          
          {/* Selection indicator */}
          {value === group.value && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
          )}
        </button>
      ))}
    </div>
  );
};

export default AgeGroupSelector;
