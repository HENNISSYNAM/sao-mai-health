import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Building, Star } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Cơ bản',
    price: '299,000',
    period: '/tháng',
    description: 'Dành cho phòng khám nhỏ',
    icon: Star,
    features: [
      'Quản lý tối đa 100 bệnh nhân',
      'Báo cáo cơ bản',
      'Hỗ trợ email',
      'Lưu trữ dữ liệu 1 năm',
      'Tích hợp BHYT cơ bản'
    ],
    popular: false,
    color: 'text-blue-600'
  },
  {
    id: 'pro',
    name: 'Chuyên nghiệp',
    price: '799,000',
    period: '/tháng',
    description: 'Dành cho bệnh viện và phòng khám lớn',
    icon: Crown,
    features: [
      'Quản lý không giới hạn bệnh nhân',
      'Báo cáo nâng cao & phân tích',
      'Hỗ trợ 24/7',
      'Lưu trữ dữ liệu không giới hạn',
      'Tích hợp đầy đủ HL7/FHIR',
      'Quản lý nhiều cơ sở',
      'API tùy chỉnh',
      'Sao lưu tự động'
    ],
    popular: true,
    color: 'text-purple-600'
  },
  {
    id: 'enterprise',
    name: 'Doanh nghiệp',
    price: 'Liên hệ',
    period: '',
    description: 'Giải pháp tùy chỉnh cho tập đoàn y tế',
    icon: Building,
    features: [
      'Tất cả tính năng Pro',
      'Triển khai riêng (on-premise)',
      'Tùy chỉnh giao diện',
      'Đào tạo chuyên sâu',
      'Quản lý tài khoản chuyên biệt',
      'SLA 99.9%',
      'Tích hợp hệ thống legacy',
      'Bảo mật nâng cao'
    ],
    popular: false,
    color: 'text-green-600'
  }
];

const Subscription = () => {
  const { userPlan, unlockPlan, unlocking, hasAccess } = useSubscription();
  const { toast } = useToast();

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'enterprise') {
      toast({
        title: "Liên hệ bán hàng",
        description: "Vui lòng liên hệ đội ngũ bán hàng để được tư vấn gói Enterprise",
        variant: "default"
      });
      return;
    }

    try {
      await unlockPlan(planId);
    } catch (error) {
      console.error('Error selecting plan:', error);
    }
  };

  const getCurrentPlan = () => {
    if (!userPlan) return null;
    return userPlan.plan;
  };

  const isCurrentPlan = (planId: string) => {
    const currentPlan = getCurrentPlan();
    return currentPlan === planId && hasAccess([planId]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Chọn gói dịch vụ phù hợp
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nâng cấp hệ thống quản lý y tế của bạn với các tính năng chuyên nghiệp
          </p>
        </div>

        {/* Current Plan Status */}
        {userPlan && (
          <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Gói hiện tại</h3>
                <p className="text-muted-foreground">
                  {userPlan.plan === 'basic' && 'Gói Cơ bản'}
                  {userPlan.plan === 'pro' && 'Gói Chuyên nghiệp'}
                  {userPlan.plan === 'enterprise' && 'Gói Doanh nghiệp'}
                  {userPlan.status === 'active' ? ' - Đang hoạt động' : ` - ${userPlan.status}`}
                </p>
              </div>
              <Badge variant={userPlan.status === 'active' ? 'default' : 'secondary'}>
                {userPlan.status === 'active' ? 'Kích hoạt' : 'Không hoạt động'}
              </Badge>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {subscriptionPlans.map((plan) => {
            const Icon = plan.icon;
            const current = isCurrentPlan(plan.id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Phổ biến nhất</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <div className={`w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full ${plan.color} bg-primary/10`}>
                    <Icon className={`w-6 h-6 ${plan.color}`} />
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {plan.name}
                  </CardTitle>
                  
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={current ? "secondary" : (plan.popular ? "default" : "outline")}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={unlocking || current}
                  >
                    {current ? (
                      'Gói hiện tại'
                    ) : unlocking ? (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </div>
                    ) : plan.id === 'enterprise' ? (
                      'Liên hệ bán hàng'
                    ) : (
                      'Chọn gói này'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            So sánh tính năng
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="font-semibold text-foreground">Tính năng</div>
              <div className="font-semibold text-center text-foreground">Cơ bản</div>
              <div className="font-semibold text-center text-foreground">Chuyên nghiệp</div>
              <div className="font-semibold text-center text-foreground">Doanh nghiệp</div>
              
              <div className="text-muted-foreground">Số lượng bệnh nhân</div>
              <div className="text-center">100</div>
              <div className="text-center">Không giới hạn</div>
              <div className="text-center">Không giới hạn</div>
              
              <div className="text-muted-foreground">Báo cáo & phân tích</div>
              <div className="text-center">Cơ bản</div>
              <div className="text-center">Nâng cao</div>
              <div className="text-center">Tùy chỉnh</div>
              
              <div className="text-muted-foreground">Hỗ trợ</div>
              <div className="text-center">Email</div>
              <div className="text-center">24/7</div>
              <div className="text-center">Chuyên biệt</div>
              
              <div className="text-muted-foreground">API tích hợp</div>
              <div className="text-center">-</div>
              <div className="text-center">✓</div>
              <div className="text-center">✓</div>
              
              <div className="text-muted-foreground">Triển khai riêng</div>
              <div className="text-center">-</div>
              <div className="text-center">-</div>
              <div className="text-center">✓</div>
            </div>
          </div>
        </div>

        {/* Contact Sales Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Còn thắc mắc?
            </h2>
            <p className="text-muted-foreground">
              Liên hệ với đội ngũ bán hàng để được tư vấn chi tiết
            </p>
          </div>
          
          <div className="max-w-md mx-auto">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Building className="w-8 h-8 text-primary" />
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Liên hệ bán hàng</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nhận tư vấn miễn phí và báo giá tốt nhất cho doanh nghiệp của bạn
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => window.location.href = 'mailto:hoc.qk2@gmail.com'}
                  >
                    Email: hoc.qk2@gmail.com
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open('https://www.facebook.com/thorangsun3112/', '_blank')}
                  >
                    Facebook hỗ trợ
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Phản hồi trong vòng 24 giờ
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;