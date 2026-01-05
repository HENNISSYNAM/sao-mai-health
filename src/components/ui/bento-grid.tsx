import React from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      "grid gap-4 auto-rows-[minmax(180px,auto)]",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
}

export function BentoCard({ 
  children, 
  className,
  colSpan = 1,
  rowSpan = 1
}: BentoCardProps) {
  const colSpanClasses = {
    1: 'col-span-1',
    2: 'sm:col-span-2',
    3: 'lg:col-span-3',
    4: 'xl:col-span-4'
  };

  const rowSpanClasses = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3'
  };

  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-6 transition-all duration-300",
      "hover:shadow-lg hover:border-primary/20",
      colSpanClasses[colSpan],
      rowSpanClasses[rowSpan],
      className
    )}>
      {children}
    </div>
  );
}

interface BentoHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function BentoHeader({ icon, title, subtitle, action }: BentoHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

interface BentoStatProps {
  value: string | number;
  label: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function BentoStat({ value, label, change, variant = 'default' }: BentoStatProps) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-primary'
  };

  const changeStyles = {
    increase: 'text-success',
    decrease: 'text-danger',
    neutral: 'text-muted-foreground'
  };

  return (
    <div className="text-center">
      <p className={cn("text-3xl font-bold", variantStyles[variant])}>
        {value}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      {change && (
        <p className={cn("text-xs mt-1", changeStyles[change.type])}>
          {change.type === 'increase' ? '↑' : change.type === 'decrease' ? '↓' : '→'} {Math.abs(change.value)}%
        </p>
      )}
    </div>
  );
}
