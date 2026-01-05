import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Phone, Bell, Heart, Pill,
  MapPin, Clock, Shield, X, Ambulance
} from 'lucide-react';
import { toast } from 'sonner';

interface SmartAlertActionProps {
  riskPercentage: number;
  riskType: 'cardiovascular' | 'respiratory' | 'general';
  onDismiss: () => void;
}

export const SmartAlertAction: React.FC<SmartAlertActionProps> = ({
  riskPercentage,
  riskType,
  onDismiss
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);

  useEffect(() => {
    if (riskPercentage >= 75) {
      setIsVisible(true);
      // Increase pulse intensity based on risk
      setPulseIntensity(riskPercentage >= 85 ? 3 : riskPercentage >= 80 ? 2 : 1);
    } else {
      setIsVisible(false);
    }
  }, [riskPercentage]);

  if (!isVisible) return null;

  const handleEmergencyCall = () => {
    toast.success(t('biovault.alert.calling', 'Đang gọi 115...'), {
      description: t('biovault.alert.callDesc', 'Đang kết nối với dịch vụ cấp cứu'),
      duration: 5000
    });
    // In real app, would trigger actual call
  };

  const handleMedicationReminder = () => {
    toast.success(t('biovault.alert.reminderSet', 'Đã đặt nhắc nhở'), {
      description: t('biovault.alert.reminderDesc', 'Bạn sẽ được nhắc uống thuốc trong 15 phút'),
    });
    onDismiss();
  };

  const getRiskIcon = () => {
    switch (riskType) {
      case 'cardiovascular': return Heart;
      case 'respiratory': return Shield;
      default: return AlertTriangle;
    }
  };

  const RiskIcon = getRiskIcon();

  return (
    <Card className={`
      fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]
      border-2 border-danger bg-gradient-to-br from-danger/20 via-card to-danger/10
      shadow-2xl shadow-danger/20 overflow-hidden
      animate-slide-in-right
    `}>
      {/* Animated Border Glow */}
      <div className={`absolute inset-0 border-2 border-danger rounded-xl ${
        pulseIntensity >= 2 ? 'animate-pulse' : ''
      }`} />
      
      {/* Pulse Rings */}
      {pulseIntensity >= 2 && (
        <>
          <div className="absolute inset-0 border-2 border-danger/50 rounded-xl animate-ping" />
          {pulseIntensity >= 3 && (
            <div className="absolute inset-0 border-2 border-danger/30 rounded-xl animate-ping" style={{ animationDelay: '0.5s' }} />
          )}
        </>
      )}

      <CardContent className="p-4 relative">
        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`
            w-14 h-14 rounded-2xl bg-danger/20 flex items-center justify-center
            ${pulseIntensity >= 2 ? 'animate-pulse' : ''}
          `}>
            <RiskIcon className="h-8 w-8 text-danger" />
          </div>
          <div>
            <h3 className="font-bold text-danger text-lg flex items-center gap-2">
              {t('biovault.alert.title', 'Cảnh báo rủi ro')}
              <Badge className="bg-danger text-white animate-pulse">
                {riskPercentage}%
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              {riskType === 'cardiovascular' 
                ? t('biovault.alert.cardioRisk', 'Nguy cơ tim mạch cao')
                : t('biovault.alert.generalRisk', 'Nguy cơ sức khỏe cao')}
            </p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('biovault.alert.within', 'Trong 12h tới')}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            HCMC
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleEmergencyCall}
            className="bg-danger hover:bg-danger/90 text-white h-12"
          >
            <Phone className="h-5 w-5 mr-2" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-bold">{t('biovault.alert.call115', 'Gọi 115')}</span>
              <span className="text-[10px] opacity-80">{t('biovault.alert.emergency', 'Cấp cứu')}</span>
            </span>
          </Button>
          
          <Button 
            onClick={handleMedicationReminder}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-white h-12"
          >
            <Pill className="h-5 w-5 mr-2" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-bold">{t('biovault.alert.reminder', 'Nhắc thuốc')}</span>
              <span className="text-[10px] opacity-80">{t('biovault.alert.set15min', 'Đặt sau 15p')}</span>
            </span>
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-danger/20">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Bell className="h-3 w-3 mr-1" />
            {t('biovault.alert.notifyFamily', 'Báo gia đình')}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Ambulance className="h-3 w-3 mr-1" />
            {t('biovault.alert.nearbyHospital', 'BV gần nhất')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
