import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, MapPin, Clock, Heart, Brain, Rocket,
  Users, Sparkles, Code2, Palette, LineChart, Shield,
  ArrowRight, Coffee, Zap
} from 'lucide-react';

const positions = [
  {
    title: 'AI/ML Engineer',
    team: 'AI & Data',
    type: 'Full-time',
    location: 'HCM / Remote',
    icon: Brain,
    color: 'text-primary',
    tags: ['Python', 'TensorFlow', 'LLM', 'Health AI'],
    description: 'Xây dựng mô hình AI dự báo sức khỏe, phân tích dữ liệu y sinh và tối ưu hóa Digital Twin engine.',
  },
  {
    title: 'Full-stack Developer',
    team: 'Engineering',
    type: 'Full-time',
    location: 'HCM / Remote',
    icon: Code2,
    color: 'text-info',
    tags: ['React', 'TypeScript', 'Supabase', 'Edge Functions'],
    description: 'Phát triển nền tảng web/mobile cho hệ sinh thái y tế số — từ BioVault đến hệ thống giám sát dịch tễ.',
  },
  {
    title: 'UX/UI Designer',
    team: 'Design',
    type: 'Full-time / Part-time',
    location: 'HCM / Remote',
    icon: Palette,
    color: 'text-warning',
    tags: ['Figma', 'Health UX', 'Design System', 'Motion'],
    description: 'Thiết kế trải nghiệm y tế số — biến dữ liệu phức tạp thành giao diện trực quan, dễ hiểu cho người dùng.',
  },
  {
    title: 'Data Analyst / Epidemiologist',
    team: 'Health Intelligence',
    type: 'Full-time',
    location: 'HCM',
    icon: LineChart,
    color: 'text-success',
    tags: ['Epidemiology', 'R/Python', 'GIS', 'Public Health'],
    description: 'Phân tích dữ liệu dịch tễ, xây dựng mô hình dự báo ổ dịch và tích hợp dữ liệu từ hệ thống y tế công.',
  },
  {
    title: 'Business Development',
    team: 'Growth',
    type: 'Full-time',
    location: 'HCM / Hà Nội',
    icon: Rocket,
    color: 'text-danger',
    tags: ['B2B', 'HealthTech', 'Insurance', 'Partnership'],
    description: 'Mở rộng hệ sinh thái đối tác — bệnh viện, bảo hiểm, doanh nghiệp — đưa Sao Mai đến hàng triệu người dùng.',
  },
];

const perks = [
  { icon: Heart, title: 'Bảo hiểm sức khỏe', desc: 'Bảo hiểm y tế toàn diện + gói Bio-Shield Pro miễn phí cho cả gia đình', color: 'text-danger' },
  { icon: Coffee, title: 'Linh hoạt & Remote', desc: 'Làm việc từ xa, giờ giấc linh hoạt — đánh giá theo output, không giờ công', color: 'text-warning' },
  { icon: Zap, title: 'Equity & Bonus', desc: 'ESOP cho nhân viên sớm, thưởng theo milestone dự án và OKR cá nhân', color: 'text-info' },
  { icon: Sparkles, title: 'Học & Phát triển', desc: 'Ngân sách học tập không giới hạn, tham gia hội nghị quốc tế, mentorship 1-1', color: 'text-primary' },
  { icon: Users, title: 'Đội ngũ đa dạng', desc: 'Làm việc cùng chuyên gia AI, bác sĩ, nhà dịch tễ học và designer hàng đầu', color: 'text-success' },
  { icon: Shield, title: 'Tác động xã hội', desc: 'Sản phẩm bạn xây dựng trực tiếp bảo vệ sức khỏe hàng triệu người Việt', color: 'text-primary' },
];

const Careers: React.FC = () => {
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 py-4">
        <Badge className="bg-primary/10 text-primary border-primary/30">
          <Briefcase className="h-3 w-3 mr-1" />
          {isVi ? 'Tuyển dụng' : 'Careers'}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {isVi ? 'Cùng xây dựng tương lai Y tế số Việt Nam' : 'Build the Future of Vietnamese HealthTech'}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          {isVi
            ? 'Sao Mai Health đang tìm kiếm những người đam mê công nghệ và y tế — sẵn sàng tạo ra sản phẩm bảo vệ sức khỏe hàng triệu người.'
            : 'Sao Mai Health is looking for people passionate about technology and healthcare — ready to build products that protect millions of lives.'}
        </p>
      </div>

      {/* Culture & Perks */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-warning" />
          {isVi ? 'Quyền lợi & Văn hóa' : 'Perks & Culture'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perks.map((perk, i) => (
            <Card key={i} className="border-border hover:border-primary/30 transition-colors">
              <CardContent className="pt-5 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <perk.icon className={`h-5 w-5 ${perk.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{perk.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{perk.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          {isVi ? 'Vị trí đang tuyển' : 'Open Positions'}
          <Badge variant="secondary" className="text-xs">{positions.length}</Badge>
        </h2>
        <div className="space-y-4">
          {positions.map((pos, i) => (
            <Card key={i} className="border-border hover:border-primary/20 transition-all hover:shadow-md group">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                      <pos.icon className={`h-5 w-5 ${pos.color}`} />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-bold text-foreground">{pos.title}</h3>
                        <p className="text-xs text-muted-foreground">{pos.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="h-3 w-3" />{pos.team}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />{pos.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="h-3 w-3" />{pos.location}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pos.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="gap-1.5 shrink-0 self-start sm:self-center">
                    {isVi ? 'Ứng tuyển' : 'Apply'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background text-center">
        <CardContent className="py-10 space-y-4">
          <h3 className="text-xl font-bold text-foreground">
            {isVi ? 'Không thấy vị trí phù hợp?' : "Don't see a fit?"}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            {isVi
              ? 'Gửi CV và portfolio đến email bên dưới — chúng tôi luôn tìm kiếm tài năng đặc biệt.'
              : 'Send your CV and portfolio — we are always looking for exceptional talent.'}
          </p>
          <Button variant="outline" className="gap-2" asChild>
            <a href="mailto:careers@saomaihealth.com">
              careers@saomaihealth.com
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Careers;
