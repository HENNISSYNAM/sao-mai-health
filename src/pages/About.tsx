import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, Brain, Shield, Users, Globe, Zap,
  Target, Rocket, Star, Mail, ExternalLink,
  Award, TrendingUp, Activity, Fingerprint
} from 'lucide-react';
import logoImg from '@/assets/logo.png';

const About = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const stats = [
    { value: '50K+', label: isVi ? 'Người dùng' : 'Users', icon: Users },
    { value: '1M+', label: isVi ? 'Cảnh báo' : 'Alerts', icon: Activity },
    { value: '24/7', label: isVi ? 'Giám sát' : 'Monitoring', icon: Shield },
    { value: '99.9%', label: isVi ? 'Uptime' : 'Uptime', icon: Zap }
  ];

  const team = [
    { name: 'Dr. Nguyễn Minh', role: isVi ? 'CEO & Nhà sáng lập' : 'CEO & Founder', specialty: 'AI Healthcare' },
    { name: 'TS. Trần Hương', role: isVi ? 'CTO' : 'CTO', specialty: 'Digital Twin Systems' },
    { name: 'BS. Lê Văn Đức', role: isVi ? 'Cố vấn Y khoa' : 'Medical Advisor', specialty: 'Epidemiology' }
  ];

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
            {isVi ? 'Sứ mệnh của chúng tôi' : 'Our Mission'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg leading-relaxed">
            {isVi 
              ? 'Tại Sao Mai Health, chúng tôi tin rằng mỗi người đều xứng đáng có một "bản sao số" (Digital Twin) của chính mình — một hệ thống AI hiểu rõ cơ thể bạn, môi trường xung quanh, và dự báo rủi ro sức khỏe trước khi chúng xảy ra.'
              : 'At Sao Mai Health, we believe everyone deserves their own "Digital Twin" — an AI system that deeply understands your body, your environment, and predicts health risks before they occur.'}
          </p>
          <p className="text-muted-foreground">
            {isVi 
              ? 'Chúng tôi kết hợp dữ liệu từ nhiều nguồn: hồ sơ y tế cá nhân, dữ liệu môi trường thời gian thực (thời tiết, chất lượng không khí, áp suất), vị trí GPS, và tín hiệu cảm biến — để tạo ra một "bản sao số" phản ánh chính xác tình trạng sinh lý của bạn tại từng thời điểm.'
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

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Award className="h-6 w-6 text-info" />
            {isVi ? 'Đội ngũ sáng lập' : 'Founding Team'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {team.map((member, idx) => (
              <div key={idx} className="text-center p-4 rounded-2xl bg-muted/30">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <h4 className="font-semibold">{member.name}</h4>
                <p className="text-sm text-primary">{member.role}</p>
                <Badge variant="outline" className="mt-2 text-xs">{member.specialty}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="bg-gradient-to-r from-primary/10 to-info/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{isVi ? 'Liên hệ với chúng tôi' : 'Contact Us'}</h3>
                <p className="text-sm text-muted-foreground">hello@saomaihealth.vn</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Globe className="h-4 w-4" />
                {isVi ? 'Website' : 'Website'}
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button className="gap-2">
                <Star className="h-4 w-4" />
                {isVi ? 'Dùng thử miễn phí' : 'Try Free'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Sao Mai Health v2.0 • © 2025 Sao Mai Health JSC</p>
        <p className="mt-1">{isVi ? 'Made with ❤️ in Vietnam' : 'Made with ❤️ in Vietnam'}</p>
      </div>
    </div>
  );
};

export default About;
