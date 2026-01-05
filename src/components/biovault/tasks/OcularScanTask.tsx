import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, Scan, CheckCircle2, X, Activity, 
  Droplets, AlertTriangle, Sparkles, Camera
} from 'lucide-react';
import { toast } from 'sonner';

interface OcularScanTaskProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export const OcularScanTask: React.FC<OcularScanTaskProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'intro' | 'scanning' | 'analyzing' | 'results'>('intro');
  const [scanProgress, setScanProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simulate eye scan animation
  useEffect(() => {
    if (stage === 'scanning') {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('analyzing');
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 'analyzing') {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('results');
            return 100;
          }
          return prev + 1;
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Draw eye scan overlay animation
  useEffect(() => {
    if (stage === 'scanning' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationFrame: number;
      let scanLine = 0;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw eye outline
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(canvas.width / 2, canvas.height / 2, 80, 50, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw iris
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 35, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.stroke();

        // Draw pupil
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fill();

        // Draw scan line
        ctx.beginPath();
        ctx.moveTo(0, scanLine);
        ctx.lineTo(canvas.width, scanLine);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Glow effect
        const gradient = ctx.createLinearGradient(0, scanLine - 20, 0, scanLine + 20);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanLine - 20, canvas.width, 40);

        scanLine = (scanLine + 2) % canvas.height;
        animationFrame = requestAnimationFrame(draw);
      };

      draw();
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [stage]);

  const mockResults = {
    liver: {
      score: 82,
      status: 'healthy',
      findings: ['Bilirubin levels normal', 'No jaundice indicators']
    },
    blood: {
      score: 78,
      status: 'attention',
      findings: ['Slight anemia indicators', 'Iron supplementation recommended']
    }
  };

  const handleComplete = () => {
    toast.success(t('biovault.tasks.ocular.success', 'Quét mắt hoàn tất'), {
      description: t('biovault.tasks.ocular.dataUpdated', 'Dữ liệu Gan và Máu đã được cập nhật vào Digital Twin')
    });
    onComplete({
      liverHealth: mockResults.liver.score,
      bloodHealth: mockResults.blood.score,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <Card className="mt-4 border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            {t('biovault.tasks.ocular.title', 'Quét Ánh mắt Tiên tri')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {stage === 'intro' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-40 h-40 rounded-full border-4 border-dashed border-primary/50 flex items-center justify-center">
              <Camera className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('biovault.tasks.ocular.instructions', 'Đưa mắt vào khung hình và giữ ổn định. AI sẽ quét niêm mạc mắt để phân tích sức khỏe Gan và Máu.')}
            </p>
            <Button onClick={() => setStage('scanning')} className="w-full max-w-xs">
              <Scan className="h-4 w-4 mr-2" />
              {t('biovault.tasks.ocular.startScan', 'Bắt đầu quét')}
            </Button>
          </div>
        )}

        {stage === 'scanning' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-48 h-32 bg-black/20 rounded-xl overflow-hidden border-2 border-primary">
              <canvas ref={canvasRef} width={192} height={128} className="w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Badge className="bg-danger/80 text-white animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  REC
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-primary font-medium">
                {t('biovault.tasks.ocular.scanning', 'Đang quét niêm mạc mắt...')}
              </p>
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{scanProgress}% {t('biovault.tasks.ocular.complete', 'hoàn thành')}</p>
            </div>
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <Sparkles className="h-24 w-24 text-primary animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="h-10 w-10 text-foreground animate-bounce" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-primary font-medium">
                {t('biovault.tasks.ocular.analyzing', 'AI đang phân tích dữ liệu...')}
              </p>
              <Progress value={analysisProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {analysisProgress < 30 && 'Detecting blood vessel patterns...'}
                {analysisProgress >= 30 && analysisProgress < 60 && 'Analyzing sclera coloration...'}
                {analysisProgress >= 60 && analysisProgress < 90 && 'Measuring bilirubin levels...'}
                {analysisProgress >= 90 && 'Compiling health report...'}
              </p>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="space-y-4">
            <Alert className="bg-success/10 border-success/30">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">{t('biovault.tasks.ocular.scanComplete', 'Quét hoàn tất!')}</AlertTitle>
              <AlertDescription className="text-success/80">
                {t('biovault.tasks.ocular.resultsReady', 'Kết quả phân tích đã sẵn sàng')}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              {/* Liver Results */}
              <div className="p-4 rounded-xl border border-success/30 bg-success/5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-success" />
                  <span className="font-medium text-foreground">{t('biovault.tasks.ocular.liver', 'Sức khỏe Gan')}</span>
                </div>
                <div className="text-3xl font-bold text-success mb-2">{mockResults.liver.score}%</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {mockResults.liver.findings.map((f, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Blood Results */}
              <div className="p-4 rounded-xl border border-warning/30 bg-warning/5">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-5 w-5 text-warning" />
                  <span className="font-medium text-foreground">{t('biovault.tasks.ocular.blood', 'Sức khỏe Máu')}</span>
                </div>
                <div className="text-3xl font-bold text-warning mb-2">{mockResults.blood.score}%</div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {mockResults.blood.findings.map((f, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-warning" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button onClick={handleComplete} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('biovault.tasks.ocular.updateTwin', 'Cập nhật vào Digital Twin')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
