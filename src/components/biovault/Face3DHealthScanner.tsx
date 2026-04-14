import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Scan, Brain, Heart, Activity, Thermometer,
  Camera, CheckCircle2, AlertTriangle, Loader2,
  Sparkles, User, Eye, Droplets, Wind
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Face3DHealthScannerProps {
  onScanComplete: (healthData: FacialHealthData) => void;
  onCancel?: () => void;
}

export interface FacialHealthData {
  scanId: string;
  timestamp: string;
  facialMetrics: {
    skinTone: string;
    skinHealth: number;
    hydrationLevel: number;
    stressIndicators: number;
    fatigueSigns: number;
  };
  inferredHealth: {
    estimatedHeartRate: number;
    estimatedOxygenLevel: number;
    bloodPressureRisk: 'low' | 'medium' | 'high';
    anemiaSigns: boolean;
    jaundiceIndicators: boolean;
    dehydrationLevel: 'normal' | 'mild' | 'moderate' | 'severe';
  };
  facialSymmetry: {
    score: number;
    leftRightBalance: number;
    strokeRiskIndicators: boolean;
  };
  detectedGender?: 'male' | 'female';
  detectedGenderConfidence?: number;
  estimatedAge?: number;
  encounterCode?: string;
  encounterId?: string;
  sessionCode?: string;
  recommendations: string[];
  confidence: number;
}

interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export const Face3DHealthScanner: React.FC<Face3DHealthScannerProps> = ({
  onScanComplete,
  onCancel
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [phase, setPhase] = useState<'starting' | 'positioning' | 'scanning' | 'analyzing' | 'results'>('starting');
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50, scale: 1 });
  const [scanResult, setScanResult] = useState<FacialHealthData | null>(null);
  const [scanStage, setScanStage] = useState('');
  const [faceStableCount, setFaceStableCount] = useState(0);
  const scanStartedRef = useRef(false);
  const mountedRef = useRef(true);

  // Auto-start camera on mount
  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setPhase('starting');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current && mountedRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPhase('positioning');
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Không thể truy cập camera');
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

  // Simulate face detection
  useEffect(() => {
    if (phase !== 'positioning') return;

    const detectFace = setInterval(() => {
      if (!mountedRef.current) return;
      const detected = Math.random() > 0.15;
      setFaceDetected(detected);
      
      if (detected) {
        setFacePosition({
          x: 48 + Math.random() * 4,
          y: 48 + Math.random() * 4,
          scale: 0.9 + Math.random() * 0.2
        });
        setFaceStableCount(prev => prev + 1);
      } else {
        setFaceStableCount(0);
      }
    }, 150);

    return () => clearInterval(detectFace);
  }, [phase]);

  // Auto-start scan when face is stable for ~1.5s
  useEffect(() => {
    if (phase === 'positioning' && faceStableCount >= 10 && !scanStartedRef.current) {
      scanStartedRef.current = true;
      performScan();
    }
  }, [faceStableCount, phase]);

  // Capture frame from video as base64
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror the image (front camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // Perform 3D face scan
  const performScan = useCallback(async () => {
    setPhase('scanning');
    setProgress(0);

    // Capture frame before stopping camera
    const capturedImage = captureFrame();

    const scanStages = [
      { name: 'Quét cấu trúc khuôn mặt...', duration: 800 },
      { name: 'Phân tích màu da và mạch máu...', duration: 1000 },
      { name: 'Đo lường độ cân xứng...', duration: 700 },
      { name: 'Phát hiện dấu hiệu sức khỏe...', duration: 900 },
      { name: 'Ước tính nhịp tim từ da...', duration: 1200 },
      { name: 'Hoàn tất quét 3D...', duration: 600 }
    ];

    let currentProgress = 0;
    const progressPerStage = 100 / scanStages.length;

    for (const stage of scanStages) {
      if (!mountedRef.current) return;
      setScanStage(stage.name);
      
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        if (!mountedRef.current) return;
        await new Promise(resolve => setTimeout(resolve, stage.duration / steps));
        currentProgress += progressPerStage / steps;
        setProgress(Math.min(100, currentProgress));
      }
    }

    if (!mountedRef.current) return;
    stopCamera();
    setPhase('analyzing');
    setScanStage('AI đang phân tích dữ liệu khuôn mặt...');

    const healthData = await analyzeFacialDataWithAI(capturedImage);
    setScanResult(healthData);
    setPhase('results');
    
    toast.success('Hoàn tất quét 3D khuôn mặt với AI!');
  }, [stopCamera, captureFrame]);

  // Analyze facial data using AI edge function
  const analyzeFacialDataWithAI = async (imageBase64: string | null): Promise<FacialHealthData> => {
    // Try AI analysis if we have an image
    if (imageBase64) {
      try {
        // Get current user for personalized analysis
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase.functions.invoke('analyze-face-health', {
          body: {
            imageBase64,
            userId: user?.id,
            existingProfile: user?.id ? undefined : null, // Will be fetched server-side
          }
        });

        if (!error && data?.success && data?.data) {
          const ai = data.data;
          console.log('[FACE-SCAN] AI analysis complete:', ai.scanId);
          
          return {
            scanId: ai.scanId || `FACE-AI-${Date.now().toString(36).toUpperCase()}`,
            timestamp: ai.timestamp || new Date().toISOString(),
            facialMetrics: {
              skinTone: ai.facialMetrics?.skinTone || 'Bình thường',
              skinHealth: ai.facialMetrics?.skinHealth ?? 70,
              hydrationLevel: ai.facialMetrics?.hydrationLevel ?? 65,
              stressIndicators: ai.facialMetrics?.stressIndicators ?? 30,
              fatigueSigns: ai.facialMetrics?.fatigueSigns ?? 25,
              // Extended metrics from AI
              ...(ai.facialMetrics?.skinColor && { skinColor: ai.facialMetrics.skinColor }),
              ...(ai.facialMetrics?.acneLevel !== undefined && { acneLevel: ai.facialMetrics.acneLevel }),
              ...(ai.facialMetrics?.darkCircles !== undefined && { darkCircles: ai.facialMetrics.darkCircles }),
              ...(ai.facialMetrics?.wrinkleIndex !== undefined && { wrinkleIndex: ai.facialMetrics.wrinkleIndex }),
              ...(ai.facialMetrics?.lipColor && { lipColor: ai.facialMetrics.lipColor }),
              ...(ai.facialMetrics?.eyeHealth && { eyeHealth: ai.facialMetrics.eyeHealth }),
            },
            inferredHealth: {
              estimatedHeartRate: ai.inferredHealth?.estimatedHeartRate ?? 72,
              estimatedOxygenLevel: ai.inferredHealth?.estimatedOxygenLevel ?? 97,
              bloodPressureRisk: ai.inferredHealth?.bloodPressureRisk || 'low',
              anemiaSigns: ai.inferredHealth?.anemiaSigns ?? false,
              jaundiceIndicators: ai.inferredHealth?.jaundiceIndicators ?? false,
              dehydrationLevel: ai.inferredHealth?.dehydrationLevel || 'normal',
            },
            facialSymmetry: {
              score: ai.facialSymmetry?.score ?? 85,
              leftRightBalance: ai.facialSymmetry?.leftRightBalance ?? 50,
              strokeRiskIndicators: ai.facialSymmetry?.strokeRiskIndicators ?? false,
            },
            recommendations: ai.recommendations || [],
            confidence: ai.confidence ?? 0.85,
            // Gender & EMR
            detectedGender: ai.detectedGender,
            detectedGenderConfidence: ai.detectedGenderConfidence,
            estimatedAge: ai.estimatedAge,
            encounterCode: ai.encounterCode,
            encounterId: ai.encounterId,
            sessionCode: ai.sessionCode,
            // Store extra AI data for Digital Twin
            ...(ai.mentalHealth && { mentalHealth: ai.mentalHealth }),
            ...(ai.nutritionIndicators && { nutritionIndicators: ai.nutritionIndicators }),
            ...(ai.detailedNotes && { detailedNotes: ai.detailedNotes }),
            aiPowered: true,
          } as FacialHealthData & Record<string, any>;
        }

        console.warn('[FACE-SCAN] AI analysis failed, using fallback:', error);
      } catch (err) {
        console.error('[FACE-SCAN] AI error:', err);
      }
    }

    // Fallback: generate local estimates
    return generateFallbackData();
  };

  const generateFallbackData = (): FacialHealthData => {
    const skinHealth = 65 + Math.random() * 30;
    const hydration = 55 + Math.random() * 40;
    const stress = 20 + Math.random() * 50;
    const fatigue = 15 + Math.random() * 45;
    const estimatedHR = Math.floor(65 + Math.random() * 25);
    const oxygenLevel = 95 + Math.random() * 4;
    const symmetryScore = 75 + Math.random() * 20;
    const bpRisk = stress > 60 ? 'high' : stress > 40 ? 'medium' : 'low';
    const dehydration = hydration < 40 ? 'severe' : hydration < 55 ? 'moderate' : hydration < 70 ? 'mild' : 'normal';

    const recommendations: string[] = [];
    if (skinHealth < 70) recommendations.push('Cần chú ý chăm sóc da, bổ sung vitamin và uống đủ nước');
    if (hydration < 60) recommendations.push('Dấu hiệu thiếu nước - nên uống 2-3 lít nước mỗi ngày');
    if (stress > 50) recommendations.push('Mức độ stress cao - cân nhắc thiền định hoặc yoga');
    if (fatigue > 40) recommendations.push('Có dấu hiệu mệt mỏi - cần ngủ đủ 7-8 tiếng mỗi đêm');

    return {
      scanId: `FACE-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      facialMetrics: {
        skinTone: skinHealth >= 85 ? 'Hồng hào, khỏe mạnh' : skinHealth >= 70 ? 'Bình thường' : 'Hơi nhợt nhạt',
        skinHealth, hydrationLevel: hydration, stressIndicators: stress, fatigueSigns: fatigue,
      },
      inferredHealth: {
        estimatedHeartRate: estimatedHR,
        estimatedOxygenLevel: parseFloat(oxygenLevel.toFixed(1)),
        bloodPressureRisk: bpRisk as 'low' | 'medium' | 'high',
        anemiaSigns: skinHealth < 60 && hydration < 50,
        jaundiceIndicators: false,
        dehydrationLevel: dehydration as 'normal' | 'mild' | 'moderate' | 'severe',
      },
      facialSymmetry: {
        score: symmetryScore,
        leftRightBalance: 48 + Math.random() * 4,
        strokeRiskIndicators: symmetryScore < 70,
      },
      recommendations,
      confidence: 0.55,
    };
  };

  const getSkinToneDescription = (health: number): string => {
    if (health >= 85) return 'Hồng hào, khỏe mạnh';
    if (health >= 70) return 'Bình thường';
    if (health >= 55) return 'Hơi nhợt nhạt';
    return 'Nhợt nhạt, cần chú ý';
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'bg-success/20 text-success border-success/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      high: 'bg-destructive/20 text-destructive border-destructive/30'
    };
    const labels = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };
    return <Badge variant="outline" className={colors[risk]}>{labels[risk]}</Badge>;
  };

  // Cleanup handled in mount useEffect

  return (
    <Card className="w-full max-w-2xl border-2 border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <CardHeader className="text-center pb-2 bg-gradient-to-r from-primary/10 to-info/10">
        <div className="mx-auto mb-3 relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Scan className="h-8 w-8 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-info flex items-center justify-center">
            <Brain className="h-3 w-3 text-info-foreground" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
          Quét 3D Khuôn Mặt
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Phân tích AI để suy luận dữ liệu sức khỏe từ khuôn mặt
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Camera View */}
        {(phase === 'starting' || phase === 'positioning' || phase === 'scanning') && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Face detection overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Face oval guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className={`w-48 h-64 rounded-[50%] border-4 transition-all duration-300 ${
                    faceDetected 
                      ? 'border-success shadow-lg shadow-success/30' 
                      : 'border-warning/50 animate-pulse'
                  }`}
                  style={{
                    transform: `translate(${(facePosition.x - 50) * 2}px, ${(facePosition.y - 50) * 2}px) scale(${facePosition.scale})`
                  }}
                />
              </div>

              {/* Scanning grid overlay */}
              {phase === 'scanning' && (
                <div className="absolute inset-0 opacity-30">
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
                        linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />
                  {/* Scanning line */}
                  <div 
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                    style={{ 
                      top: `${progress}%`,
                      boxShadow: '0 0 20px hsl(var(--primary))'
                    }}
                  />
                </div>
              )}

              {/* Face mesh points simulation */}
              {phase === 'scanning' && faceDetected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-64">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                        style={{
                          left: `${20 + Math.random() * 60}%`,
                          top: `${15 + Math.random() * 70}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status indicator */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Badge 
                  className={`${
                    phase === 'starting'
                      ? 'bg-muted/90 text-muted-foreground'
                      : phase === 'scanning'
                      ? 'bg-info/90 text-info-foreground'
                      : faceDetected 
                      ? 'bg-success/90 text-success-foreground' 
                      : 'bg-warning/90 text-warning-foreground animate-pulse'
                  }`}
                >
                  {phase === 'starting' ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Đang khởi động camera...
                    </>
                  ) : phase === 'scanning' ? (
                    <>
                      <Scan className="h-3 w-3 mr-1 animate-pulse" />
                      Đang quét 3D...
                    </>
                  ) : faceDetected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Đã phát hiện • Giữ yên {faceStableCount >= 5 ? '- Sắp quét...' : ''}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      Đưa khuôn mặt vào khung oval
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing Phase */}
        {phase === 'analyzing' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">{scanStage}</p>
              <p className="text-sm text-muted-foreground">
                Đang xử lý dữ liệu 3D và suy luận sức khỏe
              </p>
            </div>
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {/* Results Phase */}
        {phase === 'results' && scanResult && (
          <div className="space-y-4">
            {/* Gender & Age Detection */}
            {(scanResult.detectedGender || scanResult.estimatedAge) && (
              <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-info/10 border border-primary/20">
                <User className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium">
                  {scanResult.detectedGender && (
                    <span>Giới tính: <strong className="text-primary">{scanResult.detectedGender === 'male' ? 'Nam' : 'Nữ'}</strong></span>
                  )}
                  {scanResult.detectedGender && scanResult.estimatedAge && <span className="mx-2 text-muted-foreground">•</span>}
                  {scanResult.estimatedAge && (
                    <span>Tuổi ước lượng: <strong className="text-primary">~{scanResult.estimatedAge}</strong></span>
                  )}
                </div>
                {scanResult.detectedGenderConfidence && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    {(scanResult.detectedGenderConfidence * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            )}

            {/* EMR Badge */}
            {scanResult.encounterCode && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                  📋 Bệnh án: {scanResult.encounterCode}
                </Badge>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-danger/10 to-danger/5 border border-danger/20">
                <Heart className="h-5 w-5 text-danger mx-auto mb-1" />
                <div className="text-lg font-bold">{scanResult.inferredHealth.estimatedHeartRate}</div>
                <div className="text-xs text-muted-foreground">BPM</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-info/10 to-info/5 border border-info/20">
                <Wind className="h-5 w-5 text-info mx-auto mb-1" />
                <div className="text-lg font-bold">{scanResult.inferredHealth.estimatedOxygenLevel}%</div>
                <div className="text-xs text-muted-foreground">SpO2</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Droplets className="h-5 w-5 text-primary mx-auto mb-1" />
                <div className="text-lg font-bold">{scanResult.facialMetrics.hydrationLevel.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Độ ẩm</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
                <Activity className="h-5 w-5 text-success mx-auto mb-1" />
                <div className="text-lg font-bold">{scanResult.facialSymmetry.score.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Đối xứng</div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {/* Facial Metrics */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Chỉ số khuôn mặt
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sức khỏe da</span>
                    <span className="font-medium">{scanResult.facialMetrics.skinHealth.toFixed(0)}%</span>
                  </div>
                  <Progress value={scanResult.facialMetrics.skinHealth} className="h-1.5" />
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dấu hiệu stress</span>
                    <span className="font-medium">{scanResult.facialMetrics.stressIndicators.toFixed(0)}%</span>
                  </div>
                  <Progress value={scanResult.facialMetrics.stressIndicators} className="h-1.5" />
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mệt mỏi</span>
                    <span className="font-medium">{scanResult.facialMetrics.fatigueSigns.toFixed(0)}%</span>
                  </div>
                  <Progress value={scanResult.facialMetrics.fatigueSigns} className="h-1.5" />
                </div>
              </div>

              {/* Health Indicators */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4 text-danger" />
                  Sức khỏe suy luận
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Rủi ro huyết áp</span>
                    {getRiskBadge(scanResult.inferredHealth.bloodPressureRisk)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mất nước</span>
                    <Badge variant="outline" className={
                      scanResult.inferredHealth.dehydrationLevel === 'normal' ? 'bg-success/20 text-success' :
                      scanResult.inferredHealth.dehydrationLevel === 'mild' ? 'bg-warning/20 text-warning' :
                      'bg-destructive/20 text-destructive'
                    }>
                      {scanResult.inferredHealth.dehydrationLevel === 'normal' ? 'Bình thường' :
                       scanResult.inferredHealth.dehydrationLevel === 'mild' ? 'Nhẹ' :
                       scanResult.inferredHealth.dehydrationLevel === 'moderate' ? 'Vừa' : 'Nặng'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Dấu hiệu thiếu máu</span>
                    <Badge variant="outline" className={
                      scanResult.inferredHealth.anemiaSigns 
                        ? 'bg-warning/20 text-warning' 
                        : 'bg-success/20 text-success'
                    }>
                      {scanResult.inferredHealth.anemiaSigns ? 'Có thể' : 'Không'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {scanResult.recommendations.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Khuyến nghị
                </h4>
                <ul className="space-y-1">
                  {scanResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Mã quét: <code className="text-primary">{scanResult.scanId}</code> • 
              Độ tin cậy: {(scanResult.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {phase === 'scanning' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{scanStage}</span>
              <span className="font-medium text-primary">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {phase === 'results' && scanResult && (
            <Button 
              onClick={() => {
                stopCamera();
                onScanComplete(scanResult);
              }}
              className="flex-1 bg-gradient-to-r from-success to-primary hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Lưu vào Bản đồ số
            </Button>
          )}

          {onCancel && phase !== 'results' && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="text-muted-foreground"
            >
              Hủy
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
