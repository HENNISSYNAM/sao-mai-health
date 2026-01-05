import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, Send, Bot, User, MapPin, 
  Shield, AlertTriangle, Loader2, Mic, Crown,
  Navigation, Cloud, Pill, Phone, Heart,
  ThermometerSun, Wind, Activity, Brain, Clock,
  CheckCircle2, XCircle, Volume2, VolumeX
} from 'lucide-react';
import type { UserHealthProfile } from '@/pages/BioVault';

interface PremiumConsultantProps {
  profile: UserHealthProfile | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'alert' | 'recommendation' | 'route' | 'emergency';
  metadata?: {
    location?: string;
    risk?: number;
    actions?: { label: string; action: string }[];
  };
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  labelVi: string;
  query: string;
  queryVi: string;
  type: 'route' | 'weather' | 'medication' | 'emergency';
}

export const PremiumConsultant: React.FC<PremiumConsultantProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentMode, setCurrentMode] = useState<'chat' | 'emergency'>('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickActions: QuickAction[] = [
    { icon: Navigation, label: 'Safe route to destination', labelVi: 'Lộ trình an toàn', query: 'Analyze safe route for my health profile', queryVi: 'Phân tích lộ trình an toàn cho tôi', type: 'route' },
    { icon: Cloud, label: 'Weather impact today', labelVi: 'Ảnh hưởng thời tiết hôm nay', query: 'How does today\'s weather affect my health?', queryVi: 'Thời tiết hôm nay ảnh hưởng sức khỏe tôi thế nào?', type: 'weather' },
    { icon: Pill, label: 'Medication reminder', labelVi: 'Nhắc nhở thuốc', query: 'Check my medication schedule', queryVi: 'Kiểm tra lịch uống thuốc của tôi', type: 'medication' },
    { icon: Phone, label: 'Emergency protocol', labelVi: 'Quy trình khẩn cấp', query: 'What should I do in a health emergency?', queryVi: 'Tôi nên làm gì trong trường hợp khẩn cấp?', type: 'emergency' }
  ];

  // Initial greeting
  useEffect(() => {
    if (profile && messages.length === 0) {
      const greeting: Message = {
        id: '1',
        role: 'assistant',
        content: i18n.language === 'vi'
          ? `🏥 Xin chào ${profile.name}! Tôi là trợ lý tư vấn sinh tồn AI cao cấp của bạn.\n\n📋 **Hồ sơ đã phân tích:**\n• Tiền sử: ${profile.chronicConditions.join(', ')}\n• Dị ứng: ${profile.allergies.join(', ')}\n• Thuốc đang dùng: ${profile.medications?.map(m => typeof m === 'string' ? m : m.name).join(', ') || 'Không có'}\n\n🌡️ **Điều kiện môi trường hiện tại:**\n• Áp suất thấp (1008 hPa) - có thể ảnh hưởng huyết áp\n• Độ ẩm cao (88%) - lưu ý về xoang\n• AQI: 85 - chất lượng không khí trung bình\n\n⚠️ Tôi đã phát hiện **3 cảnh báo rủi ro** dựa trên hồ sơ của bạn. Bạn muốn tôi giải thích chi tiết không?`
          : `🏥 Hello ${profile.name}! I'm your premium AI survival consultant.\n\n📋 **Profile Analyzed:**\n• History: ${profile.chronicConditions.join(', ')}\n• Allergies: ${profile.allergies.join(', ')}\n• Current medications: ${profile.medications?.map(m => typeof m === 'string' ? m : m.name).join(', ') || 'None'}\n\n🌡️ **Current Environmental Conditions:**\n• Low pressure (1008 hPa) - may affect blood pressure\n• High humidity (88%) - sinusitis alert\n• AQI: 85 - moderate air quality\n\n⚠️ I've detected **3 risk alerts** based on your profile. Would you like me to explain in detail?`,
        timestamp: new Date(),
        type: 'text'
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

  const generateAIResponse = async (userMessage: string, actionType?: string): Promise<Message> => {
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    const hasAsthma = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('asthma') || c.toLowerCase().includes('hen')
    );
    const hasHypertension = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('huyết áp')
    );
    const hasSinusitis = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('sinusitis') || c.toLowerCase().includes('viêm xoang')
    );
    const hasDiabetes = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('diabetes') || c.toLowerCase().includes('tiểu đường') || c.toLowerCase().includes('pre-diabetes')
    );

    const lowerMessage = userMessage.toLowerCase();

    // Route analysis
    if (lowerMessage.includes('lộ trình') || lowerMessage.includes('route') || lowerMessage.includes('đi') || actionType === 'route') {
      let routeAdvice = '';
      
      if (hasAsthma) {
        routeAdvice = i18n.language === 'vi'
          ? `🗺️ **PHÂN TÍCH LỘ TRÌNH AN TOÀN**\n\n⚠️ **Cảnh báo cá nhân hóa cho bạn:**\n\nVới tiền sử **hen suyễn** và điều kiện hiện tại:\n• AQI: 85 (trung bình) → PM2.5: 45 µg/m³\n• Nhiệt độ: 32°C\n\n✅ **Khuyến nghị di chuyển:**\n1. 🚗 Ưu tiên phương tiện có điều hòa\n2. 🌳 Đi qua các tuyến đường nhiều cây xanh\n3. ⏰ Tránh giờ cao điểm 11h-15h\n4. 😷 Đeo khẩu trang N95 nếu đi bộ/xe máy\n\n💊 **Nhắc nhở:** Mang theo thuốc xịt cắt cơn\n\n📍 **Lộ trình gợi ý:** Đường Nguyễn Huệ → Lê Duẩn → Đích đến (qua công viên, ít bụi)`
          : `🗺️ **SAFE ROUTE ANALYSIS**\n\n⚠️ **Personalized alert for you:**\n\nWith your **asthma** history and current conditions:\n• AQI: 85 (moderate) → PM2.5: 45 µg/m³\n• Temperature: 32°C\n\n✅ **Travel recommendations:**\n1. 🚗 Prefer air-conditioned transport\n2. 🌳 Take routes with more greenery\n3. ⏰ Avoid peak hours 11am-3pm\n4. 😷 Wear N95 mask if walking/biking\n\n💊 **Reminder:** Carry your rescue inhaler\n\n📍 **Suggested route:** Via parks and tree-lined streets`;
      } else if (hasHypertension) {
        routeAdvice = i18n.language === 'vi'
          ? `🗺️ **PHÂN TÍCH LỘ TRÌNH AN TOÀN**\n\n⚠️ **Cảnh báo huyết áp:**\n\nÁp suất khí quyển thấp (1008 hPa) có thể gây:\n• Tăng huyết áp\n• Chóng mặt, đau đầu\n\n✅ **Khuyến nghị:**\n1. 🚶 Tránh leo cầu thang nhiều\n2. 🧘 Di chuyển chậm rãi, không vội vã\n3. 💧 Mang theo nước uống\n4. 📱 Mang máy đo huyết áp xách tay\n\n💊 **Kiểm tra:** Bạn đã uống Lisinopril 10mg sáng nay chưa?`
          : `🗺️ **SAFE ROUTE ANALYSIS**\n\n⚠️ **Blood pressure alert:**\n\nLow atmospheric pressure (1008 hPa) may cause:\n• Increased blood pressure\n• Dizziness, headache\n\n✅ **Recommendations:**\n1. 🚶 Avoid climbing many stairs\n2. 🧘 Move slowly, don't rush\n3. 💧 Carry water\n4. 📱 Bring portable BP monitor\n\n💊 **Check:** Have you taken Lisinopril 10mg this morning?`;
      } else {
        routeAdvice = i18n.language === 'vi'
          ? `🗺️ **PHÂN TÍCH LỘ TRÌNH**\n\nĐiều kiện di chuyển tốt cho hồ sơ sức khỏe của bạn.\n\n✅ Không có cảnh báo đặc biệt\n🌤️ Thời tiết: Nắng, 32°C\n💨 AQI: 85 (trung bình)`
          : `🗺️ **ROUTE ANALYSIS**\n\nGood travel conditions for your health profile.\n\n✅ No special alerts\n🌤️ Weather: Sunny, 32°C\n💨 AQI: 85 (moderate)`;
      }

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: routeAdvice,
        timestamp: new Date(),
        type: 'route',
        metadata: {
          risk: hasAsthma || hasHypertension ? 65 : 25,
          actions: [
            { label: i18n.language === 'vi' ? 'Xem bản đồ' : 'View map', action: 'open_map' },
            { label: i18n.language === 'vi' ? 'Chia sẻ vị trí' : 'Share location', action: 'share_location' }
          ]
        }
      };
    }

    // Weather analysis
    if (lowerMessage.includes('thời tiết') || lowerMessage.includes('weather') || lowerMessage.includes('hôm nay') || actionType === 'weather') {
      let weatherAdvice = '';
      
      if (hasSinusitis) {
        weatherAdvice = i18n.language === 'vi'
          ? `🌤️ **PHÂN TÍCH THỜI TIẾT CÁ NHÂN HÓA**\n\nDựa trên tiền sử **viêm xoang mãn tính** của bạn:\n\n📊 **Dữ liệu môi trường:**\n• Áp suất: 1008 hPa (↓ thấp hơn bình thường)\n• Độ ẩm: 88% (↑ cao)\n• Nhiệt độ: 32°C\n• Phấn hoa: Cao\n\n⚠️ **Nguy cơ tái phát viêm xoang: 80%** trong 12 giờ tới\n\n📋 **Kế hoạch phòng ngừa:**\n1. 💧 Xịt mũi sinh lý 3 lần/ngày\n2. 🏠 Tránh vào phòng điều hòa quá lạnh\n3. 🧣 Giữ ấm vùng mặt và cổ\n4. ☕ Uống nước ấm thay vì đồ lạnh\n5. 😴 Ngủ đủ giấc, kê cao gối\n\n🔔 Tôi sẽ nhắc bạn xịt mũi lúc 14:00`
          : `🌤️ **PERSONALIZED WEATHER ANALYSIS**\n\nBased on your **chronic sinusitis** history:\n\n📊 **Environmental data:**\n• Pressure: 1008 hPa (↓ below normal)\n• Humidity: 88% (↑ high)\n• Temperature: 32°C\n• Pollen: High\n\n⚠️ **Sinusitis flare-up risk: 80%** in the next 12 hours\n\n📋 **Prevention plan:**\n1. 💧 Saline nasal spray 3x/day\n2. 🏠 Avoid sudden cold AC exposure\n3. 🧣 Keep face and neck warm\n4. ☕ Drink warm water instead of cold\n5. 😴 Sleep enough, elevate pillow\n\n🔔 I'll remind you for nasal spray at 2:00 PM`;
      } else if (hasDiabetes) {
        weatherAdvice = i18n.language === 'vi'
          ? `🌤️ **PHÂN TÍCH THỜI TIẾT - TIỀN TIỂU ĐƯỜNG**\n\n📊 **Điều kiện hiện tại:**\n• Nhiệt độ: 32°C (nóng)\n• UV Index: 7 (cao)\n\n⚠️ **Lưu ý đặc biệt:**\nNhiệt độ cao có thể:\n• Ảnh hưởng đến độ ổn định của insulin\n• Gây mất nước → tăng đường huyết\n\n📋 **Khuyến nghị:**\n1. 💧 Uống ít nhất 2.5L nước/ngày\n2. 🧪 Kiểm tra đường huyết mỗi 4 tiếng\n3. 🍎 Ăn nhẹ, chia nhỏ bữa\n4. 🌡️ Tránh nắng trực tiếp 11h-15h\n\n📍 Đường huyết gần nhất: 105 mg/dL (tiền tiểu đường)`
          : `🌤️ **WEATHER ANALYSIS - PRE-DIABETES**\n\n📊 **Current conditions:**\n• Temperature: 32°C (hot)\n• UV Index: 7 (high)\n\n⚠️ **Special notes:**\nHigh temperature can:\n• Affect insulin stability\n• Cause dehydration → elevated glucose\n\n📋 **Recommendations:**\n1. 💧 Drink at least 2.5L water/day\n2. 🧪 Check glucose every 4 hours\n3. 🍎 Light meals, eat frequently\n4. 🌡️ Avoid direct sun 11am-3pm\n\n📍 Latest glucose: 105 mg/dL (pre-diabetic range)`;
      } else {
        weatherAdvice = i18n.language === 'vi'
          ? `🌤️ **THỜI TIẾT HÔM NAY**\n\n• Nhiệt độ: 32°C\n• Độ ẩm: 88%\n• AQI: 85\n• UV: 7\n\n✅ Điều kiện tốt cho hồ sơ sức khỏe của bạn.\nKhông có cảnh báo đặc biệt.`
          : `🌤️ **TODAY'S WEATHER**\n\n• Temperature: 32°C\n• Humidity: 88%\n• AQI: 85\n• UV: 7\n\n✅ Good conditions for your health profile.\nNo special alerts.`;
      }

      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: weatherAdvice,
        timestamp: new Date(),
        type: 'recommendation'
      };
    }

    // Medication check
    if (lowerMessage.includes('thuốc') || lowerMessage.includes('medication') || lowerMessage.includes('pill') || actionType === 'medication') {
      const meds = profile?.medications || [];
      const medList = meds.map(m => typeof m === 'string' ? m : `${m.name} ${m.dosage}`).join(', ');
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: i18n.language === 'vi'
          ? `💊 **QUẢN LÝ THUỐC**\n\n📋 **Thuốc đang dùng:**\n${meds.map(m => {
            if (typeof m === 'string') return `• ${m}`;
            return `• **${m.name}** ${m.dosage}\n  ⏰ ${m.timeSlots.join(', ')}\n  📦 Còn lại: ${m.stock} viên`;
          }).join('\n\n')}\n\n⏰ **Lịch hôm nay:**\n• 08:00 - Lisinopril 10mg ✅ Đã uống\n• 08:00 - Metformin 500mg ⚠️ Chưa uống\n• 20:00 - Metformin 500mg ⏳ Chờ\n\n⚠️ **Nhắc nhở:** Bạn chưa uống Metformin sáng nay!\n\n💡 **Mẹo:** Uống Metformin cùng bữa ăn để giảm khó chịu dạ dày.`
          : `💊 **MEDICATION MANAGEMENT**\n\n📋 **Current medications:**\n${meds.map(m => {
            if (typeof m === 'string') return `• ${m}`;
            return `• **${m.name}** ${m.dosage}\n  ⏰ ${m.timeSlots.join(', ')}\n  📦 Remaining: ${m.stock} pills`;
          }).join('\n\n')}\n\n⏰ **Today's schedule:**\n• 08:00 - Lisinopril 10mg ✅ Taken\n• 08:00 - Metformin 500mg ⚠️ Not taken\n• 20:00 - Metformin 500mg ⏳ Pending\n\n⚠️ **Reminder:** You haven't taken Metformin this morning!\n\n💡 **Tip:** Take Metformin with food to reduce stomach discomfort.`,
        timestamp: new Date(),
        type: 'recommendation',
        metadata: {
          actions: [
            { label: i18n.language === 'vi' ? 'Đánh dấu đã uống' : 'Mark as taken', action: 'mark_taken' },
            { label: i18n.language === 'vi' ? 'Đặt nhắc nhở' : 'Set reminder', action: 'set_reminder' }
          ]
        }
      };
    }

    // Emergency protocol
    if (lowerMessage.includes('khẩn cấp') || lowerMessage.includes('emergency') || lowerMessage.includes('cấp cứu') || actionType === 'emergency') {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: i18n.language === 'vi'
          ? `🚨 **QUY TRÌNH KHẨN CẤP**\n\n📞 **Liên hệ khẩn cấp của bạn:**\n• ${profile?.emergencyContacts?.[0]?.name || 'Chưa thiết lập'} (${profile?.emergencyContacts?.[0]?.relationship || ''}) - ${profile?.emergencyContacts?.[0]?.phone || 'N/A'}\n\n🏥 **Bệnh viện gần nhất:**\n• BV Đại học Y Dược - 2.3 km\n• BV Chợ Rẫy - 4.1 km\n\n⚠️ **Nếu gặp triệu chứng sau, GỌI 115 NGAY:**\n• Đau ngực dữ dội\n• Khó thở nghiêm trọng\n• Tê yếu nửa người\n• Mất ý thức\n\n💊 **Với hồ sơ của bạn:**\n• Huyết áp cao → Đau đầu dữ dội + chóng mặt = NGUY HIỂM\n• Viêm xoang → Sốt cao + đau mặt = Cần đi khám\n\n📍 **Vị trí hiện tại đã được lưu**\nNhấn nút SOS để thông báo người thân ngay lập tức.`
          : `🚨 **EMERGENCY PROTOCOL**\n\n📞 **Your emergency contacts:**\n• ${profile?.emergencyContacts?.[0]?.name || 'Not set'} (${profile?.emergencyContacts?.[0]?.relationship || ''}) - ${profile?.emergencyContacts?.[0]?.phone || 'N/A'}\n\n🏥 **Nearest hospitals:**\n• University Medical Center - 2.3 km\n• Cho Ray Hospital - 4.1 km\n\n⚠️ **If experiencing these symptoms, CALL 115 IMMEDIATELY:**\n• Severe chest pain\n• Serious breathing difficulty\n• Numbness/weakness on one side\n• Loss of consciousness\n\n💊 **With your profile:**\n• Hypertension → Severe headache + dizziness = DANGER\n• Sinusitis → High fever + facial pain = Need checkup\n\n📍 **Current location saved**\nPress SOS button to notify family immediately.`,
        timestamp: new Date(),
        type: 'emergency',
        metadata: {
          risk: 0,
          actions: [
            { label: i18n.language === 'vi' ? 'Gọi 115' : 'Call 115', action: 'call_emergency' },
            { label: i18n.language === 'vi' ? 'Liên hệ gia đình' : 'Contact family', action: 'contact_family' },
            { label: i18n.language === 'vi' ? 'Chia sẻ vị trí' : 'Share location', action: 'share_location' }
          ]
        }
      };
    }

    // Default helpful response
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: i18n.language === 'vi'
        ? `Cảm ơn bạn! Dựa trên hồ sơ sức khỏe với ${profile?.chronicConditions.length || 0} bệnh nền và điều kiện môi trường hiện tại, tôi có thể giúp bạn:\n\n🗺️ **Phân tích lộ trình an toàn** - Đánh giá các tuyến đường phù hợp với sức khỏe\n🌤️ **Dự báo ảnh hưởng thời tiết** - Cảnh báo khi môi trường bất lợi\n💊 **Quản lý thuốc thông minh** - Nhắc nhở và tương tác thuốc\n🚨 **Quy trình khẩn cấp** - Hướng dẫn xử lý tình huống\n\nBạn muốn tôi hỗ trợ vấn đề nào?`
        : `Thank you! Based on your health profile with ${profile?.chronicConditions.length || 0} chronic conditions and current environmental conditions, I can help you with:\n\n🗺️ **Safe route analysis** - Evaluate paths suitable for your health\n🌤️ **Weather impact forecast** - Alerts when environment is unfavorable\n💊 **Smart medication management** - Reminders and interactions\n🚨 **Emergency protocol** - Situation handling guidance\n\nWhat would you like me to assist with?`,
      timestamp: new Date(),
      type: 'text'
    };
  };

  const handleSend = async (customQuery?: string, actionType?: string) => {
    const messageText = customQuery || input;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const response = await generateAIResponse(messageText, actionType);
    setMessages(prev => [...prev, response]);
    setIsTyping(false);

    // Text-to-speech if enabled
    if (voiceEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response.content.replace(/[*#_]/g, ''));
      utterance.lang = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    setIsListening(true);
    // Voice input simulation
    setTimeout(() => {
      setIsListening(false);
      setInput(i18n.language === 'vi' ? 'Thời tiết hôm nay ảnh hưởng đến tôi thế nào?' : 'How does today\'s weather affect me?');
    }, 2000);
  };

  const getMessageStyle = (type?: Message['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-danger/10 border-danger/30';
      case 'emergency':
        return 'bg-danger/10 border-danger/50 border-2';
      case 'route':
        return 'bg-info/10 border-info/30';
      case 'recommendation':
        return 'bg-success/10 border-success/30';
      default:
        return 'bg-muted/50';
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur h-[650px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            {t('biovault.consultant.title', 'Trợ lý tư vấn sinh tồn AI')}
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={voiceEnabled ? 'text-primary' : 'text-muted-foreground'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
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
                  w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'assistant' 
                    ? 'bg-gradient-to-br from-primary/20 to-info/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {message.role === 'assistant' ? (
                    <Brain className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                
                <div className={`
                  max-w-[85%] rounded-2xl px-4 py-3 text-sm border
                  ${message.role === 'assistant' 
                    ? getMessageStyle(message.type)
                    : 'bg-primary text-primary-foreground border-transparent'
                  }
                `}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Action buttons */}
                  {message.metadata?.actions && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.metadata.actions.map((action, i) => (
                        <Button key={i} size="sm" variant="outline" className="text-xs h-7">
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="bg-muted/50 rounded-2xl px-4 py-3 border border-border">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickActions.map((action, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="whitespace-nowrap text-xs gap-1.5 flex-shrink-0"
                onClick={() => handleSend(i18n.language === 'vi' ? action.queryVi : action.query, action.type)}
              >
                <action.icon className="h-3.5 w-3.5" />
                {i18n.language === 'vi' ? action.labelVi : action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleVoiceInput}
              disabled={isListening}
              className={isListening ? 'animate-pulse border-primary text-primary' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={t('biovault.consultant.placeholder', 'Hỏi về sức khỏe, lộ trình, thời tiết...')}
              className="flex-1"
              disabled={isListening}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isTyping}
              size="icon"
              className="bg-gradient-to-r from-primary to-info hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
