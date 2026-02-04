import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, Brain, Shield, Users, Zap,
  Target, Rocket, Activity, Fingerprint,
  MessageSquareHeart, Coffee, CreditCard, Send, Star, Sparkles
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const About = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, getDisplayName } = useAuth();
  const { toast } = useToast();
  const isVi = i18n.language === 'vi';
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stats = [
    { value: '50K+', label: isVi ? 'Người dùng' : 'Users', icon: Users },
    { value: '1M+', label: isVi ? 'Cảnh báo' : 'Alerts', icon: Activity },
    { value: '24/7', label: isVi ? 'Giám sát' : 'Monitoring', icon: Shield },
    { value: '99.9%', label: isVi ? 'Uptime' : 'Uptime', icon: Zap }
  ];

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    
    // Simulate sending feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: isVi ? '💚 Cảm ơn bạn!' : '💚 Thank you!',
      description: isVi 
        ? 'Góp ý của bạn là động lực để chúng tôi phát triển tốt hơn.'
        : 'Your feedback motivates us to improve.',
    });
    
    setFeedback('');
    setRating(0);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border p-8 md:p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-3xl bg-background shadow-2xl flex items-center justify-center animate-heartbeat">
            <img src={logoImg} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <div className="text-center md:text-left">
            <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
              {isVi ? '🚀 Startup Y tế số Việt Nam' : '🚀 Vietnam HealthTech Startup'}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {isVi ? 'Sao Mai Health' : 'Sao Mai Health'}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              {isVi 
                ? 'Mỗi người một bản sao số — Bảo vệ sức khỏe bằng AI dự báo'
                : 'One Digital Twin for Everyone — AI-Powered Preventive Health'}
            </p>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Target className="h-6 w-6 text-primary" />
            {isVi ? 'Sứ mệnh của chúng tớ' : 'Our Mission'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg leading-relaxed">
            {isVi 
              ? 'Tại Sao Mai Health, chúng tớ tin rằng mỗi người đều xứng đáng có một "bản sao số" (Digital Twin) của chính mình — một hệ thống AI hiểu rõ cơ thể bạn, môi trường xung quanh, và dự báo rủi ro sức khỏe trước khi chúng xảy ra.'
              : 'At Sao Mai Health, we believe everyone deserves their own "Digital Twin" — an AI system that deeply understands your body, your environment, and predicts health risks before they occur.'}
          </p>
          <p className="text-muted-foreground">
            {isVi 
              ? 'Chúng tớ kết hợp dữ liệu từ nhiều nguồn: hồ sơ y tế cá nhân, dữ liệu môi trường thời gian thực (thời tiết, chất lượng không khí, áp suất), vị trí GPS, và tín hiệu cảm biến — để tạo ra một "bản sao số" phản ánh chính xác tình trạng sinh lý của bạn tại từng thời điểm.'
              : 'We combine data from multiple sources: personal medical records, real-time environmental data (weather, air quality, pressure), GPS location, and sensor signals — to create a "digital twin" that accurately reflects your physiological state at any moment.'}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="text-center">
            <CardContent className="pt-6">
              <stat.icon className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vision */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-danger/10 to-background">
          <CardContent className="pt-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-danger/20 flex items-center justify-center">
              <Heart className="h-6 w-6 text-danger" />
            </div>
            <h3 className="font-bold text-lg">{isVi ? 'Phòng bệnh hơn chữa bệnh' : 'Prevention Over Cure'}</h3>
            <p className="text-sm text-muted-foreground">
              {isVi 
                ? 'AI dự báo giúp bạn biết trước nguy cơ đột quỵ, bệnh tim mạch, hô hấp — và hành động kịp thời.'
                : 'Predictive AI helps you know stroke, cardiovascular, respiratory risks in advance — and act in time.'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-background">
          <CardContent className="pt-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{isVi ? 'AI hiểu bạn' : 'AI That Understands You'}</h3>
            <p className="text-sm text-muted-foreground">
              {isVi 
                ? 'Digital Twin học từ lịch sử sức khỏe, thói quen, môi trường sống để đưa ra khuyến nghị cá nhân hóa.'
                : 'Digital Twin learns from your health history, habits, living environment to provide personalized recommendations.'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-background">
          <CardContent className="pt-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-bold text-lg">{isVi ? 'Bảo mật tuyệt đối' : 'Absolute Privacy'}</h3>
            <p className="text-sm text-muted-foreground">
              {isVi 
                ? 'Dữ liệu sức khỏe của bạn được mã hóa end-to-end. Chỉ bạn mới có quyền truy cập và chia sẻ.'
                : 'Your health data is end-to-end encrypted. Only you have access and sharing rights.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Why Digital Twin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Rocket className="h-6 w-6 text-warning" />
            {isVi ? 'Tại sao cần Song sinh số Y tế?' : 'Why Health Digital Twin?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-danger font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold">{isVi ? 'Đột quỵ có thể phòng ngừa' : 'Stroke is Preventable'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isVi 
                      ? '80% ca đột quỵ có thể phòng tránh nếu phát hiện sớm các yếu tố nguy cơ.'
                      : '80% of strokes can be prevented with early detection of risk factors.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-warning font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold">{isVi ? 'Môi trường ảnh hưởng sức khỏe' : 'Environment Affects Health'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isVi 
                      ? 'Thay đổi áp suất, AQI, nhiệt độ có thể kích hoạt các cơn đau đầu, hen suyễn, đau khớp.'
                      : 'Changes in pressure, AQI, temperature can trigger headaches, asthma, joint pain.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-success font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold">{isVi ? 'Dữ liệu phân tán' : 'Fragmented Data'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isVi 
                      ? 'Hồ sơ y tế nằm rải rác ở nhiều nơi. Digital Twin tập hợp tất cả vào một nơi.'
                      : 'Medical records are scattered across many places. Digital Twin consolidates everything.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-semibold">{isVi ? 'Chăm sóc chủ động' : 'Proactive Care'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {isVi 
                      ? 'Thay vì đợi bệnh rồi chữa, hãy để AI giúp bạn sống khỏe mạnh hơn mỗi ngày.'
                      : 'Instead of waiting to get sick, let AI help you live healthier every day.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback & Donation Section - Only for authenticated users */}
      {isAuthenticated && (
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-warning/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-warning/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-danger/10 to-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageSquareHeart className="h-6 w-6 text-primary animate-pulse" />
              {isVi ? 'Góp ý & Ủng hộ' : 'Feedback & Support'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {isVi 
                ? `Xin chào ${getDisplayName()}, cảm ơn bạn đã đồng hành cùng Sao Mai Health!`
                : `Hello ${getDisplayName()}, thank you for being with Sao Mai Health!`}
            </p>
          </CardHeader>
          
          <CardContent className="relative z-10 space-y-6">
            {/* Feedback Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{isVi ? 'Đánh giá:' : 'Rating:'}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`h-6 w-6 transition-colors ${
                          star <= rating 
                            ? 'fill-warning text-warning' 
                            : 'text-muted-foreground/30 hover:text-warning/50'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={isVi 
                  ? 'Chia sẻ góp ý của bạn để chúng tôi cải thiện ứng dụng tốt hơn...'
                  : 'Share your feedback to help us improve...'}
                className="min-h-[100px] resize-none"
              />
              
              <Button 
                onClick={handleSubmitFeedback}
                disabled={!feedback.trim() || isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting 
                  ? (isVi ? 'Đang gửi...' : 'Sending...') 
                  : (isVi ? 'Gửi góp ý' : 'Send Feedback')}
              </Button>
            </div>

            <Separator className="my-6" />

            {/* Donation Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-warning" />
                <h4 className="font-semibold text-lg">
                  {isVi ? 'Ủng hộ dự án' : 'Support the Project'}
                </h4>
                <Sparkles className="h-4 w-4 text-warning animate-pulse" />
              </div>
              
              {/* Emotional Message */}
              <div className="bg-gradient-to-r from-primary/10 via-background to-danger/10 rounded-xl p-5 border border-primary/20">
                <p className="text-sm leading-relaxed text-foreground/90 italic">
                  {isVi ? (
                    <>
                      "Sao Mai Health được xây dựng bởi một nhà phát triển độc lập với ước mơ mang công nghệ AI y tế đến gần hơn với mọi người dân Việt Nam. Mỗi dòng code được viết ra đều mang theo hy vọng — rằng một ngày nào đó, không ai phải lo lắng về sức khỏe vì đã có AI dự báo và bảo vệ họ.
                      <br /><br />
                      Nếu ứng dụng này đã từng giúp ích cho bạn, một ly cà phê nhỏ sẽ là nguồn động viên lớn lao để tôi tiếp tục hành trình này. Cảm ơn bạn đã đọc đến đây — điều đó với tôi đã là một món quà."
                    </>
                  ) : (
                    <>
                      "Sao Mai Health is built by an independent developer with a dream to bring AI healthcare technology closer to every Vietnamese citizen. Every line of code is written with hope — that one day, no one will have to worry about their health because AI will predict and protect them.
                      <br /><br />
                      If this app has ever helped you, a small coffee would be a great encouragement for me to continue this journey. Thank you for reading this far — that alone is a gift to me."
                    </>
                  )}
                </p>
                <p className="text-right mt-3 text-sm font-medium text-primary">
                  — Nam, {isVi ? 'Nhà sáng lập' : 'Founder'} 💚
                </p>
              </div>

              {/* Bank Info */}
              <div className="bg-card border-2 border-primary/20 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-center gap-3 text-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">{isVi ? 'Thông tin chuyển khoản' : 'Bank Transfer Info'}</span>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {isVi ? 'Chủ tài khoản' : 'Account Holder'}
                    </p>
                    <p className="font-bold text-lg">ĐINH VĂN NAM</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {isVi ? 'Số tài khoản' : 'Account Number'}
                    </p>
                    <p className="font-mono font-bold text-2xl text-primary tracking-wider">
                      2800205302805
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {isVi ? 'Ngân hàng' : 'Bank'}
                    </p>
                    <p className="font-semibold">
                      Agribank — Chi nhánh Tỉnh Vĩnh Phúc
                    </p>
                  </div>
                </div>
                
                <p className="text-center text-sm text-muted-foreground">
                  {isVi 
                    ? '💚 Mọi đóng góp dù nhỏ đều được trân trọng và sử dụng để phát triển ứng dụng.'
                    : '💚 Every contribution, no matter how small, is appreciated and used to develop the app.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Sao Mai Health v2.0 • © 2025 Sao Mai Health JSC</p>
        <p className="mt-1">{isVi ? 'Made with ❤️ in Vietnam' : 'Made with ❤️ in Vietnam'}</p>
      </div>
    </div>
  );
};

export default About;
