import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Cloud, Droplets, CheckCircle2, X, Heart, 
  AlertTriangle, Sparkles, Activity, Radio,
  Pill, ThermometerSun, Wind, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserHealthProfile } from '@/pages/BioVault';

interface EnvironmentalSyncTaskProps {
  profile: UserHealthProfile | null;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const EnvironmentalSyncTask: React.FC<EnvironmentalSyncTaskProps> = ({ 
  profile, 
  onComplete, 
  onCancel 
}) => {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<'sync' | 'confirm' | 'calculating' | 'results'>('sync');
  const [syncProgress, setSyncProgress] = useState(0);
  const [calcProgress, setCalcProgress] = useState(0);
  const [medicationConfirmed, setMedicationConfirmed] = useState(false);
  const [environmentData, setEnvironmentData] = useState({
    pressure: 1008,
    humidity: 88,
    temperature: 32
  });

  // Simulate barometer sync
  useEffect(() => {
    if (stage === 'sync') {
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('confirm');
            return 100;
          }
          return prev + 3;
        });
        
        // Fluctuate readings
        setEnvironmentData(prev => ({
          pressure: prev.pressure + (Math.random() - 0.5) * 0.5,
          humidity: Math.max(60, Math.min(95, prev.humidity + (Math.random() - 0.5) * 1)),
          temperature: Math.max(28, Math.min(38, prev.temperature + (Math.random() - 0.5) * 0.2))
        }));
      }, 80);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Calculate risk
  useEffect(() => {
    if (stage === 'calculating') {
      const interval = setInterval(() => {
        setCalcProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('results');
            return 100;
          }
          return prev + 2;
        });
      }, 60);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const lisinoprilMed = profile?.medications.find(m => 
    m.name.toLowerCase().includes('lisinopril')
  );

  const calculateRisk = () => {
    // Formula: IF (P < 1010 hPa) AND (H > 85%) AND (hasCardiovascular) AND (onMedication)
    const pressureRisk = environmentData.pressure < 1010 ? 0.3 : 0.1;
    const humidityRisk = environmentData.humidity > 85 ? 0.25 : 0.1;
    const conditionRisk = profile?.chronicConditions.some(c => 
      c.toLowerCase().includes('hypertension')
    ) ? 0.25 : 0.05;
    const medicationFactor = medicationConfirmed ? 0.8 : 1.0; // Medication reduces risk

    const rawRisk = (pressureRisk + humidityRisk + conditionRisk) * 100;
    return Math.min(95, Math.round(rawRisk * medicationFactor));
  };

  const riskPercentage = calculateRisk();

  const handleStartCalculation = () => {
    if (!medicationConfirmed) {
      toast.error(t('biovault.tasks.env.confirmMed', 'Vui lòng xác nhận tình trạng thuốc'));
      return;
    }
    setStage('calculating');
  };

  const handleComplete = () => {
    toast.success(t('biovault.tasks.env.success', 'Đồng bộ quy luật ẩn hoàn tất'), {
      description: t('biovault.tasks.env.riskUpdated', 'Xác suất rủi ro tim mạch đã được cập nhật')
    });
    onComplete({
      cardiovascularRisk: riskPercentage,
      environmentData,
      medicationStatus: medicationConfirmed,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <Card className="mt-4 border-2 border-warning/50 bg-gradient-to-br from-warning/10 via-card to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-warning" />
            {t('biovault.tasks.env.title', 'Đồng bộ Quy luật ẩn')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {stage === 'sync' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative mx-auto w-24 h-24">
                <Radio className="h-24 w-24 text-warning animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cloud className="h-10 w-10 text-foreground animate-bounce" />
                </div>
              </div>
              <p className="text-sm text-warning font-medium mt-2">
                {t('biovault.tasks.env.syncing', 'Đang đồng bộ dữ liệu môi trường...')}
              </p>
            </div>

            {/* Real-time Environment Display */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-muted/50 text-center border border-border animate-pulse">
                <Cloud className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-xs text-muted-foreground">{t('biovault.env.pressure', 'Áp suất')}</p>
                <p className="font-bold text-foreground">{environmentData.pressure.toFixed(0)} <span className="text-xs font-normal">hPa</span></p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center border border-border animate-pulse">
                <Droplets className="h-5 w-5 mx-auto mb-1 text-info" />
                <p className="text-xs text-muted-foreground">{t('biovault.env.humidity', 'Độ ẩm')}</p>
                <p className="font-bold text-foreground">{environmentData.humidity.toFixed(0)}<span className="text-xs font-normal">%</span></p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50 text-center border border-border animate-pulse">
                <ThermometerSun className="h-5 w-5 mx-auto mb-1 text-danger" />
                <p className="text-xs text-muted-foreground">{t('biovault.env.temp', 'Nhiệt độ')}</p>
                <p className="font-bold text-foreground">{environmentData.temperature.toFixed(1)}<span className="text-xs font-normal">°C</span></p>
              </div>
            </div>

            <Progress value={syncProgress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{syncProgress}% {t('biovault.tasks.env.synced', 'đã đồng bộ')}</p>
          </div>
        )}

        {stage === 'confirm' && (
          <div className="space-y-4">
            <Alert className="bg-success/10 border-success/30">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">{t('biovault.tasks.env.syncComplete', 'Đồng bộ thành công!')}</AlertTitle>
              <AlertDescription className="text-success/80">
                {t('biovault.tasks.env.dataReceived', 'Dữ liệu môi trường đã được nhận')}
              </AlertDescription>
            </Alert>

            {/* Environment Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl text-center border ${environmentData.pressure < 1010 ? 'border-warning bg-warning/10' : 'border-border bg-muted/50'}`}>
                <Cloud className={`h-5 w-5 mx-auto mb-1 ${environmentData.pressure < 1010 ? 'text-warning' : 'text-primary'}`} />
                <p className="text-xs text-muted-foreground">{t('biovault.env.pressure', 'Áp suất')}</p>
                <p className={`font-bold ${environmentData.pressure < 1010 ? 'text-warning' : 'text-foreground'}`}>
                  {environmentData.pressure.toFixed(0)} hPa
                </p>
                {environmentData.pressure < 1010 && (
                  <Badge className="text-[10px] bg-warning/20 text-warning mt-1">Thấp</Badge>
                )}
              </div>
              <div className={`p-3 rounded-xl text-center border ${environmentData.humidity > 85 ? 'border-warning bg-warning/10' : 'border-border bg-muted/50'}`}>
                <Droplets className={`h-5 w-5 mx-auto mb-1 ${environmentData.humidity > 85 ? 'text-warning' : 'text-info'}`} />
                <p className="text-xs text-muted-foreground">{t('biovault.env.humidity', 'Độ ẩm')}</p>
                <p className={`font-bold ${environmentData.humidity > 85 ? 'text-warning' : 'text-foreground'}`}>
                  {environmentData.humidity.toFixed(0)}%
                </p>
                {environmentData.humidity > 85 && (
                  <Badge className="text-[10px] bg-warning/20 text-warning mt-1">Cao</Badge>
                )}
              </div>
              <div className="p-3 rounded-xl text-center border border-border bg-muted/50">
                <ThermometerSun className="h-5 w-5 mx-auto mb-1 text-danger" />
                <p className="text-xs text-muted-foreground">{t('biovault.env.temp', 'Nhiệt độ')}</p>
                <p className="font-bold text-foreground">{environmentData.temperature.toFixed(1)}°C</p>
              </div>
            </div>

            {/* Medication Confirmation */}
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="medication" 
                  checked={medicationConfirmed}
                  onCheckedChange={(checked) => setMedicationConfirmed(checked as boolean)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="medication" className="font-medium text-foreground cursor-pointer">
                    {t('biovault.tasks.env.confirmMedication', 'Xác nhận đang dùng thuốc')}
                  </label>
                  {lisinoprilMed && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/50">
                      <Pill className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{lisinoprilMed.name}</span>
                      <Badge variant="outline" className="text-xs">{lisinoprilMed.dosage}</Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('biovault.tasks.env.medNote', 'Việc dùng thuốc đúng giờ sẽ giảm xác suất rủi ro tim mạch')}
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartCalculation} 
              className="w-full"
              disabled={!medicationConfirmed}
            >
              <Activity className="h-4 w-4 mr-2" />
              {t('biovault.tasks.env.calculateRisk', 'Tính toán xác suất rủi ro')}
            </Button>
          </div>
        )}

        {stage === 'calculating' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <Heart className="h-24 w-24 text-danger animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="h-10 w-10 text-foreground animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-danger font-medium">
                {t('biovault.tasks.env.calculating', 'Đang tính toán rủi ro tim mạch...')}
              </p>
              <Progress value={calcProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {calcProgress < 30 && 'Applying pressure correlation...'}
                {calcProgress >= 30 && calcProgress < 60 && 'Analyzing humidity impact...'}
                {calcProgress >= 60 && calcProgress < 90 && 'Cross-referencing health profile...'}
                {calcProgress >= 90 && 'Generating risk score...'}
              </p>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="space-y-4">
            {/* Risk Result */}
            <div className={`p-6 rounded-2xl text-center ${
              riskPercentage >= 70 ? 'bg-danger/10 border-2 border-danger/50' :
              riskPercentage >= 50 ? 'bg-warning/10 border-2 border-warning/50' :
              'bg-success/10 border-2 border-success/50'
            }`}>
              <Heart className={`h-12 w-12 mx-auto mb-2 ${
                riskPercentage >= 70 ? 'text-danger animate-pulse' :
                riskPercentage >= 50 ? 'text-warning' :
                'text-success'
              }`} />
              <p className="text-sm text-muted-foreground">{t('biovault.tasks.env.cardiovascularRisk', 'Xác suất rủi ro tim mạch')}</p>
              <div className={`text-5xl font-bold ${
                riskPercentage >= 70 ? 'text-danger' :
                riskPercentage >= 50 ? 'text-warning' :
                'text-success'
              }`}>
                {riskPercentage}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('biovault.tasks.env.within12h', 'Trong 12 giờ tới')}
              </p>
            </div>

            {/* Risk Factors */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('biovault.tasks.env.factors', 'Các yếu tố')}:</p>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-warning" />
                  {t('biovault.env.pressure', 'Áp suất')}: {environmentData.pressure.toFixed(0)} hPa
                </span>
                {environmentData.pressure < 1010 && <Badge variant="destructive" className="text-xs">+30%</Badge>}
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-info" />
                  {t('biovault.env.humidity', 'Độ ẩm')}: {environmentData.humidity.toFixed(0)}%
                </span>
                {environmentData.humidity > 85 && <Badge variant="destructive" className="text-xs">+25%</Badge>}
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-success" />
                  {lisinoprilMed?.name} {lisinoprilMed?.dosage}
                </span>
                <Badge className="text-xs bg-success/20 text-success">-20%</Badge>
              </div>
            </div>

            {/* High Risk Alert */}
            {riskPercentage >= 70 && (
              <Alert className="bg-danger/10 border-danger/30">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <AlertTitle className="text-danger">{t('biovault.tasks.env.highRisk', 'Rủi ro cao!')}</AlertTitle>
                <AlertDescription className="text-danger/80">
                  {t('biovault.tasks.env.highRiskAdvice', 'Hạn chế hoạt động gắng sức, uống thuốc đúng giờ, đo huyết áp mỗi 4 tiếng')}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleComplete} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('biovault.tasks.env.save', 'Lưu vào hồ sơ')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
