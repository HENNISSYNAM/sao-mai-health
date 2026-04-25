import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  rows = 3,
  className
}) => {
  const hasError = !!error;
  
  const inputClasses = cn(
    "transition-all duration-200",
    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
    "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
    hasError && "border-destructive focus:border-destructive focus:ring-destructive/20",
    className
  );

  return (
    <div className="space-y-2">
      <Label 
        htmlFor={name}
        className={cn(
          "text-sm font-medium",
          hasError && "text-destructive",
          required && "after:content-['*'] after:ml-1 after:text-destructive"
        )}
      >
        {label}
      </Label>
      
      {type === 'textarea' ? (
        <Textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={rows}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
        />
      )}
      
      {hasError && (
        <div 
          id={`${name}-error`}
          className="flex items-center gap-1 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};