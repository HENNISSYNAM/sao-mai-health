import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, Send, Bot, User, MapPin, 
  Shield, AlertTriangle, Loader2, Mic, Crown
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface PremiumConsultantProps {
  profile: UserHealthProfile | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const PremiumConsultant: React.FC<PremiumConsultantProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (profile && messages.length === 0) {
      const greeting: Message = {
        id: '1',
        role: 'assistant',
        content: i18n.language === 'vi'
          ? `Xin chào! Tôi là trợ lý tư vấn sinh tồn AI của bạn. Dựa trên hồ sơ y tế, tôi thấy bạn có tiền sử ${profile.chronicConditions.join(', ')}. Tôi sẽ giúp bạn điều hướng an toàn qua các yếu tố môi trường có thể ảnh hưởng đến sức khỏe. Bạn cần tư vấn gì hôm nay?`
          : `Hello! I'm your AI survival consultant. Based on your medical profile, I see you have a history of ${profile.chronicConditions.join(', ')}. I'll help you navigate safely through environmental factors that may affect your health. What can I help you with today?`,
        timestamp: new Date()
      };
      setMessages([greeting]);
    }
  }, [profile, i18n.language]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing
    await new Promise(r => setTimeout(r, 1500));

    const hasAsthma = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('asthma') || c.toLowerCase().includes('hen')
    );
    const hasHypertension = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('huyết áp')
    );
    const hasSinusitis = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('sinusitis') || c.toLowerCase().includes('viêm xoang')
    );

    const lowerMessage = userMessage.toLowerCase();

    // Context-aware responses based on user query and health profile
    if (lowerMessage.includes('đi') || lowerMessage.includes('travel') || lowerMessage.includes('area')) {
      if (hasAsthma) {
        return i18n.language === 'vi'
          ? `⚠️ Cảnh báo cá nhân hóa: Khu vực bạn định đến hiện có chỉ số bụi mịn PM2.5 cao (AQI: 85). Với tiền sử hen suyễn trong hồ sơ, tôi khuyên bạn:\n\n1. 🔹 Mang theo thuốc xịt cắt cơn\n2. 🔹 Đeo khẩu trang N95\n3. 🔹 Hạn chế hoạt động ngoài trời trong khoảng 11h-15h\n4. 🔹 Uống đủ nước để giữ ẩm đường hô hấp\n\n📍 Lộ trình an toàn: Tôi đề xuất đi qua các tuyến đường có nhiều cây xanh để giảm tiếp xúc với bụi mịn.`
          : `⚠️ Personalized Alert: The area you're heading to currently has high PM2.5 levels (AQI: 85). Given your asthma history in your profile, I recommend:\n\n1. 🔹 Carry your rescue inhaler\n2. 🔹 Wear an N95 mask\n3. 🔹 Limit outdoor activities between 11am-3pm\n4. 🔹 Stay hydrated to keep airways moist\n\n📍 Safe Route: I suggest taking routes with more greenery to reduce dust exposure.`;
      }
      if (hasHypertension) {
        return i18n.language === 'vi'
          ? `⚠️ Lưu ý quan trọng: Với tiền sử huyết áp cao, tôi thấy áp suất khí quyển hiện tại đang thấp (1008 hPa) có thể gây khó chịu. Khuyến nghị:\n\n1. 🔹 Uống thuốc huyết áp đúng giờ\n2. 🔹 Tránh di chuyển gấp, leo cầu thang nhiều\n3. 🔹 Mang theo máy đo huyết áp xách tay\n4. 🔹 Nghỉ ngơi nếu cảm thấy chóng mặt\n\n💊 Nhắc nhở: Bạn đang dùng Lisinopril 10mg - đã uống hôm nay chưa?`
          : `⚠️ Important Notice: With your hypertension history, I notice the current atmospheric pressure is low (1008 hPa) which may cause discomfort. Recommendations:\n\n1. 🔹 Take your blood pressure medication on time\n2. 🔹 Avoid rushing or climbing stairs frequently\n3. 🔹 Carry a portable blood pressure monitor\n4. 🔹 Rest if you feel dizzy\n\n💊 Reminder: You're on Lisinopril 10mg - have you taken it today?`;
      }
    }

    if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather') || lowerMessage.includes('hôm nay')) {
      if (hasSinusitis) {
        return i18n.language === 'vi'
          ? `🌤️ Phân tích thời tiết cá nhân hóa:\n\nDựa trên tiền sử viêm xoang của bạn và dữ liệu thời tiết:\n- Áp suất: 1008 hPa (↓ thấp hơn bình thường)\n- Độ ẩm: 88% (cao)\n- Nhiệt độ: 32°C\n\n⚠️ Nguy cơ tái phát viêm xoang: 80% trong 12 giờ tới\n\n📋 Khuyến nghị:\n1. Xịt mũi sinh lý 2-3 lần/ngày\n2. Tránh vào phòng điều hòa quá lạnh đột ngột\n3. Giữ ấm vùng mặt khi ra ngoài\n4. Uống nước ấm thay vì đồ lạnh`
          : `🌤️ Personalized Weather Analysis:\n\nBased on your sinusitis history and weather data:\n- Pressure: 1008 hPa (↓ lower than normal)\n- Humidity: 88% (high)\n- Temperature: 32°C\n\n⚠️ Sinusitis flare-up risk: 80% in the next 12 hours\n\n📋 Recommendations:\n1. Use saline nasal spray 2-3 times/day\n2. Avoid sudden exposure to cold AC\n3. Keep your face warm when going out\n4. Drink warm water instead of cold drinks`;
      }
    }

    // Default helpful response
    return i18n.language === 'vi'
      ? `Cảm ơn bạn đã hỏi! Dựa trên hồ sơ sức khỏe của bạn với ${profile?.chronicConditions.length || 0} bệnh nền và điều kiện môi trường hiện tại, tôi có thể giúp bạn:\n\n1. 📍 Phân tích lộ trình di chuyển an toàn\n2. 🌤️ Dự báo rủi ro theo thời tiết\n3. 💊 Nhắc nhở uống thuốc\n4. 🏥 Tìm cơ sở y tế gần nhất\n\nBạn muốn tôi hỗ trợ vấn đề nào?`
      : `Thank you for asking! Based on your health profile with ${profile?.chronicConditions.length || 0} chronic conditions and current environmental conditions, I can help you with:\n\n1. 📍 Safe route analysis\n2. 🌤️ Weather-based risk forecasting\n3. 💊 Medication reminders\n4. 🏥 Find nearest medical facilities\n\nWhat would you like me to assist with?`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const response = await generateAIResponse(input);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          {t('biovault.consultant.title', 'Trợ lý tư vấn sinh tồn AI')}
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 ml-2">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('biovault.consultant.description', 'Tư vấn cá nhân hóa dựa trên hồ sơ y tế và dữ liệu môi trường')}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map(message => (
              <div 
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'assistant' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                
                <div className={`
                  max-w-[80%] rounded-2xl px-4 py-3 text-sm
                  ${message.role === 'assistant' 
                    ? 'bg-muted/50 text-foreground' 
                    : 'bg-primary text-primary-foreground'
                  }
                `}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <p className={`text-xs mt-2 ${
                    message.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                  }`}>
                    {message.timestamp.toLocaleTimeString(i18n.language, { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-border">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              t('biovault.consultant.quickSafeRoute', '📍 Lộ trình an toàn'),
              t('biovault.consultant.quickWeather', '🌤️ Thời tiết hôm nay'),
              t('biovault.consultant.quickMeds', '💊 Nhắc thuốc')
            ].map((action, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="whitespace-nowrap text-xs"
                onClick={() => setInput(action.replace(/^.{2}/, ''))}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('biovault.consultant.placeholder', 'Hỏi về sức khỏe, lộ trình, thời tiết...')}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isTyping}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
