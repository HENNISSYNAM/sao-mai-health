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
  Activity
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
  priority: 'high' | 'medium' | 'low';
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
  const isHighRisk = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
  const isSenior = ageGroup === '>55';
  const isYoung = ageGroup === '<18';

  // Hydration recommendations
  if (factors.temperature > 30 || factors.humidity < 40) {
    recommendations.push({
      icon: <Droplets className="h-5 w-5" />,
      title: 'Bổ sung nước',
      description: isSenior 
        ? 'Uống ít nhất 2-2.5L nước/ngày. Chia nhỏ nhiều lần, không đợi khát mới uống.'
        : 'Uống đủ 2L nước mỗi ngày. Bổ sung nước thường xuyên.',
      priority: isHighRisk ? 'high' : 'medium'
    });
  }

  // Outdoor activity recommendations
  if (factors.aqi > 100) {
    recommendations.push({
      icon: <Sun className="h-5 w-5" />,
      title: 'Hạn chế ra ngoài',
      description: factors.aqi > 150
        ? 'Chất lượng không khí kém. Tránh hoạt động ngoài trời, đặc biệt từ 10h-16h.'
        : 'Hạn chế hoạt động mạnh ngoài trời. Đeo khẩu trang khi cần thiết.',
      priority: factors.aqi > 150 ? 'high' : 'medium'
    });
  }

  // Rest recommendations
  if (isHighRisk) {
    recommendations.push({
      icon: <Moon className="h-5 w-5" />,
      title: 'Nghỉ ngơi đầy đủ',
      description: isSenior
        ? 'Nghỉ trưa 30-45 phút. Đảm bảo ngủ đủ 7-8 tiếng mỗi đêm. Tránh thức khuya.'
        : 'Ngủ đủ giấc và nghỉ ngơi khi cảm thấy mệt. Tránh căng thẳng kéo dài.',
      priority: 'high'
    });
  }

  // Blood pressure monitoring
  if (isSenior || isHighRisk) {
    recommendations.push({
      icon: <Activity className="h-5 w-5" />,
      title: 'Theo dõi huyết áp',
      description: 'Đo huyết áp 2 lần/ngày (sáng và tối). Ghi nhận nếu có triệu chứng bất thường.',
      priority: isHighRisk ? 'high' : 'medium'
    });
  }

  // Pressure change warning
  if (factors.pressureChange && Math.abs(factors.pressureChange) > 5) {
    recommendations.push({
      icon: <AlertTriangle className="h-5 w-5" />,
      title: 'Cảnh báo thay đổi thời tiết',
      description: 'Áp suất khí quyển thay đổi đột ngột. Hạn chế di chuyển xa và hoạt động gắng sức.',
      priority: 'high'
    });
  }

  // Heart health for seniors
  if (isSenior) {
    recommendations.push({
      icon: <Heart className="h-5 w-5" />,
      title: 'Chú ý dấu hiệu cảnh báo',
      description: 'Đau đầu dữ dội, tê yếu một bên cơ thể, khó nói → Gọi cấp cứu 115 ngay.',
      priority: 'high'
    });
  }

  // General lifestyle for low risk
  if (!isHighRisk && !isSenior) {
    recommendations.push({
      icon: <CheckCircle className="h-5 w-5" />,
      title: 'Duy trì lối sống lành mạnh',
      description: 'Tập thể dục đều đặn, ăn uống cân bằng, kiểm tra sức khỏe định kỳ.',
      priority: 'low'
    });
  }

  return recommendations;
};

const HealthRecommendations: React.FC<HealthRecommendationsProps> = ({
  riskLevel,
  riskScore,
  ageGroup,
  environmentalFactors
}) => {
  const recommendations = generateRecommendations(riskLevel, ageGroup, environmentalFactors);
  
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
  const otherRecs = recommendations.filter(r => r.priority !== 'high');

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Khuyến nghị sức khỏe
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {getAgeGroupLabel(ageGroup)}
            </Badge>
            <Badge 
              variant={riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? 'destructive' : 'secondary'}
            >
              {riskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* High priority alerts */}
        {highPriorityRecs.length > 0 && (
          <div className="space-y-2">
            {highPriorityRecs.map((rec, idx) => (
              <Alert 
                key={idx} 
                className={cn(
                  "border-l-4",
                  rec.title.includes('cảnh báo') || rec.title.includes('Cảnh báo')
                    ? "border-l-danger bg-danger/5"
                    : "border-l-warning bg-warning/5"
                )}
              >
                <div className="text-warning">{rec.icon}</div>
                <AlertTitle className="text-sm font-medium">{rec.title}</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  {rec.description}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Other recommendations */}
        <div className="grid gap-3">
          {otherRecs.map((rec, idx) => (
            <div 
              key={idx}
              className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                rec.priority === 'medium' ? "bg-info/10 text-info" : "bg-success/10 text-success"
              )}>
                {rec.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium">{rec.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground/70 pt-2 border-t border-border/30">
          ⓘ Đây là khuyến nghị phòng ngừa dựa trên dữ liệu môi trường, không thay thế tư vấn y khoa. 
          Nếu có triệu chứng bất thường, hãy liên hệ bác sĩ hoặc cơ sở y tế gần nhất.
        </p>
      </CardContent>
    </Card>
  );
};

export default HealthRecommendations;
