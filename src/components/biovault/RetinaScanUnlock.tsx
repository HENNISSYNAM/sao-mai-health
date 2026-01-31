import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, Shield, Lock, Scan, CheckCircle2, 
  AlertTriangle, Camera, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface FacialHealthData {
  estimatedHeartRate: number;
  estimatedOxygenLevel: number;
  stressIndicators: number;
  skinHealth: number;
  hydrationLevel: number;
}

interface RetinaScanUnlockProps {
  onUnlockSuccess: (scanData: {
    irisPattern: string;
    confidence: number;
    healthIndicators: {
      eyeHealth: number;
      bloodVesselClarity: number;
      pupilReactivity: number;
      scleraCondition: number;
    };
    facialHealth: FacialHealthData;
    timestamp: string;
  }) => void;
  onCancel?: () => void;
}

interface ScanResult {
  irisPattern: string;
  confidence: number;
  healthIndicators: {
    eyeHealth: number;
    bloodVesselClarity: number;
    pupilReactivity: number;
    scleraCondition: number;
  };
  facialHealth: FacialHealthData;
  timestamp: string;
}

export const RetinaScanUnlock: React.FC<RetinaScanUnlockProps> = ({
  onUnlockSuccess,
  onCancel
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [phase, setPhase] = useState<'init' | 'camera' | 'scanning' | 'analyzing' | 'success' | 'failed'>('init');
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [eyeDetected, setEyeDetected] = useState(false);
  const [eyePosition, setEyePosition] = useState({ x: 50, y: 50 });

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setPhase('camera');
      setCameraError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Không thể truy cập camera. Vui lòng cho phép quyền camera.');
      setPhase('init');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Simulate eye detection and tracking
  useEffect(() => {
    if (phase !== 'camera' && phase !== 'scanning') return;

    const detectEyes = setInterval(() => {
      // Simulate eye detection with random position near center
      const detected = Math.random() > 0.2;
      setEyeDetected(detected);
      
      if (detected) {
        setEyePosition({
          x: 45 + Math.random() * 10,
          y: 45 + Math.random() * 10
        });
      }
    }, 100);

    return () => clearInterval(detectEyes);
  }, [phase]);

  // Start retina + face scan
  const startScan = useCallback(async () => {
    if (!eyeDetected) {
      toast.error('Không phát hiện mắt. Hãy nhìn thẳng vào camera.');
      return;
    }

    setPhase('scanning');
    setProgress(0);

    // Simulate scanning progress (retina + face 3D)
    const scanDuration = 4000; // Longer for combined scan
    const steps = 100;
    const stepTime = scanDuration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, stepTime));
      setProgress(i);
    }

    setPhase('analyzing');

    // Simulate AI analysis for both retina and face
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Generate combined scan result (retina + facial health)
    const result: ScanResult = {
      irisPattern: generateIrisPattern(),
      confidence: 0.92 + Math.random() * 0.07,
      healthIndicators: {
        eyeHealth: 75 + Math.random() * 20,
        bloodVesselClarity: 70 + Math.random() * 25,
        pupilReactivity: 80 + Math.random() * 18,
        scleraCondition: 78 + Math.random() * 20
      },
      facialHealth: {
        estimatedHeartRate: 65 + Math.random() * 25,
        estimatedOxygenLevel: 95 + Math.random() * 4,
        stressIndicators: 20 + Math.random() * 40,
        skinHealth: 70 + Math.random() * 25,
        hydrationLevel: 60 + Math.random() * 35
      },
      timestamp: new Date().toISOString()
    };

    setScanResult(result);

    if (result.confidence >= 0.85) {
      setPhase('success');
      toast.success('Xác thực sinh trắc học thành công!');
      
      // Delay before unlocking with full data
      setTimeout(() => {
        stopCamera();
        onUnlockSuccess(result);
      }, 2000);
    } else {
      setPhase('failed');
      toast.error('Không thể xác minh. Vui lòng thử lại.');
    }
  }, [eyeDetected, stopCamera, onUnlockSuccess]);

  // Generate unique iris pattern hash
  const generateIrisPattern = () => {
    const chars = '0123456789ABCDEF';
    let pattern = 'IRIS-';
    for (let i = 0; i < 16; i++) {
      pattern += chars[Math.floor(Math.random() * chars.length)];
      if ((i + 1) % 4 === 0 && i < 15) pattern += '-';
    }
    return pattern;
  };

  // Cleanup
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <Card className="w-full max-w-lg border-2 border-info/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 bg-gradient-to-r from-info/10 to-primary/10">
        <div className="mx-auto mb-4 relative">
          <div className="w-20 h-20 rounded-full bg-info/20 flex items-center justify-center">
            <Eye className="h-10 w-10 text-info" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <Scan className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-info to-primary bg-clip-text text-transparent">
          Quét Sinh Trắc Học
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Mống mắt + Nhận diện khuôn mặt 3D
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Camera View */}
        {(phase === 'camera' || phase === 'scanning') && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Eye tracking overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Center guide circle */}
              <div 
                className={`absolute w-32 h-32 rounded-full border-4 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  eyeDetected 
                    ? 'border-success shadow-lg shadow-success/50' 
                    : 'border-warning/50 animate-pulse'
                }`}
                style={{ 
                  left: `${eyePosition.x}%`, 
                  top: `${eyePosition.y}%` 
                }}
              >
                {/* Inner scanning ring */}
                {phase === 'scanning' && (
                  <div className="absolute inset-2 rounded-full border-2 border-info animate-ping" />
                )}
              </div>

              {/* Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-info/50" />
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-info/50" />
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-0.5 bg-info/50" />
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-0.5 bg-info/50" />
                </div>
              </div>

              {/* Scanning line animation */}
              {phase === 'scanning' && (
                <div 
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-info to-transparent animate-scan-line"
                  style={{ top: `${(progress % 100)}%` }}
                />
              )}

              {/* Status indicator */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Badge 
                  className={`${
                    eyeDetected 
                      ? 'bg-success/90 text-success-foreground' 
                      : 'bg-warning/90 text-warning-foreground animate-pulse'
                  }`}
                >
                  {eyeDetected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Đã phát hiện mắt
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Đang tìm mắt...
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Init Phase */}
        {phase === 'init' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-info/10 flex items-center justify-center">
              <Camera className="h-12 w-12 text-info" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Nhấn nút bên dưới để bắt đầu quét võng mạc
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Mã hóa E2E
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Lưu trữ cục bộ
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing Phase */}
        {phase === 'analyzing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Đang phân tích sinh trắc học...</p>
              <p className="text-sm text-muted-foreground">
                AI đang xử lý mống mắt + khuôn mặt 3D
              </p>
            </div>
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {/* Success Phase */}
        {phase === 'success' && scanResult && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h3 className="font-bold text-lg text-success">Xác thực thành công!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Độ tin cậy: {(scanResult.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* Health Indicators from Retina */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-info" />
                Chỉ số sức khỏe mắt
              </h4>
              {Object.entries(scanResult.healthIndicators).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {key === 'eyeHealth' && 'Sức khỏe mắt'}
                      {key === 'bloodVesselClarity' && 'Độ rõ mạch máu'}
                      {key === 'pupilReactivity' && 'Phản xạ đồng tử'}
                      {key === 'scleraCondition' && 'Tình trạng củng mạc'}
                    </span>
                    <span className="font-medium">{value.toFixed(0)}%</span>
                  </div>
                  <Progress value={value} className="h-1.5" />
                </div>
              ))}
            </div>

            {/* Facial Health from 3D Scan */}
            <div className="bg-primary/5 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Scan className="h-4 w-4 text-primary" />
                Chỉ số từ Face 3D
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-lg font-bold text-primary">{scanResult.facialHealth.estimatedHeartRate.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Nhịp tim (BPM)</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-lg font-bold text-success">{scanResult.facialHealth.estimatedOxygenLevel.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">SpO2</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-lg font-bold text-warning">{scanResult.facialHealth.stressIndicators.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Stress</p>
                </div>
                <div className="text-center p-2 bg-background/50 rounded-lg">
                  <p className="text-lg font-bold text-info">{scanResult.facialHealth.hydrationLevel.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Độ ẩm da</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Mã sinh trắc: <code className="text-primary">{scanResult.irisPattern}</code>
            </p>
          </div>
        )}

        {/* Failed Phase */}
        {phase === 'failed' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-destructive">Xác thực thất bại</h3>
              <p className="text-sm text-muted-foreground">
                Không thể xác minh mẫu mống mắt. Vui lòng thử lại.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {cameraError && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {cameraError}
          </div>
        )}

        {/* Progress Bar */}
        {phase === 'scanning' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Đang quét...</span>
              <span className="font-medium text-info">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {phase === 'init' && (
            <Button 
              onClick={startCamera}
              className="flex-1 bg-gradient-to-r from-info to-primary hover:opacity-90"
            >
              <Camera className="h-4 w-4 mr-2" />
              Bật Camera
            </Button>
          )}

          {phase === 'camera' && (
            <Button 
              onClick={startScan}
              disabled={!eyeDetected}
              className="flex-1 bg-gradient-to-r from-info to-primary hover:opacity-90"
            >
              <Scan className="h-4 w-4 mr-2" />
              Bắt đầu quét
            </Button>
          )}

          {phase === 'failed' && (
            <Button 
              onClick={startCamera}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          )}

          {onCancel && phase !== 'success' && (
            <Button 
              variant="outline" 
              onClick={() => {
                stopCamera();
                onCancel();
              }}
            >
              Hủy
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
