import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Share2, QrCode, MapPin, Users, 
  Shield, Heart, AlertTriangle, 
  Link2, Unlink, Scan, Copy, Check, 
  Navigation, RefreshCw, Wifi, Clock, Eye
} from 'lucide-react';
import { useTwinSharing, SharedTwin } from '@/hooks/useTwinSharing';
import { useTwinAccessAgent } from '@/hooks/useTwinAccessAgent';
import { QRScannerModal } from './QRScannerModal';
import type { UserHealthProfile } from '@/pages/BioVault';
import { toast } from 'sonner';

interface TwinSharingHubProps {
  profile: UserHealthProfile | null;
}

export const TwinSharingHub: React.FC<TwinSharingHubProps> = ({ profile }) => {
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    isSharing,
    sharingCode,
    connectedTwins,
    myLocation,
    startSharing,
    stopSharing,
    joinSession
  } = useTwinSharing(profile);

  const {
    isLoading: isAccessLoading,
    currentSession,
    createSession,
    activateSession,
    revokeSession,
    getTimeRemaining
  } = useTwinAccessAgent();

  // Generate QR Code using canvas
  useEffect(() => {
    if (sharingCode && qrCanvasRef.current) {
      generateQRCode(sharingCode, qrCanvasRef.current);
    }
  }, [sharingCode]);

  // Update time remaining
  useEffect(() => {
    if (!currentSession?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTime = () => {
      const remaining = getTimeRemaining(currentSession.expiresAt);
      setTimeRemaining(remaining);
      
      if (!remaining) {
        toast.warning('Phiên chia sẻ đã hết hạn');
        stopSharing();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentSession?.expiresAt, getTimeRemaining, stopSharing]);

  const generateQRCode = (code: string, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;
    
    // Create QR-like pattern (simplified representation)
    const moduleSize = size / 25;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Create data pattern from code
    const data = code.split('').map(c => c.charCodeAt(0));
    ctx.fillStyle = '#000000';
    
    // Position patterns (corners)
    const drawFinderPattern = (x: number, y: number) => {
      const s = moduleSize * 7;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + moduleSize, y + moduleSize, s - moduleSize * 2, s - moduleSize * 2);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
    };
    
    drawFinderPattern(moduleSize * 2, moduleSize * 2);
    ctx.fillStyle = '#000000';
    drawFinderPattern(size - moduleSize * 9, moduleSize * 2);
    ctx.fillStyle = '#000000';
    drawFinderPattern(moduleSize * 2, size - moduleSize * 9);
    
    // Data modules (pseudorandom based on code)
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const idx = (i * 10 + j) % data.length;
        if ((data[idx] + i + j) % 3 === 0) {
          ctx.fillRect(
            moduleSize * (10 + i),
            moduleSize * (10 + j),
            moduleSize,
            moduleSize
          );
        }
      }
    }
    
    // Add code text
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(code, size / 2, size - 10);
  };

  const copyCode = () => {
    if (sharingCode) {
      navigator.clipboard.writeText(sharingCode);
      setCopied(true);
      toast.success('Đã sao chép mã');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length === 6) {
      // First validate via access agent
      const session = await activateSession(joinCode);
      if (session) {
        // Then join the realtime session
        const success = await joinSession(joinCode);
        if (success) {
          setJoinCode('');
        }
      }
    }
  };

  const handleStartSharing = async () => {
    if (!profile) {
      toast.error('Vui lòng đăng nhập trước');
      return;
    }

    // Create access session first
    const result = await createSession(profile.id, ['location', 'healthSummary', 'bioShield']);
    if (result) {
      // Then start realtime sharing
      await startSharing();
    }
  };

  const handleStopSharing = async () => {
    if (currentSession) {
      await revokeSession(currentSession.sessionCode);
    }
    await stopSharing();
  };

  const handleQRScanned = async (code: string) => {
    setShowScanner(false);
    setJoinCode(code);
    
    // Auto-join after scanning
    const session = await activateSession(code);
    if (session) {
      const success = await joinSession(code);
      if (success) {
        setJoinCode('');
      }
    }
  };

  const getRiskBadge = (level: SharedTwin['healthSummary']['riskLevel']) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-danger text-danger-foreground">Rủi ro cao</Badge>;
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground">Cần chú ý</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground">Khỏe mạnh</Badge>;
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <Card className="border-2 border-info/20 bg-gradient-to-br from-info/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-info" />
              {t('biovault.sharing.title', 'Chia sẻ Digital Twin')}
            </CardTitle>
            <CardDescription>
              {t('biovault.sharing.description', 'Kết nối và theo dõi vị trí, sức khỏe của người thân')}
            </CardDescription>
          </div>
          
          {isSharing && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 animate-pulse">
              <Wifi className="h-3 w-3 mr-1" />
              Đang chia sẻ
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isSharing ? (
          /* Not Sharing - Show Options */
          <Tabs defaultValue="create" className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="create" className="gap-2">
                <QrCode className="h-4 w-4" />
                Tạo phiên
              </TabsTrigger>
              <TabsTrigger value="join" className="gap-2">
                <Scan className="h-4 w-4" />
                Tham gia
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 border border-primary/20">
                  <Share2 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Tạo phiên chia sẻ mới</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo mã QR để người khác quét và xem vị trí, sức khỏe của bạn
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={handleStartSharing} 
                      className="w-full gap-2"
                      disabled={isAccessLoading}
                    >
                      <QrCode className="h-4 w-4" />
                      {isAccessLoading ? 'Đang tạo...' : 'Tạo mã QR chia sẻ'}
                    </Button>
                  </div>

                  {/* Security note */}
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    <Shield className="h-3 w-3 inline mr-1" />
                    Mã QR không chứa dữ liệu y tế. Phiên có hiệu lực 30 phút.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nhập mã 6 ký tự</label>
                  <div className="flex gap-2">
                    <Input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="VD: ABC123"
                      className="font-mono text-lg tracking-widest text-center"
                      maxLength={6}
                    />
                    <Button 
                      onClick={handleJoin}
                      disabled={joinCode.length !== 6}
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">hoặc</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={() => setShowScanner(true)}
                  disabled={isAccessLoading}
                >
                  <Scan className="h-4 w-4" />
                  Quét mã QR
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Currently Sharing */
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
                <canvas 
                  ref={qrCanvasRef} 
                  className="mx-auto"
                  style={{ width: 200, height: 200 }}
                />
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="font-mono text-2xl tracking-[0.3em] font-bold text-primary">
                  {sharingCode}
                </div>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Chia sẻ mã này để người khác kết nối với bạn
              </p>

              {/* Session info */}
              {currentSession && (
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeRemaining ? (
                      <span>{timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}</span>
                    ) : (
                      <span>Hết hạn</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{currentSession.remainingAccesses} lượt còn lại</span>
                  </div>
                </div>
              )}
            </div>

            {/* My Location */}
            {myLocation && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Vị trí của bạn</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Live
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connected Twins */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />
                  Đã kết nối ({connectedTwins.length})
                </h4>
              </div>

              {connectedTwins.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Chưa có ai kết nối. Chia sẻ mã QR hoặc mã 6 ký tự!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {connectedTwins.map((twin) => (
                    <Card key={twin.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar & Connection Type */}
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center">
                              <span className="text-lg font-bold text-white">
                                {twin.name.slice(-2)}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                              <QrCode className="h-3 w-3 text-primary" />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{twin.name}</span>
                              {getRiskBadge(twin.healthSummary.riskLevel)}
                            </div>

                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="font-mono text-xs">
                                {twin.location.lat.toFixed(4)}, {twin.location.lng.toFixed(4)}
                              </span>
                              {myLocation && (
                                <Badge variant="secondary" className="text-xs">
                                  {calculateDistance(
                                    myLocation.lat, myLocation.lng,
                                    twin.location.lat, twin.location.lng
                                  ).toFixed(1)} km
                                </Badge>
                              )}
                            </div>

                            {/* Health Summary */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                                <Shield className="h-3.5 w-3.5 text-primary" />
                                <span>Bio-Shield: {twin.healthSummary.bioShieldScore}%</span>
                              </div>
                              {twin.healthSummary.bloodType && (
                                <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
                                  <Heart className="h-3.5 w-3.5 text-danger" />
                                  <span>Máu: {twin.healthSummary.bloodType}</span>
                                </div>
                              )}
                            </div>

                            {/* Conditions */}
                            {twin.healthSummary.chronicConditions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {twin.healthSummary.chronicConditions.slice(0, 2).map((condition, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1 text-warning" />
                                    {condition}
                                  </Badge>
                                ))}
                                {twin.healthSummary.chronicConditions.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{twin.healthSummary.chronicConditions.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bio-Shield Progress */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Bio-Shield Index</span>
                            <span className="font-medium">{twin.healthSummary.bioShieldScore}%</span>
                          </div>
                          <Progress 
                            value={twin.healthSummary.bioShieldScore} 
                            className="h-1.5"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Disconnect Button */}
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={handleStopSharing}
              disabled={isAccessLoading}
            >
              <Unlink className="h-4 w-4" />
              Ngắt kết nối chia sẻ
            </Button>
          </div>
        )}

      </CardContent>

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={showScanner}
        onOpenChange={setShowScanner}
        onCodeScanned={handleQRScanned}
      />
    </Card>
  );
};
