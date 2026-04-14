import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

const INITIAL_GREETING = `Xin chào! 👋

Tôi là trợ lý AI của hệ thống giám sát y tế TP.HCM. Tôi có thể giúp bạn:

📊 **Phân tích dữ liệu:**
• Xu hướng dịch bệnh và ca nhiễm
• So sánh giữa các quận/huyện
• Thống kê theo thời gian

💡 **Đưa ra khuyến nghị:**
• Biện pháp phòng chống dịch
• Ưu tiên can thiệp y tế
• Phân bổ nguồn lực

🔍 **Trả lời câu hỏi:**
• Giải thích các chỉ số
• Tình hình dịch bệnh
• Dữ liệu giám sát

Bạn muốn tìm hiểu về điều gì?`;

export const GlobalAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasShownGreeting, setHasShownGreeting] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Show greeting when opened
  useEffect(() => {
    if (isOpen && !hasShownGreeting) {
      setMessages([{
        role: 'assistant',
        content: INITIAL_GREETING
      }]);
      setHasShownGreeting(true);
    }
  }, [isOpen, hasShownGreeting]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn file ảnh",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input || (selectedImage ? "🖼️ Phân tích ảnh này giúp tôi" : ""),
      image: selectedImage || undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('surveillance-ai', {
        body: { 
          query: input || "Phân tích ảnh y tế này như một bác sĩ giàu kinh nghiệm. Giải thích bằng ngôn ngữ đơn giản, dễ hiểu để trẻ con cũng hiểu được.",
          image: imageToSend 
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('AI error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể kết nối với AI. Vui lòng thử lại.",
        variant: "destructive",
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "📊 Tình hình dịch bệnh hiện tại như thế nào?",
    "🗺️ Quận nào có nhiều ca bệnh nhất?",
    "💊 Khuyến nghị biện pháp phòng chống dịch",
    "📈 So sánh xu hướng tuần này với tuần trước",
    "🏥 Cơ sở y tế nào đang quá tải?",
    "⚠️ Cần cảnh báo nguy cơ dịch ở đâu?"
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-110 group"
        size="icon"
      >
        <Bot className="h-7 w-7 group-hover:scale-110 transition-transform" />
        <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[420px] h-[650px] shadow-2xl z-50 flex flex-col border-2 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="h-6 w-6" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Trợ lý AI Y tế</h3>
            <p className="text-xs text-primary-foreground/80">Powered by Gemini</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/10">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                  : 'bg-card border border-border'
              }`}
            >
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded" 
                  className="rounded-lg mb-2 max-w-full h-auto"
                />
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-3 space-y-2 border-t pt-3 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Câu hỏi gợi ý:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {quickQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="w-full text-xs justify-start h-auto py-2.5 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                onClick={() => setInput(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t bg-muted/10">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border-2 border-primary" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-[70px] w-12"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về dữ liệu, dịch bệnh hoặc tải ảnh để phân tích..."
            className="min-h-[70px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            size="icon"
            className="h-[70px] w-12 bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
