import { useState, useCallback } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceAlertButtonProps {
  text: string;
  type?: 'alert' | 'briefing' | 'info';
  region?: 'north' | 'south' | 'default';
  size?: 'sm' | 'default' | 'icon';
  className?: string;
}

export function VoiceAlertButton({ text, type = 'info', region = 'default', size = 'icon', className }: VoiceAlertButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const playVoice = useCallback(async () => {
    if (isLoading || isPlaying) return;
    setIsLoading(true);
    
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/elevenlabs-voice-alert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, type, region }),
        }
      );

      if (!response.ok) throw new Error('Voice generation failed');
      
      const data = await response.json();
      if (!data.success || !data.audioContent) throw new Error('No audio content');

      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (error) {
      console.error('Voice playback error:', error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [text, type, region, isLoading, isPlaying]);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={(e) => { e.stopPropagation(); playVoice(); }}
      disabled={isLoading}
      className={cn(
        "rounded-full",
        isPlaying && "text-primary animate-pulse",
        className
      )}
      title="Nghe bằng giọng nói"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className={cn("h-3.5 w-3.5", isPlaying && "text-primary")} />
      )}
    </Button>
  );
}
