import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Wind,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Sparkles,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Bell,
  BellOff,
  MapPin,
  UserCheck
} from 'lucide-react';
import type { RiskAssessment, EnvironmentData, AgeGroup } from '@/hooks/useStrokeRiskEngine';
import SubscriberRegistrationModal from './SubscriberRegistrationModal';

interface RiskOverlayProps {
  riskAssessment: RiskAssessment;
  environment: EnvironmentData;
  pressureChange1h: number | null;
  pressureChange24h?: number | null;
  isVisible: boolean;
  ageGroup?: AgeGroup;
  gps?: { lat: number; lon: number } | null;
  devicePressure?: number | null;
  gpsAccuracy?: number | null;
}

interface AIRecommendations {
  summary?: string;
  warnings?: string[];
  recommendations?: {
    do: string[];
    avoid: string[];
  };
  healthTip?: string;
  urgency?: 'low' | 'medium' | 'high';
  text?: string;
}

// Request notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send push notification
const sendNotification = (title: string, body: string, urgency: 'low' | 'medium' | 'high' = 'medium') => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'stroke-risk-alert',
      requireInteraction: urgency === 'high'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

const RiskOverlay: React.FC<RiskOverlayProps> = ({
  riskAssessment,
  environment,
  pressureChange1h,
  pressureChange24h,
  isVisible,
  ageGroup = '36-55',
  gps,
  devicePressure,
  gpsAccuracy
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [subscriberPhone, setSubscriberPhone] = useState<string | null>(null);
  const lastNotifiedLevel = useRef<string | null>(null);
  const lastNotifiedPressureDrop = useRef<boolean>(false);
  const lastAICallRef = useRef<number>(0);
  const aiCooldownRef = useRef<number>(0);

  const { risk_score, risk_level, primary_factors, recommendations } = riskAssessment;

  // Minimum 60 seconds between AI calls
  const MIN_AI_INTERVAL = 60000;
  // Cooldown after 429 error (2 minutes)
  const ERROR_COOLDOWN = 120000;

  // Check notification permission and subscriber status on mount
  useEffect(() => {
    // Check if user is already subscribed - try user-namespaced key first, then fallback
    const userId = localStorage.getItem('supabase_user_id');
    const prefix = userId ? `${userId}:` : '';
    const savedPhone = localStorage.getItem(`${prefix}stroke_subscriber_phone`) || localStorage.getItem('stroke_subscriber_phone');
    if (savedPhone) {
      setSubscriberPhone(savedPhone);
      setNotificationsEnabled(true);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Auto-notify when risk level changes to HIGH or pressure drops significantly
  useEffect(() => {
    if (!notificationsEnabled) return;

    // Notify on HIGH risk level
    if (risk_level === 'HIGH' && lastNotifiedLevel.current !== 'HIGH') {
      sendNotification(
        '⚠️ Cảnh báo nguy cơ đột quỵ CAO!',
        `Điểm nguy cơ: ${risk_score}/100. ${primary_factors[0] || 'Điều kiện thời tiết bất lợi'}. Hãy cẩn thận!`,
        'high'
      );
      lastNotifiedLevel.current = 'HIGH';
    } else if (risk_level === 'MEDIUM' && lastNotifiedLevel.current !== 'MEDIUM' && lastNotifiedLevel.current === 'LOW') {
      sendNotification(
        '⚡ Nguy cơ đột quỵ tăng',
        `Điểm nguy cơ: ${risk_score}/100. Hãy theo dõi sức khỏe.`,
        'medium'
      );
      lastNotifiedLevel.current = 'MEDIUM';
    } else if (risk_level === 'LOW') {
      lastNotifiedLevel.current = 'LOW';
    }

    // Notify on rapid pressure drop (> 5 hPa in 1 hour)
    if (pressureChange1h && pressureChange1h < -5 && !lastNotifiedPressureDrop.current) {
      sendNotification(
        '📉 Áp suất giảm nhanh!',
        `Áp suất giảm ${Math.abs(pressureChange1h).toFixed(1)} hPa trong 1 giờ qua. Có thể gây đau đầu, mệt mỏi.`,
        'medium'
      );
      lastNotifiedPressureDrop.current = true;
    } else if (pressureChange1h && pressureChange1h >= -3) {
      lastNotifiedPressureDrop.current = false;
    }
  }, [risk_level, risk_score, pressureChange1h, primary_factors, notificationsEnabled]);

  // Toggle notifications - show registration modal if not subscribed
  const toggleNotifications = async () => {
    if (notificationsEnabled && subscriberPhone) {
      // Already subscribed - disable notifications
      setNotificationsEnabled(false);
      const userId = localStorage.getItem('supabase_user_id');
      const prefix = userId ? `${userId}:` : '';
      localStorage.removeItem(`${prefix}stroke_subscriber_phone`);
      localStorage.removeItem(`${prefix}stroke_subscriber_id`);
      // Also clean up old non-namespaced keys
      localStorage.removeItem('stroke_subscriber_phone');
      localStorage.removeItem('stroke_subscriber_id');
      setSubscriberPhone(null);
      toast.info('Đã tắt thông báo tự động');
    } else {
      // Show registration modal for new subscribers
      setShowRegistrationModal(true);
    }
  };

  // Handle successful registration
  const handleRegistrationSuccess = async (subscriberId: string, phone: string) => {
    setSubscriberPhone(phone);
    setNotificationsEnabled(true);
    
    // Also request browser notification permission
    await requestNotificationPermission();
    
    toast.success(`Đã đăng ký thành công với SĐT: ${phone}`);
  };

  // Fetch AI recommendations with throttling
  const fetchAIRecommendations = useCallback(async () => {
    if (!gps) return;
    
    const now = Date.now();
    
    // Check if we're in cooldown after 429 error
    if (aiCooldownRef.current > now) {
      const remainingSeconds = Math.ceil((aiCooldownRef.current - now) / 1000);
      toast.info(`Vui lòng đợi ${remainingSeconds}s trước khi thử lại`);
      return;
    }
    
    // Check minimum interval between calls
    if (now - lastAICallRef.current < MIN_AI_INTERVAL) {
      const remainingSeconds = Math.ceil((MIN_AI_INTERVAL - (now - lastAICallRef.current)) / 1000);
      toast.info(`AI tư vấn đã được cập nhật gần đây. Thử lại sau ${remainingSeconds}s`);
      return;
    }
    
    setIsLoadingAI(true);
    setAiError(null);
    lastAICallRef.current = now;
    
    try {
      const { data, error } = await supabase.functions.invoke('stroke-health-ai', {
        body: {
          context: {
            temperature: environment.temperature,
            humidity: environment.humidity,
            pressure: environment.pressure,
            pressureChange1h,
            pressureChange24h,
            aqi: environment.aqi,
            pm25: environment.pm25,
            uvIndex: environment.uvIndex,
            ageGroup,
            riskScore: risk_score,
            riskLevel: risk_level,
            primaryFactors: primary_factors,
            lat: gps.lat,
            lon: gps.lon,
            devicePressure
          },
          type: 'recommendations'
        }
      });

      if (error) {
        // Check if it's a 429 error
        if (error.message?.includes('429') || error.message?.includes('Quá nhiều')) {
          aiCooldownRef.current = Date.now() + ERROR_COOLDOWN;
          setAiError('Đang quá tải. Vui lòng thử lại sau 2 phút.');
          toast.warning('AI đang bận, vui lòng thử lại sau 2 phút');
          return;
        }
        throw error;
      }
      
      // Check if response contains error
      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Quá nhiều')) {
          aiCooldownRef.current = Date.now() + ERROR_COOLDOWN;
          setAiError('Đang quá tải. Vui lòng thử lại sau 2 phút.');
          toast.warning('AI đang bận, vui lòng thử lại sau 2 phút');
          return;
        }
        // Use fallback if available
        if (data.fallback) {
          setAiRecommendations(data.fallback);
          return;
        }
      }
      
      setAiRecommendations(data);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Use fallback recommendations on error
      setAiRecommendations({
        summary: "Theo dõi sức khỏe định kỳ",
        warnings: [],
        recommendations: {
          do: ["Uống đủ nước", "Nghỉ ngơi điều độ", "Tập thể dục nhẹ"],
          avoid: ["Hoạt động ngoài trời khi AQI cao", "Căng thẳng kéo dài"]
        },
        healthTip: "Hãy lắng nghe cơ thể và nghỉ ngơi khi cần thiết",
        urgency: "low"
      });
      setAiError(null); // Don't show error since we have fallback
    } finally {
      setIsLoadingAI(false);
    }
  }, [environment, pressureChange1h, pressureChange24h, ageGroup, risk_score, risk_level, primary_factors, gps, devicePressure]);

  // Fetch AI recommendations when expanded (only once)
  useEffect(() => {
    if (isExpanded && gps && !aiRecommendations && !isLoadingAI) {
      // Check if we can make the call
      const now = Date.now();
      if (now - lastAICallRef.current >= MIN_AI_INTERVAL && aiCooldownRef.current <= now) {
        fetchAIRecommendations();
      } else if (!aiRecommendations) {
        // If we can't call AI, use default recommendations
        setAiRecommendations({
          summary: "Duy trì lối sống lành mạnh",
          warnings: [],
          recommendations: {
            do: ["Uống đủ nước", "Nghỉ ngơi hợp lý", "Theo dõi các chỉ số môi trường"],
            avoid: ["Ra ngoài khi AQI cao", "Hoạt động gắng sức khi thời tiết cực đoan"]
          },
          healthTip: "Lắng nghe cơ thể bạn và nghỉ ngơi khi cần",
          urgency: "low"
        });
      }
    }
  }, [isExpanded, gps, aiRecommendations, isLoadingAI, fetchAIRecommendations]);

  // Get pressure trend info
  const getPressureTrend = () => {
    if (!pressureChange1h) return null;
    if (pressureChange1h < -5) return { icon: TrendingDown, label: 'Giảm nhanh', color: 'text-red-500', warning: true };
    if (pressureChange1h < -2) return { icon: TrendingDown, label: 'Giảm', color: 'text-amber-500', warning: false };
    if (pressureChange1h > 5) return { icon: TrendingUp, label: 'Tăng nhanh', color: 'text-blue-500', warning: false };
    if (pressureChange1h > 2) return { icon: TrendingUp, label: 'Tăng', color: 'text-emerald-500', warning: false };
    return { icon: Gauge, label: 'Ổn định', color: 'text-muted-foreground', warning: false };
  };

  const pressureTrend = getPressureTrend();

  if (!isVisible) return null;

  const getRiskStyles = () => {
    switch (risk_level) {
      case 'HIGH':
        return {
          bg: 'bg-red-500',
          bgLight: 'bg-red-500/20',
          border: 'border-red-500/50',
          icon: ShieldAlert,
          label: 'Cao',
          color: 'text-red-500',
          pulse: 'animate-pulse'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500',
          bgLight: 'bg-amber-500/20',
          border: 'border-amber-500/50',
          icon: AlertTriangle,
          label: 'TB',
          color: 'text-amber-500',
          pulse: ''
        };
      default:
        return {
          bg: 'bg-emerald-500',
          bgLight: 'bg-emerald-500/20',
          border: 'border-emerald-500/50',
          icon: ShieldCheck,
          label: 'Thấp',
          color: 'text-emerald-500',
          pulse: ''
        };
    }
  };

  const styles = getRiskStyles();
  const Icon = styles.icon;
  const displayRecommendations = aiRecommendations?.recommendations || recommendations;
  const displayWarnings = aiRecommendations?.warnings || [];

  return (
    <>
      {/* Always show floating badge with risk score - bottom right */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95",
            styles.bg,
            risk_level === 'HIGH' && styles.pulse
          )}
        >
          <Icon className="h-5 w-5 text-white" />
          <span className="text-white font-bold text-lg">{risk_score}</span>
          <ChevronUp className="h-4 w-4 text-white/70" />
        </button>
      )}

      {/* Expanded Panel - Bottom right */}
      {isExpanded && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {/* Header - Collapsible */}
            <button
              onClick={() => setIsExpanded(false)}
              className={cn("w-full px-4 py-3 flex items-center justify-between", styles.bg)}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-white" />
                <span className="text-white font-semibold text-sm">Cảnh báo sức khỏe</span>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>

            {/* Primary Factors */}
            {primary_factors.length > 0 && primary_factors[0] !== 'Điều kiện bình thường' && (
              <div className="px-4 py-2 border-b border-border/30">
                <div className="flex flex-wrap gap-1">
                  {primary_factors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-border/50 bg-muted/30">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Barometer Data - From device sensor */}
            {(devicePressure || pressureTrend) && (
              <div className="px-4 py-2 bg-blue-500/10 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">Áp suất</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {devicePressure && (
                      <span className="text-[11px] font-medium text-foreground">{devicePressure.toFixed(0)} hPa</span>
                    )}
                    {pressureTrend && (
                      <div className={cn("flex items-center gap-0.5", pressureTrend.color)}>
                        <pressureTrend.icon className="h-3 w-3" />
                        <span className="text-[9px]">{pressureTrend.label}</span>
                      </div>
                    )}
                  </div>
                </div>
                {pressureChange1h && Math.abs(pressureChange1h) > 2 && (
                  <div className={cn(
                    "text-[9px] mt-1",
                    pressureChange1h < -5 ? "text-red-400" : "text-amber-400"
                  )}>
                    {pressureChange1h < 0 ? '↓' : '↑'} {Math.abs(pressureChange1h).toFixed(1)} hPa/giờ
                  </div>
                )}
              </div>
            )}

            {/* GPS Accuracy Indicator */}
            {gpsAccuracy !== null && gpsAccuracy !== undefined && (
              <div className="px-4 py-2 bg-purple-500/10 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] text-muted-foreground">Độ chính xác GPS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-medium",
                      gpsAccuracy < 20 ? "text-emerald-400" : 
                      gpsAccuracy < 50 ? "text-green-400" :
                      gpsAccuracy < 100 ? "text-amber-400" : "text-red-400"
                    )}>
                      ±{gpsAccuracy < 1000 ? gpsAccuracy.toFixed(0) : (gpsAccuracy / 1000).toFixed(1) + 'k'}m
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[8px] px-1.5 py-0",
                        gpsAccuracy < 20 ? "border-emerald-500/50 text-emerald-400" : 
                        gpsAccuracy < 50 ? "border-green-500/50 text-green-400" :
                        gpsAccuracy < 100 ? "border-amber-500/50 text-amber-400" : "border-red-500/50 text-red-400"
                      )}
                    >
                      {gpsAccuracy < 20 ? 'Tuyệt vời' : 
                       gpsAccuracy < 50 ? 'Tốt' :
                       gpsAccuracy < 100 ? 'Trung bình' : 'Kém'}
                    </Badge>
                  </div>
                </div>
                {gpsAccuracy > 100 && (
                  <div className="text-[9px] text-amber-400 mt-1">
                    💡 Ra ngoài trời sẽ cải thiện độ chính xác
                  </div>
                )}
              </div>
            )}
            {displayWarnings.length > 0 && (
              <div className="px-4 py-2 bg-red-500/10 border-b border-border/30">
                {displayWarnings.slice(0, 3).map((warning, i) => (
                  <div key={i} className="text-[11px] text-red-400 flex items-start gap-1.5 py-0.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations - Compact */}
            <div className="px-4 py-2 border-b border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-500">NÊN LÀM</span>
                  </div>
                  <ul className="space-y-0.5">
                    {displayRecommendations.do.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] font-semibold text-red-500">TRÁNH</span>
                  </div>
                  <ul className="space-y-0.5">
                    {displayRecommendations.avoid.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Health Tip */}
            {aiRecommendations?.healthTip && (
              <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{aiRecommendations.healthTip}</p>
                </div>
              </div>
            )}

            {/* AI Error Message */}
            {aiError && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-border/30">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-600">{aiError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 py-2 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "flex-1 text-[10px] h-7",
                  aiError && "border-amber-500/30"
                )}
                onClick={fetchAIRecommendations}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                {aiError ? 'Thử lại' : (aiRecommendations ? 'Làm mới' : 'AI Tư vấn')}
              </Button>
              {/* Notification toggle */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 px-2", 
                  notificationsEnabled && subscriberPhone && "bg-emerald-500/20 border-emerald-500/30",
                  notificationsEnabled && !subscriberPhone && "bg-primary/10 border-primary/30"
                )}
                onClick={toggleNotifications}
                title={notificationsEnabled ? (subscriberPhone ? `Đã đăng ký: ${subscriberPhone}` : "Tắt thông báo") : "Đăng ký nhận cảnh báo"}
              >
                {notificationsEnabled ? (
                  subscriberPhone ? (
                    <UserCheck className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Bell className="h-3 w-3 text-primary" />
                  )
                ) : (
                  <BellOff className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
              {/* Direct call 115 */}
              <a 
                href="tel:115"
                className="flex-1 inline-flex items-center justify-center text-[10px] h-7 px-3 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Phone className="h-3 w-3 mr-1" />
                Gọi 115
              </a>
            </div>

            {/* Footer note */}
            <div className="px-4 py-1.5 bg-muted/30">
              <p className="text-[9px] text-muted-foreground text-center">
                ⚠️ Cảnh báo sớm, không phải chẩn đoán y tế
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscriber Registration Modal */}
      <SubscriberRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={handleRegistrationSuccess}
        gps={gps}
        barometerData={{
          pressure: devicePressure || null,
          change1h: pressureChange1h,
          change24h: pressureChange24h || null
        }}
      />
    </>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(RiskOverlay, (prevProps, nextProps) => {
  // Only re-render when significant props change
  const visChanged = prevProps.isVisible !== nextProps.isVisible;
  const riskChanged = prevProps.riskAssessment.risk_level !== nextProps.riskAssessment.risk_level ||
                      prevProps.riskAssessment.risk_score !== nextProps.riskAssessment.risk_score;
  const envChanged = prevProps.environment.aqi !== nextProps.environment.aqi ||
                     prevProps.environment.pm25 !== nextProps.environment.pm25;
  const pressureChanged = prevProps.pressureChange1h !== nextProps.pressureChange1h;
  
  return !visChanged && !riskChanged && !envChanged && !pressureChanged;
});
