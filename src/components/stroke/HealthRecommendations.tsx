import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Droplets, 
  Sun, 
  Moon, 
  Heart, 
  AlertTriangle,
  CheckCircle,
  User,
  Activity,
  Phone,
  Shield,
  Clock,
  Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthRecommendationsProps {
  riskLevel: string;
  riskScore: number;
  ageGroup: '<18' | '18-35' | '36-55' | '>55';
  environmentalFactors: {
    aqi: number;
    temperature: number;
    humidity: number;
    pressureChange?: number;
  };
}

interface Recommendation {
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const getAgeGroupLabel = (ageGroup: string) => {
  switch (ageGroup) {
    case '<18': return 'Dưới 18 tuổi';
    case '18-35': return '18-35 tuổi';
    case '36-55': return '36-55 tuổi';
    case '>55': return 'Trên 55 tuổi';
    default: return ageGroup;
  }
};

const generateRecommendations = (
  riskLevel: string,
  ageGroup: string,
  factors: HealthRecommendationsProps['environmentalFactors']
): Recommendation[] => {
  const recommendations: Recommendation[] = [];
  const isCritical = riskLevel === 'CRITICAL';
  const isHighRisk = riskLevel === 'HIGH' || isCritical;
  const isSenior = ageGroup === '>55';
  const isMiddleAge = ageGroup === '36-55';

  // Critical pressure change warning
  if (factors.pressureChange && Math.abs(factors.pressureChange) > 5) {
    recommendations.push({
      icon: <AlertTriangle className="h-5 w-5" />,
      title: 'CẢNH BÁO: Áp suất thay đổi đột ngột',
      description: 'Áp suất khí quyển biến động mạnh. Người cao tuổi và người có bệnh nền tim mạch cần theo dõi sức khỏe. Hạn chế di chuyển xa.',
      priority: 'critical'
    });
  }

  // Heart health for seniors in high risk
  if ((isSenior || isMiddleAge) && isHighRisk) {
    recommendations.push({
      icon: <Phone className="h-5 w-5" />,
      title: 'Nhận biết dấu hiệu đột quỵ - FAST',
      description: 'F: Mặt méo. A: Tay yếu. S: Nói khó. T: Thời gian = Gọi 115 ngay. Không chần chừ nếu có triệu chứng.',
      priority: 'critical'
    });
  }

  // Hydration recommendations
  if (factors.temperature > 30 || factors.humidity < 40) {
    recommendations.push({
      icon: <Droplets className="h-5 w-5" />,
      title: 'Bổ sung nước thường xuyên',
      description: isSenior 
        ? 'Uống ít nhất 2-2.5L nước/ngày. Chia nhỏ nhiều lần (mỗi 30 phút 1 lần), không đợi khát mới uống.'
        : 'Uống đủ 2L nước mỗi ngày. Bổ sung nước điện giải nếu hoạt động ngoài trời.',
      priority: isHighRisk ? 'high' : 'medium'
    });
  }

  // Outdoor activity based on AQI
  if (factors.aqi > 100) {
    recommendations.push({
      icon: <Wind className="h-5 w-5" />,
      title: factors.aqi > 150 ? 'Hạn chế tối đa ra ngoài' : 'Hạn chế hoạt động ngoài trời',
      description: factors.aqi > 150
        ? 'Chất lượng không khí rất kém. Ở trong nhà, đóng cửa sổ, sử dụng máy lọc không khí nếu có.'
        : 'Hạn chế hoạt động mạnh ngoài trời, đặc biệt từ 10h-16h. Đeo khẩu trang N95 khi ra ngoài.',
      priority: factors.aqi > 150 ? 'high' : 'medium'
    });
  }

  // Heat warning
  if (factors.temperature > 35) {
    recommendations.push({
      icon: <Sun className="h-5 w-5" />,
      title: 'Cảnh báo nắng nóng',
      description: 'Nhiệt độ cao. Tránh ra ngoài 10h-16h. Mặc quần áo thoáng mát, đội mũ, che ô. Nghỉ ngơi nơi mát mẻ.',
      priority: 'high'
    });
  }

  // Rest recommendations
  if (isHighRisk) {
    recommendations.push({
      icon: <Moon className="h-5 w-5" />,
      title: 'Nghỉ ngơi và kiểm soát stress',
      description: isSenior
        ? 'Nghỉ trưa 30-45 phút. Đảm bảo ngủ đủ 7-8 tiếng mỗi đêm. Tránh xem tin tức gây căng thẳng.'
        : 'Ngủ đủ giấc, tránh thức khuya. Tập thể dục nhẹ nhàng như đi bộ, yoga.',
      priority: isCritical ? 'high' : 'medium'
    });
  }

  // Blood pressure monitoring
  if (isSenior || isMiddleAge || isHighRisk) {
    recommendations.push({
      icon: <Activity className="h-5 w-5" />,
      title: 'Theo dõi huyết áp',
      description: 'Đo huyết áp 2 lần/ngày (sáng khi thức dậy và tối trước khi ngủ). Ghi chép lại nếu có bất thường.',
      priority: isHighRisk ? 'high' : 'medium'
    });
  }

  // Medication reminder for seniors
  if (isSenior && isHighRisk) {
    recommendations.push({
      icon: <Clock className="h-5 w-5" />,
      title: 'Dùng thuốc đúng giờ',
      description: 'Tuân thủ nghiêm ngặt phác đồ điều trị. Không tự ý ngừng thuốc. Mang theo thuốc khi ra ngoài.',
      priority: 'high'
    });
  }

  // General lifestyle for low risk
  if (!isHighRisk) {
    recommendations.push({
      icon: <Shield className="h-5 w-5" />,
      title: 'Duy trì lối sống lành mạnh',
      description: 'Tập thể dục đều đặn 30 phút/ngày. Ăn nhiều rau xanh, hạn chế muối và chất béo. Kiểm tra sức khỏe định kỳ.',
      priority: 'low'
    });
  }

  // Good conditions
  if (riskLevel === 'LOW' && factors.aqi <= 50 && factors.temperature <= 30) {
    recommendations.push({
      icon: <CheckCircle className="h-5 w-5" />,
      title: 'Điều kiện thời tiết tốt',
      description: 'Thời tiết thuận lợi cho hoạt động ngoài trời. Đây là thời điểm tốt để tập thể dục, đi dạo.',
      priority: 'low'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

const HealthRecommendations: React.FC<HealthRecommendationsProps> = ({
  riskLevel,
  riskScore,
  ageGroup,
  environmentalFactors
}) => {
  const recommendations = generateRecommendations(riskLevel, ageGroup, environmentalFactors);
  
  const criticalRecs = recommendations.filter(r => r.priority === 'critical');
  const highRecs = recommendations.filter(r => r.priority === 'high');
  const otherRecs = recommendations.filter(r => r.priority === 'medium' || r.priority === 'low');

  const getRiskBadgeColor = () => {
    switch (riskLevel) {
      case 'CRITICAL': return 'bg-danger text-danger-foreground';
      case 'HIGH': return 'bg-secondary text-secondary-foreground';
      case 'MEDIUM': return 'bg-warning text-warning-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-2 border-border overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            Khuyến nghị sức khỏe
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <User className="h-3 w-3" />
              {getAgeGroupLabel(ageGroup)}
            </Badge>
            <Badge className={cn("text-xs font-bold", getRiskBadgeColor())}>
              {riskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Critical alerts */}
        {criticalRecs.length > 0 && (
          <div className="space-y-2">
            {criticalRecs.map((rec, idx) => (
              <Alert 
                key={idx} 
                className="border-2 border-danger bg-danger/10 animate-pulse-glow"
              >
                <div className="text-danger">{rec.icon}</div>
                <AlertTitle className="text-sm font-bold text-danger">{rec.title}</AlertTitle>
                <AlertDescription className="text-xs text-danger/80">
                  {rec.description}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* High priority alerts */}
        {highRecs.length > 0 && (
          <div className="space-y-2">
            {highRecs.map((rec, idx) => (
              <Alert 
                key={idx} 
                className="border-l-4 border-l-warning bg-warning/5 border-warning/30"
              >
                <div className="text-warning">{rec.icon}</div>
                <AlertTitle className="text-sm font-semibold">{rec.title}</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  {rec.description}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Other recommendations */}
        {otherRecs.length > 0 && (
          <div className="grid gap-3">
            {otherRecs.map((rec, idx) => (
              <div 
                key={idx}
                className="flex gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0",
                  rec.priority === 'medium' ? "bg-info/10 text-info" : "bg-success/10 text-success"
                )}>
                  {rec.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{rec.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground/70 flex items-start gap-1.5">
            <Shield className="h-3 w-3 mt-0.5 shrink-0" />
            Đây là khuyến nghị phòng ngừa dựa trên dữ liệu môi trường và AI, không thay thế tư vấn y khoa. 
            Nếu có triệu chứng bất thường, hãy gọi 115 hoặc đến cơ sở y tế gần nhất.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthRecommendations;
