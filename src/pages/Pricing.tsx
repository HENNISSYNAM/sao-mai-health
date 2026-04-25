import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield, Sparkles, Crown, Building2, Check, X,
  Brain, FileText, Users, BarChart3, Cpu, Cloud,
  Smartphone, Heart, Activity, Zap
} from 'lucide-react';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    persona: 'Người trẻ năng động',
    personaAge: '18–30 tuổi',
    icon: Smartphone,
    monthlyPrice: 79000,
    yearlyPrice: 790000,
    color: 'from-info/20 to-info/5',
    borderColor: 'border-info/30',
    iconColor: 'text-info',
    badgeClass: 'bg-info/10 text-info border-info/30',
    cta: 'Bắt đầu miễn phí',
    ctaClass: 'bg-info hover:bg-info/90 text-info-foreground',
    aiMode: 'Local AI',
    aiCost: '~0₫/user',
    features: [
      { name: 'Bio-Shield Index cơ bản', included: true },
      { name: 'Quét khuôn mặt 3D (2 lần/tháng)', included: true },
      { name: 'Cảnh báo đột quỵ cơ bản', included: true },
      { name: 'Báo cáo sức khỏe (2/tháng)', included: true },
      { name: 'AI giải thích (Local AI)', included: true },
      { name: 'Xuất PDF', included: false },
      { name: 'Hồ sơ gia đình', included: false },
      { name: 'Phân tích tài liệu y tế', included: false },
      { name: 'Dự báo rủi ro 30 ngày', included: false },
      { name: 'API truy cập', included: false },
    ],
  },
  {
    id: 'family',
    name: 'Family Care',
    persona: 'Quản lý sức khỏe gia đình',
    personaAge: '30–45 tuổi',
    icon: Heart,
    monthlyPrice: 199000,
    yearlyPrice: 1990000,
    color: 'from-success/20 to-success/5',
    borderColor: 'border-success/30',
    iconColor: 'text-success',
    badgeClass: 'bg-success/10 text-success border-success/30',
    popular: true,
    cta: 'Chọn Family Care',
    ctaClass: 'bg-success hover:bg-success/90 text-success-foreground',
    aiMode: 'Hybrid AI',
    aiCost: '~2.000₫/user',
    features: [
      { name: 'Bio-Shield Index nâng cao', included: true },
      { name: 'Quét khuôn mặt 3D (không giới hạn)', included: true },
      { name: 'Cảnh báo AI phòng ngừa', included: true },
      { name: 'Báo cáo sức khỏe (10/tháng)', included: true },
      { name: 'AI giải thích (Cloud + Local)', included: true },
      { name: 'Xuất PDF cơ bản', included: true },
      { name: 'Hồ sơ gia đình (3–5 người)', included: true },
      { name: 'Phân tích tài liệu y tế', included: false },
      { name: 'Dự báo rủi ro 30 ngày', included: false },
      { name: 'API truy cập', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Health Pro',
    persona: 'Người có bệnh nền',
    personaAge: 'Mọi độ tuổi',
    icon: Activity,
    monthlyPrice: 399000,
    yearlyPrice: 3990000,
    color: 'from-primary/20 to-primary/5',
    borderColor: 'border-primary/30',
    iconColor: 'text-primary',
    badgeClass: 'bg-primary/10 text-primary border-primary/30',
    cta: 'Nâng cấp Pro',
    ctaClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    aiMode: 'Cloud AI ưu tiên',
    aiCost: '~8.000₫/user',
    features: [
      { name: 'Bio-Shield Index chuyên sâu', included: true },
      { name: 'Quét khuôn mặt 3D (không giới hạn)', included: true },
      { name: 'Cảnh báo AI phòng ngừa', included: true },
      { name: 'Báo cáo AI không giới hạn', included: true },
      { name: 'AI Cloud ưu tiên', included: true },
      { name: 'Xuất PDF chuyên sâu', included: true },
      { name: 'Hồ sơ gia đình (5 người)', included: true },
      { name: 'Phân tích tài liệu y tế', included: true },
      { name: 'Dự báo rủi ro 30 ngày', included: true },
      { name: 'API truy cập', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    persona: 'Doanh nghiệp / Bảo hiểm',
    personaAge: 'Tổ chức',
    icon: Building2,
    monthlyPrice: 2990000,
    yearlyPrice: 29900000,
    color: 'from-warning/20 to-warning/5',
    borderColor: 'border-warning/30',
    iconColor: 'text-warning',
    badgeClass: 'bg-warning/10 text-warning border-warning/30',
    cta: 'Bắt đầu Enterprise',
    ctaClass: 'bg-gradient-to-r from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-warning-foreground',
    aiMode: 'Dedicated Cloud AI',
    aiCost: '~20.000₫/user',
    addOns: [
      { name: 'Thêm 50 user', price: 500000 },
      { name: 'AI pipeline chuyên biệt', price: 1500000 },
      { name: 'White-label branding', price: 2000000 },
      { name: 'Tích hợp hệ thống (HL7/FHIR)', price: 3000000 },
    ],
    features: [
      { name: 'Tất cả tính năng Health Pro', included: true },
      { name: 'Dashboard quản lý đa người dùng', included: true },
      { name: 'Xuất dữ liệu CSV/PDF/API', included: true },
      { name: 'Phân quyền & quản lý vai trò', included: true },
      { name: 'Báo cáo & phân tích nâng cao', included: true },
      { name: 'API truy cập đầy đủ', included: true },
      { name: 'AI pipeline riêng biệt', included: true },
      { name: 'SLA hỗ trợ ưu tiên', included: true },
      { name: 'White-label option', included: true },
      { name: 'Tích hợp hệ thống tùy chỉnh', included: true },
    ],
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN').format(price) + '₫';
};

const Pricing: React.FC = () => {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Bio-Shield AI</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Chọn gói phù hợp với nhu cầu sức khỏe của bạn. AI chi phí được kiểm soát theo từng tầng.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Label className={`text-sm ${!isYearly ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
            Hàng tháng
          </Label>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <Label className={`text-sm ${isYearly ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
            Hàng năm
          </Label>
          {isYearly && (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/30 text-xs">
              Tiết kiệm 2 tháng
            </Badge>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const TierIcon = tier.icon;
          const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice;

          return (
            <Card
              key={tier.id}
              className={`relative overflow-hidden border-2 ${tier.borderColor} bg-gradient-to-br ${tier.color} transition-all hover:shadow-lg hover:-translate-y-1`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-success text-success-foreground text-xs px-3 py-1">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Phổ biến nhất
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl bg-card/80 backdrop-blur`}>
                    <TierIcon className={`h-6 w-6 ${tier.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">{tier.name}</CardTitle>
                    <CardDescription className="text-xs">{tier.persona} · {tier.personaAge}</CardDescription>
                  </div>
                </div>

                {/* Price */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      {formatPrice(price)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /{isYearly ? 'năm' : 'tháng'}
                    </span>
                  </div>
                  {tier.id === 'enterprise' && (
                    <p className="text-xs text-muted-foreground mt-1">Bắt đầu từ · tối đa 20 users</p>
                  )}
                </div>

                {/* AI Mode Badge */}
                <div className="flex items-center gap-2 pt-3">
                  <Badge variant="outline" className={`text-xs ${tier.badgeClass}`}>
                    <Cpu className="h-3 w-3 mr-1" />
                    {tier.aiMode}
                  </Badge>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {tier.aiCost}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* CTA Button */}
                <Button className={`w-full ${tier.ctaClass}`}>
                  {tier.cta}
                </Button>

                {/* Features */}
                <ul className="space-y-2.5">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Enterprise Add-ons */}
                {'addOns' in tier && (tier as any).addOns && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold text-foreground mb-2">Nâng cấp thêm:</p>
                    <ul className="space-y-1.5">
                      {(tier as any).addOns.map((addon: { name: string; price: number }, idx: number) => (
                        <li key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{addon.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">{formatPrice(addon.price)}/th</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Cost Control Info */}
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Kiểm soát chi phí AI theo tầng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-info" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Starter:</strong> Local AI only — 0₫ chi phí AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Family:</strong> Hybrid — Cloud fallback khi cần</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Pro:</strong> Cloud ưu tiên — queue riêng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-warning" />
                  <span className="text-muted-foreground"><strong className="text-foreground">Enterprise:</strong> Dedicated pipeline</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pricing;
