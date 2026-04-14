import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageCircle, Sparkles } from 'lucide-react';

interface ChatToggleButtonProps {
  onClick: () => void;
  className?: string;
}

const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ onClick, className }) => {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30",
        "h-14 w-14 rounded-full shadow-2xl",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "animate-in slide-in-from-bottom-4 duration-500",
        "hover:scale-110 transition-transform",
        className
      )}
      size="icon"
    >
      <div className="relative">
        <MessageCircle className="h-6 w-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
      </div>
    </Button>
  );
};

export default ChatToggleButton;
