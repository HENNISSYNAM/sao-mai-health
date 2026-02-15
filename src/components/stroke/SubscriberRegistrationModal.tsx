import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Brain, Shield, CheckCircle2, Bell } from 'lucide-react';
import healthLogo from '@/assets/health-logo.png';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';

interface SubscriberRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subscriberId: string, phone: string) => void;
  gps?: { lat: number; lon: number } | null;
  barometerData?: { pressure: number | null; change1h: number | null; change24h: number | null } | null;
}

type RegistrationStep = 'form' | 'analyzing' | 'enabling_push' | 'success';

const SubscriberRegistrationModal: React.FC<SubscriberRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  gps,
  barometerData
}) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [step, setStep] = useState<RegistrationStep>('form');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { subscribe: subscribePush, isSupported: isPushSupported } = usePushNotifications();

  const calculateAgeGroup = (dob: string): string => {
    // Parse date string safely to avoid UTC timezone shift
    const [year, month, day] = dob.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    
    if (actualAge <= 35) return '18-35';
    if (actualAge <= 55) return '36-55';
    if (actualAge <= 70) return '56-70';
    return '70+';
  };

  const formatPhoneNumber = (phoneInput: string): string => {
    let formatted = phoneInput.replace(/\D/g, '');
    if (formatted.startsWith('84')) {
      formatted = '0' + formatted.slice(2);
    }
    if (!formatted.startsWith('0')) {
      formatted = '0' + formatted;
    }
    return formatted;
  };

  const handleSubmit = async () => {
    if (!phone || phone.length < 9) {
      toast.error('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    if (!dateOfBirth) {
      toast.error('Vui lòng nhập ngày tháng năm sinh');
      return;
    }

    setIsSubmitting(true);
    setStep('analyzing');

    const formattedPhone = formatPhoneNumber(phone);
    const ageGroup = calculateAgeGroup(dateOfBirth);

    try {
      // Call AI to analyze user profile
      const { data: aiData, error: aiError } = await supabase.functions.invoke('stroke-health-ai', {
        body: {
          lat: gps?.lat || 10.8231,
          lon: gps?.lon || 106.6297,
          ageGroup,
          analysisType: 'profile_analysis',
          userProfile: {
            dateOfBirth,
            gender,
            ageGroup,
            hasBarometer: !!barometerData?.pressure
          }
        }
      });

      let analysis = null;
      if (!aiError && aiData) {
        analysis = aiData;
        setAiAnalysis(aiData);
      }

      // Check if subscriber already exists
      const { data: existing } = await supabase
        .from('stroke_alert_subscribers')
        .select('id')
        .eq('phone', formattedPhone)
        .single();

      let subscriberId: string;

      if (existing) {
        // Update existing subscriber
        const { data: updated, error: updateError } = await supabase
          .from('stroke_alert_subscribers')
          .update({
            date_of_birth: dateOfBirth,
            gender,
            age_group: ageGroup,
            lat: gps?.lat,
            lon: gps?.lon,
            ai_risk_analysis: analysis,
            last_gps_data: gps ? { lat: gps.lat, lon: gps.lon, timestamp: new Date().toISOString() } : null,
            last_barometer_data: barometerData ? {
              pressure: barometerData.pressure,
              change1h: barometerData.change1h,
              change24h: barometerData.change24h,
              timestamp: new Date().toISOString()
            } : null,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        subscriberId = updated!.id;
        toast.success('Đã cập nhật thông tin đăng ký!');
      } else {
        // Create new subscriber - include user_id if logged in
        const { data: created, error: createError } = await supabase
          .from('stroke_alert_subscribers')
          .insert({
            phone: formattedPhone,
            date_of_birth: dateOfBirth,
            gender,
            age_group: ageGroup,
            lat: gps?.lat,
            lon: gps?.lon,
            ai_risk_analysis: analysis,
            last_gps_data: gps ? { lat: gps.lat, lon: gps.lon, timestamp: new Date().toISOString() } : null,
            last_barometer_data: barometerData ? {
              pressure: barometerData.pressure,
              change1h: barometerData.change1h,
              change24h: barometerData.change24h,
              timestamp: new Date().toISOString()
            } : null,
            is_active: true,
            health_data_history: [{
              timestamp: new Date().toISOString(),
              gps: gps,
              barometer: barometerData,
              ageGroup,
              gender
            }],
            user_id: user?.id || null
          })
          .select('id')
          .single();

        if (createError) throw createError;
        subscriberId = created!.id;
        toast.success('Đăng ký thành công!');
      }

      // Store phone in localStorage namespaced by user_id for data isolation
      const storagePrefix = user?.id ? `${user.id}:` : '';
      localStorage.setItem(`${storagePrefix}stroke_subscriber_phone`, formattedPhone);
      localStorage.setItem(`${storagePrefix}stroke_subscriber_id`, subscriberId);

      // Enable push notifications
      if (isPushSupported) {
        setStep('enabling_push');
        try {
          await subscribePush(subscriberId);
        } catch (pushError) {
          console.error('Push subscription error:', pushError);
          // Continue even if push fails
        }
      }

      setStep('success');
      
      setTimeout(() => {
        onSuccess(subscriberId, formattedPhone);
        onClose();
        resetForm();
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Đã xảy ra lỗi: ' + (error.message || 'Không thể đăng ký'));
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPhone('');
    setDateOfBirth('');
    setGender('male');
    setStep('form');
    setAiAnalysis(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {step === 'form' && <UserPlus className="h-5 w-5 text-primary" />}
            {step === 'analyzing' && <Brain className="h-5 w-5 text-amber-400" />}
            {step === 'enabling_push' && <Bell className="h-5 w-5 text-blue-400" />}
            {step === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            {step === 'form' && 'Đăng ký nhận cảnh báo'}
            {step === 'analyzing' && 'Đang phân tích...'}
            {step === 'enabling_push' && 'Bật thông báo đẩy'}
            {step === 'success' && 'Đăng ký thành công!'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'form' && 'Nhập thông tin để nhận cảnh báo nguy cơ đột quỵ cá nhân hóa'}
            {step === 'analyzing' && 'AI đang phân tích hồ sơ sức khỏe của bạn'}
            {step === 'enabling_push' && 'Cho phép gửi thông báo vào điện thoại của bạn'}
            {step === 'success' && 'Bạn sẽ nhận được cảnh báo trực tiếp vào điện thoại'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Số điện thoại *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="text-slate-300">Ngày sinh *</Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Giới tính *</Label>
              <RadioGroup value={gender} onValueChange={(v) => setGender(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" className="border-slate-500" />
                  <Label htmlFor="male" className="text-slate-300 cursor-pointer">Nam</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" className="border-slate-500" />
                  <Label htmlFor="female" className="text-slate-300 cursor-pointer">Nữ</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" className="border-slate-500" />
                  <Label htmlFor="other" className="text-slate-300 cursor-pointer">Khác</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-400 mt-0.5" />
                <div className="text-xs text-slate-400">
                  <p className="font-medium text-slate-300 mb-1">Bảo mật dữ liệu</p>
                  <p>Thông tin của bạn được mã hóa và chỉ dùng để gửi cảnh báo sức khỏe cá nhân hóa.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              Đăng ký nhận cảnh báo
            </Button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <img 
              src={healthLogo} 
              alt="Analyzing" 
              className="w-20 h-20 animate-heartbeat drop-shadow-lg"
            />
            <div className="text-center space-y-2">
              <p className="text-slate-300">AI đang phân tích hồ sơ sức khỏe...</p>
              <p className="text-xs text-slate-500">
                Phân tích dựa trên độ tuổi, giới tính và dữ liệu vị trí
              </p>
            </div>
          </div>
        )}

        {step === 'enabling_push' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
              <Bell className="h-10 w-10 text-blue-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-300">Đang bật thông báo đẩy...</p>
              <p className="text-xs text-slate-500">
                Cho phép ứng dụng gửi cảnh báo vào thanh thông báo điện thoại
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-300 font-medium">Đăng ký thành công!</p>
              <p className="text-xs text-slate-500">
                Bạn sẽ nhận được cảnh báo nguy cơ đột quỵ trực tiếp vào điện thoại
              </p>
              {aiAnalysis?.summary && (
                <p className="text-xs text-primary mt-2 px-4">{aiAnalysis.summary}</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriberRegistrationModal;
