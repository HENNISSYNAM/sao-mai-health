import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import QrScanner from 'qr-scanner';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, QrCode, Wifi, WifiOff, User, MapPin, Phone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface QRCheckInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: any[];
  onSuccess: () => void;
}

interface OfflineCheckIn {
  id: string;
  campaign_id: string;
  participant_name: string;
  ward: string;
  phone: string;
  timestamp: string;
}

export function QRCheckIn({ open, onOpenChange, campaigns, onSuccess }: QRCheckInProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [manualCheckIn, setManualCheckIn] = useState({
    name: '',
    ward: '',
    phone: ''
  });
  const [offlineQueue, setOfflineQueue] = useState<OfflineCheckIn[]>([]);
  const [generatedQR, setGeneratedQR] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('campaign-checkin-queue');
    if (saved) {
      setOfflineQueue(JSON.parse(saved));
    }
  }, []);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      setIsScanning(true);
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleQRScan(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      await qrScannerRef.current.start();
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Lỗi camera",
        description: "Không thể truy cập camera",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRScan = async (qrData: string) => {
    try {
      // Parse QR data (expecting JSON with participant info)
      const data = JSON.parse(qrData);
      
      if (data.type === 'campaign-checkin' && data.campaign_id && data.participant_name) {
        await processCheckIn({
          campaign_id: data.campaign_id,
          participant_name: data.participant_name,
          ward: data.ward || '',
          phone: data.phone || ''
        });
        stopCamera();
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      toast({
        title: "QR không hợp lệ",
        description: "Mã QR không đúng định dạng check-in",
        variant: "destructive",
      });
    }
  };

  const processCheckIn = async (checkInData: {
    campaign_id: string;
    participant_name: string;
    ward: string;
    phone: string;
  }) => {
    if (isOnline) {
      try {
        const { error } = await supabase
          .from('campaign_checkins')
          .insert({
            campaign_id: checkInData.campaign_id,
            participant_name: checkInData.participant_name,
            ward: checkInData.ward,
            phone: checkInData.phone,
            check_in_time: new Date().toISOString(),
            offline_sync: false
          });

        if (error) throw error;

        toast({
          title: "Check-in thành công",
          description: `${checkInData.participant_name} đã check-in thành công`,
        });
        
        onSuccess();
      } catch (error) {
        console.error('Error saving check-in:', error);
        // Save to offline queue if online save fails
        saveToOfflineQueue(checkInData);
      }
    } else {
      // Save to offline queue
      saveToOfflineQueue(checkInData);
    }
  };

  const saveToOfflineQueue = (checkInData: {
    campaign_id: string;
    participant_name: string;
    ward: string;
    phone: string;
  }) => {
    const offlineCheckIn: OfflineCheckIn = {
      id: Date.now().toString(),
      ...checkInData,
      timestamp: new Date().toISOString()
    };

    const newQueue = [...offlineQueue, offlineCheckIn];
    setOfflineQueue(newQueue);
    localStorage.setItem('campaign-checkin-queue', JSON.stringify(newQueue));

    toast({
      title: "Check-in offline",
      description: `${checkInData.participant_name} đã check-in offline. Sẽ đồng bộ khi có mạng.`,
    });
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    try {
      const syncPromises = offlineQueue.map(async (checkIn) => {
        const { error } = await supabase
          .from('campaign_checkins')
          .insert({
            campaign_id: checkIn.campaign_id,
            participant_name: checkIn.participant_name,
            ward: checkIn.ward,
            phone: checkIn.phone,
            check_in_time: checkIn.timestamp,
            offline_sync: true
          });

        if (error) throw error;
        return checkIn.id;
      });

      await Promise.all(syncPromises);
      
      // Clear offline queue
      setOfflineQueue([]);
      localStorage.removeItem('campaign-checkin-queue');
      
      toast({
        title: "Đồng bộ thành công",
        description: `Đã đồng bộ ${offlineQueue.length} check-in offline`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error syncing offline queue:', error);
      toast({
        title: "Lỗi đồng bộ",
        description: "Không thể đồng bộ dữ liệu offline",
        variant: "destructive",
      });
    }
  };

  const handleManualCheckIn = async () => {
    if (!selectedCampaign || !manualCheckIn.name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn chiến dịch và nhập tên người tham gia",
        variant: "destructive",
      });
      return;
    }

    await processCheckIn({
      campaign_id: selectedCampaign,
      participant_name: manualCheckIn.name,
      ward: manualCheckIn.ward,
      phone: manualCheckIn.phone
    });

    // Reset form
    setManualCheckIn({ name: '', ward: '', phone: '' });
  };

  const generateQRCode = async () => {
    if (!selectedCampaign || !manualCheckIn.name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn chiến dịch và nhập tên người tham gia",
        variant: "destructive",
      });
      return;
    }

    try {
      const qrData = {
        type: 'campaign-checkin',
        campaign_id: selectedCampaign,
        participant_name: manualCheckIn.name,
        ward: manualCheckIn.ward,
        phone: manualCheckIn.phone,
        timestamp: new Date().toISOString()
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
      setGeneratedQR(qrCodeDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Lỗi tạo QR",
        description: "Không thể tạo mã QR",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) stopCamera();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Check-in
            <div className="flex items-center gap-1 ml-auto">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm text-muted-foreground">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            Quét mã QR hoặc nhập thông tin thủ công để check-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Selection */}
          <div>
            <Label>Chọn chiến dịch</Label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chiến dịch" />
              </SelectTrigger>
              <SelectContent>
                {campaigns
                  .filter(c => c.status === 'ongoing' || c.status === 'scheduled')
                  .map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QR Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quét mã QR</CardTitle>
            </CardHeader>
            <CardContent>
              {!isScanning ? (
                <div className="text-center">
                  <Button onClick={startCamera} disabled={!selectedCampaign}>
                    <Camera className="h-4 w-4 mr-2" />
                    Bắt đầu quét
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    className="w-full max-w-sm mx-auto border rounded"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="text-center">
                    <Button onClick={stopCamera} variant="outline">
                      Dừng quét
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Check-in */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Check-in thủ công</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên người tham gia *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={manualCheckIn.name}
                      onChange={(e) => setManualCheckIn({...manualCheckIn, name: e.target.value})}
                      placeholder="Nhập tên"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ward">Phường</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ward"
                      value={manualCheckIn.ward}
                      onChange={(e) => setManualCheckIn({...manualCheckIn, ward: e.target.value})}
                      placeholder="Phường"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={manualCheckIn.phone}
                    onChange={(e) => setManualCheckIn({...manualCheckIn, phone: e.target.value})}
                    placeholder="Số điện thoại"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleManualCheckIn} disabled={!selectedCampaign || !manualCheckIn.name.trim()}>
                  Check-in ngay
                </Button>
                <Button onClick={generateQRCode} variant="outline" disabled={!selectedCampaign || !manualCheckIn.name.trim()}>
                  Tạo mã QR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated QR Code */}
          {generatedQR && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mã QR được tạo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img src={generatedQR} alt="Generated QR Code" className="mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Người tham gia có thể sử dụng mã QR này để check-in
                </p>
              </CardContent>
            </Card>
          )}

          {/* Offline Queue */}
          {offlineQueue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-orange-600">
                  Hàng đợi offline ({offlineQueue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {offlineQueue.map((checkIn) => (
                    <div key={checkIn.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <div>
                        <div className="font-medium">{checkIn.participant_name}</div>
                        <div className="text-xs text-muted-foreground">{checkIn.ward}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(checkIn.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                {isOnline && (
                  <Button onClick={syncOfflineQueue} className="w-full mt-4">
                    Đồng bộ ngay
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}