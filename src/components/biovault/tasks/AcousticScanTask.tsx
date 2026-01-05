import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, MicOff, CheckCircle2, X, Wind, 
  AlertTriangle, Sparkles, Activity, Waves
} from 'lucide-react';
import { toast } from 'sonner';

interface AcousticScanTaskProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const AcousticScanTask: React.FC<AcousticScanTaskProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'intro' | 'recording' | 'analyzing' | 'results'>('intro');
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(20).fill(10));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulate audio waveform
  useEffect(() => {
    if (stage === 'recording') {
      const interval = setInterval(() => {
        setAudioLevels(prev => {
          const newLevels = [...prev.slice(1)];
          // Simulate breathing pattern
          const breathPhase = (recordingTime % 4) / 4;
          const baseLevel = Math.sin(breathPhase * Math.PI * 2) * 30 + 40;
          newLevels.push(baseLevel + Math.random() * 20);
          return newLevels;
        });
        setRecordingTime(prev => prev + 0.1);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [stage, recordingTime]);

  // Recording timer
  useEffect(() => {
    if (stage === 'recording' && recordingTime >= 10) {
      setStage('analyzing');
    }
  }, [stage, recordingTime]);

  // Analysis progress
  useEffect(() => {
    if (stage === 'analyzing') {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('results');
            return 100;
          }
          return prev + 2;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Draw audio waveform
  useEffect(() => {
    if (stage === 'recording' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / audioLevels.length;
      const centerY = canvas.height / 2;

      audioLevels.forEach((level, i) => {
        const barHeight = level * 0.8;
        const x = i * barWidth;
        
        // Gradient for bar
        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.8)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight);
      });
    }
  }, [audioLevels, stage]);

  const mockResults = {
    sinusScore: 72,
    breathingPattern: 'irregular',
    findings: [
      { label: 'Nasal congestion detected', labelVi: 'Phát hiện nghẹt mũi', severity: 'warning' },
      { label: 'Slight wheezing on exhale', labelVi: 'Thở khò nhẹ khi thở ra', severity: 'info' },
      { label: 'Breathing rhythm: 16/min', labelVi: 'Nhịp thở: 16 lần/phút', severity: 'normal' }
    ],
    prediction: {
      probability: 65,
      timeframe: '48 hours',
      recommendation: 'Use saline nasal spray and monitor symptoms'
    }
  };

  const handleComplete = () => {
    toast.success(t('biovault.tasks.acoustic.success', 'Phân tích âm thanh hoàn tất'), {
      description: t('biovault.tasks.acoustic.dataUpdated', 'Dự báo viêm xoang đã được cập nhật')
    });
    onComplete({
      sinusHealth: mockResults.sinusScore,
      prediction: mockResults.prediction,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <Card className="mt-4 border-2 border-info/50 bg-gradient-to-br from-info/10 via-card to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5 text-info" />
            {t('biovault.tasks.acoustic.title', 'Phân tích Thanh âm Hô hấp')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {stage === 'intro' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 rounded-full border-4 border-info/30 animate-pulse" />
              <div className="absolute inset-4 rounded-full border-4 border-info/50 animate-ping" />
              <div className="absolute inset-8 rounded-full bg-info/20 flex items-center justify-center">
                <Mic className="h-12 w-12 text-info" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('biovault.tasks.acoustic.instructions', 'Hít thở sâu và đều trong 10 giây. AI sẽ phân tích mẫu âm thanh để dự đoán tình trạng xoang.')}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" /> Hít sâu
              </span>
              <span className="flex items-center gap-1">
                <Waves className="h-3 w-3" /> Thở đều
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" /> 10 giây
              </span>
            </div>
            <Button onClick={() => setStage('recording')} className="w-full max-w-xs">
              <Mic className="h-4 w-4 mr-2" />
              {t('biovault.tasks.acoustic.startRecord', 'Bắt đầu ghi')}
            </Button>
          </div>
        )}

        {stage === 'recording' && (
          <div className="text-center space-y-4">
            {/* Audio Visualization */}
            <div className="relative mx-auto w-full max-w-sm h-24 bg-black/20 rounded-xl overflow-hidden border-2 border-info">
              <canvas ref={canvasRef} width={320} height={96} className="w-full h-full" />
              <Badge className="absolute top-2 right-2 bg-danger/80 text-white animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                REC
              </Badge>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-danger/20 border-4 border-danger flex items-center justify-center animate-pulse">
                <Mic className="h-8 w-8 text-danger" />
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={(recordingTime / 10) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {Math.floor(recordingTime)}s / 10s - {t('biovault.tasks.acoustic.keepBreathing', 'Hãy tiếp tục thở đều...')}
              </p>
            </div>
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <Sparkles className="h-24 w-24 text-info animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Wind className="h-10 w-10 text-foreground animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-info font-medium">
                {t('biovault.tasks.acoustic.analyzing', 'Đang phân tích mẫu âm thanh...')}
              </p>
              <Progress value={analysisProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {analysisProgress < 30 && 'Extracting frequency patterns...'}
                {analysisProgress >= 30 && analysisProgress < 60 && 'Detecting congestion markers...'}
                {analysisProgress >= 60 && analysisProgress < 90 && 'Analyzing breathing rhythm...'}
                {analysisProgress >= 90 && 'Generating prediction...'}
              </p>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="space-y-4">
            <Alert className="bg-success/10 border-success/30">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">{t('biovault.tasks.acoustic.analysisComplete', 'Phân tích hoàn tất!')}</AlertTitle>
              <AlertDescription className="text-success/80">
                {t('biovault.tasks.acoustic.resultsReady', 'Dự báo tình trạng xoang đã sẵn sàng')}
              </AlertDescription>
            </Alert>

            {/* Sinus Health Score */}
            <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 text-center">
              <Wind className="h-8 w-8 text-warning mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('biovault.tasks.acoustic.sinusHealth', 'Sức khỏe Xoang')}</p>
              <div className="text-4xl font-bold text-warning">{mockResults.sinusScore}%</div>
            </div>

            {/* Findings */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t('biovault.tasks.acoustic.findings', 'Phát hiện')}:</p>
              {mockResults.findings.map((finding, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    finding.severity === 'warning' ? 'bg-warning/10 text-warning' :
                    finding.severity === 'info' ? 'bg-info/10 text-info' :
                    'bg-muted/50 text-foreground'
                  }`}
                >
                  {finding.severity === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                   finding.severity === 'info' ? <Activity className="h-4 w-4" /> :
                   <CheckCircle2 className="h-4 w-4" />}
                  {finding.labelVi}
                </div>
              ))}
            </div>

            {/* Prediction */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('biovault.tasks.acoustic.prediction', 'Dự báo viêm xoang')}</span>
                <Badge variant="outline" className="text-warning border-warning">
                  {mockResults.prediction.probability}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('biovault.tasks.acoustic.within', 'Trong')} {mockResults.prediction.timeframe}: {mockResults.prediction.recommendation}
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('biovault.tasks.acoustic.updateTwin', 'Cập nhật dự báo')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
