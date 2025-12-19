import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Send, 
  X, 
  MessageCircle, 
  Loader2,
  Sparkles,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AgeGroup, EnvironmentData, RiskAssessment } from '@/hooks/useStrokeRiskEngine';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GrokChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ageGroup: AgeGroup;
  environment: EnvironmentData;
  riskAssessment: RiskAssessment;
  onAgeGroupChange: (ageGroup: AgeGroup) => void;
  gps: { lat: number; lon: number } | null;
}

const INITIAL_MESSAGE = `Xin chào! 👋

Tôi là trợ lý sức khỏe môi trường của bạn. Tôi đang theo dõi điều kiện thời tiết và chất lượng không khí tại vị trí của bạn.

Bạn có thể trò chuyện với tôi về bất cứ điều gì. Trong khi đó, tôi sẽ âm thầm phân tích các yếu tố môi trường có thể ảnh hưởng đến sức khỏe.

**Để giúp tôi đưa ra đánh giá phù hợp hơn, xin cho biết bạn thuộc nhóm tuổi nào?**

• Dưới 18 tuổi
• 18-35 tuổi  
• 36-55 tuổi
• Trên 55 tuổi`;

const GrokChatPanel: React.FC<GrokChatPanelProps> = ({
  isOpen,
  onClose,
  ageGroup,
  environment,
  riskAssessment,
  onAgeGroupChange,
  gps
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: INITIAL_MESSAGE,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Check for age group in message
  const detectAgeGroup = (text: string): AgeGroup | null => {
    const lower = text.toLowerCase();
    if (lower.includes('dưới 18') || lower.includes('<18') || lower.includes('under 18')) return '<18';
    if (lower.includes('18-35') || lower.includes('18 đến 35') || lower.includes('18 - 35')) return '18-35';
    if (lower.includes('36-55') || lower.includes('36 đến 55') || lower.includes('36 - 55')) return '36-55';
    if (lower.includes('trên 55') || lower.includes('>55') || lower.includes('over 55') || lower.includes('55+')) return '>55';
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Check for age group
    const detectedAge = detectAgeGroup(input);
    if (detectedAge) {
      onAgeGroupChange(detectedAge);
    }

    try {
      // Build context for AI
      const context = {
        ageGroup,
        environment: {
          temperature: environment.temperature,
          humidity: environment.humidity,
          pressure: environment.pressure,
          aqi: environment.aqi,
          pm25: environment.pm25
        },
        risk: {
          score: riskAssessment.risk_score,
          level: riskAssessment.risk_level,
          factors: riskAssessment.primary_factors
        },
        hasGPS: !!gps
      };

      const { data, error } = await supabase.functions.invoke('stroke-risk-chat', {
        body: {
          message: input,
          context,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4",
      "animate-in fade-in-0 duration-300"
    )}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div className={cn(
        "relative w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl",
        "flex flex-col max-h-[80vh] overflow-hidden",
        "animate-in slide-in-from-bottom-4 duration-500"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Trợ lý sức khỏe</h2>
              <p className="text-xs text-muted-foreground">Đang theo dõi môi trường...</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "flex-row-reverse"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === 'assistant' 
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {message.role === 'assistant' 
                    ? <Sparkles className="h-4 w-4" />
                    : <User className="h-4 w-4" />
                  }
                </div>

                {/* Message bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  message.role === 'assistant'
                    ? "bg-muted/50 text-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  <div className={cn(
                    "text-[10px] mt-1 opacity-60",
                    message.role === 'user' && "text-right"
                  )}>
                    {message.timestamp.toLocaleTimeString('vi-VN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="bg-muted/50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang suy nghĩ...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              className="flex-1 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrokChatPanel;
