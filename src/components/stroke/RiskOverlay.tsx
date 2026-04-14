import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Wind, Gauge, ShieldCheck, ShieldAlert, Phone, Sparkles,
  RefreshCw, ChevronUp, ChevronDown, Bell, BellOff, MapPin, UserCheck
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
  recommendations?: { do: string[]; avoid: string[] };
  healthTip?: string;
  urgency?: 'low' | 'medium' | 'high';
  text?: string;
}

const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

const sendNotification = (title: string, body: string, urgency: 'low' | 'medium' | 'high' = 'medium') => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body, icon: '/favicon.ico', tag: 'stroke-risk-alert',
      requireInteraction: urgency === 'high'
    });
    notification.onclick = () => { window.focus(); notification.close(); };
  }
};

const RiskOverlay: React.FC<RiskOverlayProps> = ({
  riskAssessment, environment, pressureChange1h, pressureChange24h,
  isVisible, ageGroup = '36-55', gps, devicePressure, gpsAccuracy
}) => {
  const { t } = useTranslation();
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
  const MIN_AI_INTERVAL = 60000;
  const ERROR_COOLDOWN = 120000;

  useEffect(() => {
    const userId = localStorage.getItem('supabase_user_id');
    const prefix = userId ? `${userId}:` : '';
    const savedPhone = localStorage.getItem(`${prefix}stroke_subscriber_phone`) || localStorage.getItem('stroke_subscriber_phone');
    if (savedPhone) { setSubscriberPhone(savedPhone); setNotificationsEnabled(true); }
    else if ('Notification' in window && Notification.permission === 'granted') { setNotificationsEnabled(true); }
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    if (risk_level === 'HIGH' && lastNotifiedLevel.current !== 'HIGH') {
      sendNotification(
        t('epiIntel.overlay.highRiskAlert'),
        t('epiIntel.overlay.riskScoreMsg', { score: risk_score, factor: primary_factors[0] || '' }),
        'high'
      );
      lastNotifiedLevel.current = 'HIGH';
    } else if (risk_level === 'MEDIUM' && lastNotifiedLevel.current !== 'MEDIUM' && lastNotifiedLevel.current === 'LOW') {
      sendNotification(
        t('epiIntel.overlay.riskIncreased'),
        t('epiIntel.overlay.riskScoreMonitor', { score: risk_score }),
        'medium'
      );
      lastNotifiedLevel.current = 'MEDIUM';
    } else if (risk_level === 'LOW') { lastNotifiedLevel.current = 'LOW'; }

    if (pressureChange1h && pressureChange1h < -5 && !lastNotifiedPressureDrop.current) {
      sendNotification(
        t('epiIntel.overlay.pressureDropAlert'),
        t('epiIntel.overlay.pressureDropMsg', { value: Math.abs(pressureChange1h).toFixed(1) }),
        'medium'
      );
      lastNotifiedPressureDrop.current = true;
    } else if (pressureChange1h && pressureChange1h >= -3) {
      lastNotifiedPressureDrop.current = false;
    }
  }, [risk_level, risk_score, pressureChange1h, primary_factors, notificationsEnabled, t]);

  const toggleNotifications = async () => {
    if (notificationsEnabled && subscriberPhone) {
      setNotificationsEnabled(false);
      const userId = localStorage.getItem('supabase_user_id');
      const prefix = userId ? `${userId}:` : '';
      localStorage.removeItem(`${prefix}stroke_subscriber_phone`);
      localStorage.removeItem(`${prefix}stroke_subscriber_id`);
      localStorage.removeItem('stroke_subscriber_phone');
      localStorage.removeItem('stroke_subscriber_id');
      setSubscriberPhone(null);
      toast.info(t('epiIntel.overlay.notifOff'));
    } else {
      setShowRegistrationModal(true);
    }
  };

  const handleRegistrationSuccess = async (subscriberId: string, phone: string) => {
    setSubscriberPhone(phone);
    setNotificationsEnabled(true);
    await requestNotificationPermission();
    toast.success(t('epiIntel.overlay.notifRegistered', { phone }));
  };

  const fetchAIRecommendations = useCallback(async () => {
    if (!gps) return;
    const now = Date.now();
    
    if (aiCooldownRef.current > now) {
      const remainingSeconds = Math.ceil((aiCooldownRef.current - now) / 1000);
      toast.info(t('epiIntel.overlay.cooldownMsg', { seconds: remainingSeconds }));
      return;
    }
    if (now - lastAICallRef.current < MIN_AI_INTERVAL) {
      const remainingSeconds = Math.ceil((MIN_AI_INTERVAL - (now - lastAICallRef.current)) / 1000);
      toast.info(t('epiIntel.overlay.aiRecentlyUpdated', { seconds: remainingSeconds }));
      return;
    }
    
    setIsLoadingAI(true);
    setAiError(null);
    lastAICallRef.current = now;
    
    try {
      const { data, error } = await supabase.functions.invoke('stroke-health-ai', {
        body: {
          context: {
            temperature: environment.temperature, humidity: environment.humidity,
            pressure: environment.pressure, pressureChange1h, pressureChange24h,
            aqi: environment.aqi, pm25: environment.pm25, uvIndex: environment.uvIndex,
            ageGroup, riskScore: risk_score, riskLevel: risk_level,
            primaryFactors: primary_factors, lat: gps.lat, lon: gps.lon, devicePressure
          },
          type: 'recommendations'
        }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Quá nhiều')) {
          aiCooldownRef.current = Date.now() + ERROR_COOLDOWN;
          setAiError(t('epiIntel.overlay.aiOverloaded'));
          toast.warning(t('epiIntel.overlay.aiBusy'));
          return;
        }
        throw error;
      }
      
      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Quá nhiều')) {
          aiCooldownRef.current = Date.now() + ERROR_COOLDOWN;
          setAiError(t('epiIntel.overlay.aiOverloaded'));
          toast.warning(t('epiIntel.overlay.aiBusy'));
          return;
        }
        if (data.fallback) { setAiRecommendations(data.fallback); return; }
      }
      
      setAiRecommendations(data);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      setAiRecommendations({
        summary: "Monitor health regularly",
        warnings: [],
        recommendations: {
          do: ["Stay hydrated", "Rest properly", "Light exercise"],
          avoid: ["Outdoor activity when AQI is high", "Prolonged stress"]
        },
        healthTip: "Listen to your body and rest when needed",
        urgency: "low"
      });
      setAiError(null);
    } finally { setIsLoadingAI(false); }
  }, [environment, pressureChange1h, pressureChange24h, ageGroup, risk_score, risk_level, primary_factors, gps, devicePressure, t]);

  useEffect(() => {
    if (isExpanded && gps && !aiRecommendations && !isLoadingAI) {
      const now = Date.now();
      if (now - lastAICallRef.current >= MIN_AI_INTERVAL && aiCooldownRef.current <= now) {
        fetchAIRecommendations();
      } else if (!aiRecommendations) {
        setAiRecommendations({
          summary: "Maintain healthy lifestyle",
          warnings: [],
          recommendations: {
            do: ["Stay hydrated", "Rest properly", "Monitor environmental indicators"],
            avoid: ["Go out when AQI is high", "Extreme physical activity in bad weather"]
          },
          healthTip: "Listen to your body and rest when needed",
          urgency: "low"
        });
      }
    }
  }, [isExpanded, gps, aiRecommendations, isLoadingAI, fetchAIRecommendations]);

  const getPressureTrend = () => {
    if (!pressureChange1h) return null;
    if (pressureChange1h < -5) return { icon: TrendingDown, label: t('epiIntel.pressure.droppingFast'), color: 'text-red-500', warning: true };
    if (pressureChange1h < -2) return { icon: TrendingDown, label: t('epiIntel.pressure.dropping'), color: 'text-amber-500', warning: false };
    if (pressureChange1h > 5) return { icon: TrendingUp, label: t('epiIntel.pressure.risingFast'), color: 'text-blue-500', warning: false };
    if (pressureChange1h > 2) return { icon: TrendingUp, label: t('epiIntel.pressure.rising'), color: 'text-emerald-500', warning: false };
    return { icon: Gauge, label: t('epiIntel.pressure.stable'), color: 'text-muted-foreground', warning: false };
  };

  const pressureTrend = getPressureTrend();

  if (!isVisible) return null;

  const getRiskStyles = () => {
    switch (risk_level) {
      case 'HIGH': return { bg: 'bg-red-500', bgLight: 'bg-red-500/20', border: 'border-red-500/50', icon: ShieldAlert, label: t('epiIntel.riskStatus.high'), color: 'text-red-500', pulse: 'animate-pulse' };
      case 'MEDIUM': return { bg: 'bg-amber-500', bgLight: 'bg-amber-500/20', border: 'border-amber-500/50', icon: AlertTriangle, label: t('epiIntel.riskStatus.medium'), color: 'text-amber-500', pulse: '' };
      default: return { bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: ShieldCheck, label: t('epiIntel.riskStatus.low'), color: 'text-emerald-500', pulse: '' };
    }
  };

  const styles = getRiskStyles();
  const Icon = styles.icon;
  const displayRecommendations = aiRecommendations?.recommendations || recommendations;
  const displayWarnings = aiRecommendations?.warnings || [];

  return (
    <>
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95",
            styles.bg, risk_level === 'HIGH' && styles.pulse
          )}
        >
          <Icon className="h-5 w-5 text-white" />
          <span className="text-white font-bold text-lg">{risk_score}</span>
          <ChevronUp className="h-4 w-4 text-white/70" />
        </button>
      )}

      {isExpanded && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
            <button onClick={() => setIsExpanded(false)} className={cn("w-full px-4 py-3 flex items-center justify-between", styles.bg)}>
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-white" />
                <span className="text-white font-semibold text-sm">{t('epiIntel.overlay.healthAlert')}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>

            {primary_factors.length > 0 && primary_factors[0] !== 'Điều kiện bình thường' && (
              <div className="px-4 py-2 border-b border-border/30">
                <div className="flex flex-wrap gap-1">
                  {primary_factors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-border/50 bg-muted/30">{factor}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(devicePressure || pressureTrend) && (
              <div className="px-4 py-2 bg-blue-500/10 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">{t('epiIntel.overlay.pressureLabel')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {devicePressure && <span className="text-[11px] font-medium text-foreground">{devicePressure.toFixed(0)} hPa</span>}
                    {pressureTrend && (
                      <div className={cn("flex items-center gap-0.5", pressureTrend.color)}>
                        <pressureTrend.icon className="h-3 w-3" />
                        <span className="text-[9px]">{pressureTrend.label}</span>
                      </div>
                    )}
                  </div>
                </div>
                {pressureChange1h && Math.abs(pressureChange1h) > 2 && (
                  <div className={cn("text-[9px] mt-1", pressureChange1h < -5 ? "text-red-400" : "text-amber-400")}>
                    {pressureChange1h < 0 ? '↓' : '↑'} {Math.abs(pressureChange1h).toFixed(1)} hPa/h
                  </div>
                )}
              </div>
            )}

            {gpsAccuracy !== null && gpsAccuracy !== undefined && (
              <div className="px-4 py-2 bg-purple-500/10 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] text-muted-foreground">{t('epiIntel.map.gpsAccuracy')}</span>
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
                      {gpsAccuracy < 20 ? t('epiIntel.map.gpsExcellent') : 
                       gpsAccuracy < 50 ? t('epiIntel.map.gpsGood') :
                       gpsAccuracy < 100 ? t('epiIntel.map.gpsModerate') : t('epiIntel.map.gpsPoor')}
                    </Badge>
                  </div>
                </div>
                {gpsAccuracy > 100 && (
                  <div className="text-[9px] text-amber-400 mt-1">{t('epiIntel.map.improveGps')}</div>
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

            <div className="px-4 py-2 border-b border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-500">{t('epiIntel.overlay.shouldDo')}</span>
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
                    <span className="text-[10px] font-semibold text-red-500">{t('epiIntel.overlay.avoid')}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {displayRecommendations.avoid.slice(0, 2).map((item, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {aiRecommendations?.healthTip && (
              <div className="px-4 py-2 bg-primary/5 border-b border-border/30">
                <div className="flex items-start gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{aiRecommendations.healthTip}</p>
                </div>
              </div>
            )}

            {aiError && (
              <div className="px-4 py-2 bg-amber-500/10 border-b border-border/30">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-600">{aiError}</p>
                </div>
              </div>
            )}

            <div className="px-4 py-2 flex gap-2">
              <Button variant="outline" size="sm" className={cn("flex-1 text-[10px] h-7", aiError && "border-amber-500/30")}
                onClick={fetchAIRecommendations} disabled={isLoadingAI}
              >
                {isLoadingAI ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                {aiError ? t('epiIntel.overlay.retry') : (aiRecommendations ? t('epiIntel.overlay.refresh') : t('epiIntel.overlay.aiAdvice'))}
              </Button>
              <Button variant="outline" size="sm"
                className={cn("h-7 px-2", 
                  notificationsEnabled && subscriberPhone && "bg-emerald-500/20 border-emerald-500/30",
                  notificationsEnabled && !subscriberPhone && "bg-primary/10 border-primary/30"
                )}
                onClick={toggleNotifications}
                title={notificationsEnabled ? (subscriberPhone ? `${subscriberPhone}` : "") : t('epiIntel.overlay.registerAlerts')}
              >
                {notificationsEnabled ? (
                  subscriberPhone ? <UserCheck className="h-3 w-3 text-emerald-400" /> : <Bell className="h-3 w-3 text-primary" />
                ) : (
                  <BellOff className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
              <a href="tel:115" className="flex-1 inline-flex items-center justify-center text-[10px] h-7 px-3 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors">
                <Phone className="h-3 w-3 mr-1" />
                {t('epiIntel.overlay.call115')}
              </a>
            </div>

            <div className="px-4 py-1.5 bg-muted/30">
              <p className="text-[9px] text-muted-foreground text-center">{t('epiIntel.overlay.disclaimer')}</p>
            </div>
          </div>
        </div>
      )}

      <SubscriberRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={handleRegistrationSuccess}
        gps={gps}
        barometerData={{ pressure: devicePressure || null, change1h: pressureChange1h, change24h: pressureChange24h || null }}
      />
    </>
  );
};

export default memo(RiskOverlay, (prevProps, nextProps) => {
  const visChanged = prevProps.isVisible !== nextProps.isVisible;
  const riskChanged = prevProps.riskAssessment.risk_level !== nextProps.riskAssessment.risk_level ||
                      prevProps.riskAssessment.risk_score !== nextProps.riskAssessment.risk_score;
  const envChanged = prevProps.environment.aqi !== nextProps.environment.aqi ||
                     prevProps.environment.pm25 !== nextProps.environment.pm25;
  const pressureChanged = prevProps.pressureChange1h !== nextProps.pressureChange1h;
  return !visChanged && !riskChanged && !envChanged && !pressureChanged;
});
