import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scan, Camera, CameraOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { toast } from 'sonner';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeScanned: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onOpenChange,
  onCodeScanned
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanResult, setScanResult] = useState<{ code: string; valid: boolean } | null>(null);

  useEffect(() => {
    if (open && videoRef.current && !scannerRef.current) {
      initScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [open]);

  const initScanner = async () => {
    if (!videoRef.current) return;

    try {
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);

      if (!hasCamera) {
        toast.error('Không tìm thấy camera');
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setIsScanning(true);
      console.log('[QR-SCANNER] Scanner started');
    } catch (error) {
      console.error('[QR-SCANNER] Error:', error);
      setHasCamera(false);
      toast.error('Không thể khởi động camera');
    }
  };

  const handleScanResult = (data: string) => {
    console.log('[QR-SCANNER] Scanned:', data);

    // Parse QR data - expecting format: TWIN_ACCESS:CODE or just CODE
    let code = data;
    
    try {
      // Try JSON format first
      const parsed = JSON.parse(data);
      if (parsed.code && parsed.type === 'TWIN_ACCESS') {
        code = parsed.code;
      }
    } catch {
      // Not JSON, check for prefix format
      if (data.startsWith('TWIN_ACCESS:')) {
        code = data.replace('TWIN_ACCESS:', '');
      }
    }

    // Validate code format (6 alphanumeric characters)
    const isValidFormat = /^[A-Z0-9]{6}$/.test(code.toUpperCase());
    
    setScanResult({ code: code.toUpperCase(), valid: isValidFormat });

    if (isValidFormat) {
      // Stop scanner and notify parent
      if (scannerRef.current) {
        scannerRef.current.stop();
        setIsScanning(false);
      }
      
      toast.success('Đã quét mã thành công!');
      
      // Brief delay to show success state
      setTimeout(() => {
        onCodeScanned(code.toUpperCase());
        onOpenChange(false);
        setScanResult(null);
      }, 500);
    } else {
      toast.error('Mã QR không hợp lệ');
    }
  };

  const restartScanner = async () => {
    setScanResult(null);
    if (scannerRef.current) {
      await scannerRef.current.start();
      setIsScanning(true);
    } else {
      await initScanner();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Quét mã QR Digital Twin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner viewport */}
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner markers */}
                  <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse top-1/2" />
                  )}
                </div>

                {/* Status indicator */}
                <div className="absolute bottom-4 inset-x-0 flex justify-center">
                  <Badge 
                    variant="secondary" 
                    className={`${isScanning ? 'bg-success/90 text-success-foreground' : 'bg-muted/90'}`}
                  >
                    {isScanning ? (
                      <>
                        <Camera className="h-3 w-3 mr-1 animate-pulse" />
                        Đang quét...
                      </>
                    ) : (
                      <>
                        <CameraOff className="h-3 w-3 mr-1" />
                        Đã dừng
                      </>
                    )}
                  </Badge>
                </div>

                {/* Scan result overlay */}
                {scanResult && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      {scanResult.valid ? (
                        <>
                          <CheckCircle2 className="h-16 w-16 text-success mx-auto animate-pulse" />
                          <p className="text-white font-medium">Mã hợp lệ!</p>
                          <p className="text-2xl font-mono text-primary">{scanResult.code}</p>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-16 w-16 text-danger mx-auto" />
                          <p className="text-white font-medium">Mã không hợp lệ</p>
                          <Button variant="outline" size="sm" onClick={restartScanner}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Quét lại
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white/70 space-y-4">
                <CameraOff className="h-16 w-16" />
                <p className="text-center">Camera không khả dụng</p>
                <Button variant="outline" onClick={initScanner}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Thử lại
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Hướng camera vào mã QR của Digital Twin</p>
            <p className="text-xs">Mã sẽ tự động được nhận dạng</p>
          </div>

          {/* Manual input hint */}
          <p className="text-xs text-center text-muted-foreground border-t pt-3">
            Hoặc nhập mã thủ công 6 ký tự ở tab "Tham gia"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
