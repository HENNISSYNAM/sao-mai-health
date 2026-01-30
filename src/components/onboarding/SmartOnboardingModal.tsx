import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, Home, Target, Shield, 
  Check, Edit2, SkipForward, Loader2, Sparkles,
  AlertCircle, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingProfile {
  user_id: string;
  language: string;
  region: { city: string | null; province: string | null; confidence: number };
  living_environment: { value: string | null; confidence: number };
  date_of_birth: string | null;
  age: number | null;
  age_group: string | null;
  health_sensitivity: { likely_sensitive: boolean; basis: string | null };
  primary_interest: string[];
  alert_threshold: string;
  inference_log: Array<{ field: string; inferred_value: string | null; confidence: number; source: string }>;
}

interface SmartOnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (profile: OnboardingProfile) => void;
  userId: string;
  googleProfile?: {
    name?: string;
    email?: string;
    locale?: string;
  };
}

export const SmartOnboardingModal: React.FC<SmartOnboardingModalProps> = ({
  open,
  onClose,
  onComplete,
  userId,
  googleProfile
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'loading' | 'review' | 'edit' | 'dob' | 'conditions'>('loading');
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [userMessage, setUserMessage] = useState('');
  const [questionsNeeded, setQuestionsNeeded] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hasChronicConditions, setHasChronicConditions] = useState<boolean | null>(null);
  const [chronicConditions, setChronicConditions] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Get GPS on mount
  useEffect(() => {
    if (open && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => console.log("GPS not available")
      );
    }
  }, [open]);

  // Call onboarding agent
  useEffect(() => {
    if (open && step === 'loading') {
      runOnboardingAgent();
    }
  }, [open, step]);

  const runOnboardingAgent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onboarding-agent', {
        body: {
          user_id: userId,
          google_profile: googleProfile,
          device_locale: navigator.language,
          gps_consent: !!gpsCoords,
          gps_coords: gpsCoords,
          language_preference: i18n.language
        }
      });

      if (error) throw error;

      setProfile(data.profile);
      setUserMessage(data.user_message);
      setQuestionsNeeded(data.questions_needed || []);
      setStep('review');
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error(t('onboarding.error', 'Không thể tạo hồ sơ. Vui lòng thử lại.'));
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (profile) {
      // Update profile with any collected data
      const updatedProfile = {
        ...profile,
        date_of_birth: dateOfBirth || null,
      };
      onComplete(updatedProfile);
      toast.success(t('onboarding.success', 'Hồ sơ đã được tạo thành công!'));
      onClose();
    }
  };

  const handleSkip = () => {
    if (profile) {
      onComplete(profile);
      toast.info(t('onboarding.skipped', 'Bạn có thể cập nhật hồ sơ sau.'));
      onClose();
    }
  };

  const handleNext = () => {
    if (step === 'dob') {
      if (questionsNeeded.includes('chronic_conditions')) {
        setStep('conditions');
      } else {
        handleConfirm();
      }
    } else if (step === 'conditions') {
      handleConfirm();
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">Cao</Badge>;
    } else if (confidence >= 60) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">TB</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Thấp</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('onboarding.title', 'Thiết lập Digital Twin')}
          </DialogTitle>
          <DialogDescription>
            {t('onboarding.subtitle', 'AI đã tự động suy luận thông tin của bạn')}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <Shield className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            </div>
            <p className="text-muted-foreground text-center">
              {t('onboarding.analyzing', 'Đang phân tích thông tin...')}
            </p>
            <Progress value={60} className="w-48" />
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && profile && (
          <div className="space-y-4">
            {/* AI Message */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-line">{userMessage}</p>
              </CardContent>
            </Card>

            {/* Inferred Data */}
            <div className="space-y-3">
              {/* Region */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t('onboarding.location', 'Vị trí')}</p>
                    <p className="text-muted-foreground text-sm">
                      {profile.region.city || t('common.unknown', 'Chưa xác định')}
                    </p>
                  </div>
                </div>
                {profile.region.confidence > 0 && getConfidenceBadge(profile.region.confidence)}
              </div>

              {/* Living Environment */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t('onboarding.environment', 'Môi trường')}</p>
                    <p className="text-muted-foreground text-sm">
                      {profile.living_environment.value || t('common.unknown', 'Chưa xác định')}
                    </p>
                  </div>
                </div>
                {profile.living_environment.confidence > 0 && getConfidenceBadge(profile.living_environment.confidence)}
              </div>

              {/* Age Group */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{t('onboarding.ageGroup', 'Nhóm tuổi')}</p>
                    <p className="text-muted-foreground text-sm">
                      {profile.age_group || t('common.unknown', 'Chưa rõ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Priorities */}
              {profile.primary_interest.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{t('onboarding.priorities', 'Ưu tiên')}</p>
                      <div className="flex gap-1 mt-1">
                        {profile.primary_interest.map((interest, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {t(`diseases.${interest}`, interest)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Health Sensitivity Warning */}
              {profile.health_sensitivity.likely_sensitive && (
                <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <p className="text-sm text-warning">
                    {t('onboarding.sensitiveNote', 'Bạn thuộc nhóm cần theo dõi sức khỏe đặc biệt')}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={() => questionsNeeded.includes('date_of_birth') ? setStep('dob') : handleConfirm()} className="w-full">
                <Check className="h-4 w-4 mr-2" />
                {t('onboarding.confirm', 'Xác nhận')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('edit')} className="flex-1">
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t('onboarding.edit', 'Chỉnh sửa')}
                </Button>
                <Button variant="ghost" onClick={handleSkip} className="flex-1">
                  <SkipForward className="h-4 w-4 mr-2" />
                  {t('onboarding.skip', 'Bỏ qua')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Date of Birth Step */}
        {step === 'dob' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold">
                {t('onboarding.dobQuestion', 'Bạn sinh ngày nào?')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('onboarding.dobNote', 'Giúp cá nhân hóa cảnh báo sức khỏe theo độ tuổi')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('onboarding.dateOfBirth', 'Ngày sinh (DD/MM/YYYY)')}</Label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleNext} className="flex-1">
                {t('common.continue', 'Tiếp tục')}
              </Button>
              <Button variant="ghost" onClick={handleSkip}>
                {t('onboarding.skip', 'Bỏ qua')}
              </Button>
            </div>
          </div>
        )}

        {/* Chronic Conditions Step */}
        {step === 'conditions' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Heart className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold">
                {t('onboarding.conditionsQuestion', 'Bạn có bệnh nền cần theo dõi không?')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('onboarding.conditionsNote', 'Thông tin này hoàn toàn bảo mật và tùy chọn')}
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant={hasChronicConditions === true ? "default" : "outline"}
                onClick={() => setHasChronicConditions(true)}
              >
                {t('common.yes', 'Có')}
              </Button>
              <Button
                variant={hasChronicConditions === false ? "default" : "outline"}
                onClick={() => setHasChronicConditions(false)}
              >
                {t('common.no', 'Không')}
              </Button>
            </div>

            {hasChronicConditions && (
              <div className="space-y-2">
                <Label>{t('onboarding.conditionsList', 'Bệnh nền (tùy chọn)')}</Label>
                <Input
                  placeholder={t('onboarding.conditionsPlaceholder', 'VD: Cao huyết áp, Tiểu đường...')}
                  value={chronicConditions}
                  onChange={(e) => setChronicConditions(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleConfirm} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {t('onboarding.complete', 'Hoàn tất')}
              </Button>
              <Button variant="ghost" onClick={handleSkip}>
                {t('onboarding.skip', 'Bỏ qua')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
