import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import QrScanner from 'qr-scanner';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Wifi, WifiOff, User, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { mockTxHash, shortHash } from '@/hooks/useMockChain';

interface OfflineCheckIn {
  id: string;
  campaign_id: string;
  participant_name: string;
  ward: string;
  phone: string;
  timestamp: string;
}

export interface QRCheckInPanelProps {
  /** "campaign" persists to DB + offline queue; "clinic" is a local mock ticket only. */
  mode?: 'campaign' | 'clinic';
  campaigns?: any[];
  onSuccess?: () => void;
}

export function QRCheckInPanel({ mode = 'campaign', campaigns = [], onSuccess }: QRCheckInPanelProps) {
  const { toast } = useToast();
  const isClinic = mode === 'clinic';

  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [manual, setManual] = useState({ name: '', ward: '', phone: '' });
  const [offlineQueue, setOfflineQueue] = useState<OfflineCheckIn[]>([]);
  const [generatedQR, setGeneratedQR] = useState('');
  const [clinicTicket, setClinicTicket] = useState<{ token: string; tx: string; name: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (isClinic) return;
    const saved = localStorage.getItem('campaign-checkin-queue');
    if (saved) setOfflineQueue(JSON.parse(saved));
  }, [isClinic]);

  useEffect(() => {
    if (!isClinic && isOnline && offlineQueue.length > 0) syncOfflineQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    if (!videoRef.current) return;
    try {
      setIsScanning(true);
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (r) => handleQRScan(r.data),
        { highlightScanRegion: true, highlightCodeOutline: true },
      );
      await qrScannerRef.current.start();
    } catch (e) {
      console.error(e);
      toast({ title: 'Lỗi camera', description: 'Không thể truy cập camera', variant: 'destructive' });
      setIsScanning(false);
    }
  }

  function stopCamera() {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  }

  async function handleQRScan(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (isClinic) {
        await mintClinicTicket(data.participant_name || data.name || 'Khách');
        stopCamera();
        return;
      }
      if (data.type === 'campaign-checkin' && data.campaign_id && data.participant_name) {
        await processCheckIn({
          campaign_id: data.campaign_id,
          participant_name: data.participant_name,
          ward: data.ward || '',
          phone: data.phone || '',
        });
        stopCamera();
      } else throw new Error('Invalid');
    } catch {
      toast({ title: 'QR không hợp lệ', description: 'Mã QR không đúng định dạng', variant: 'destructive' });
    }
  }

  async function mintClinicTicket(name: string) {
    const tx = await mockTxHash({ name, ts: Date.now() });
    const token = 'A-' + Math.floor(Math.random() * 90 + 10);
    setClinicTicket({ token, tx, name });
    toast({ title: 'Check-in thành công', description: `Số thứ tự ${token}` });
  }

  async function processCheckIn(data: any) {
    if (isOnline) {
      try {
        const { error } = await supabase.from('campaign_checkins').insert({
          ...data,
          check_in_time: new Date().toISOString(),
          offline_sync: false,
        });
        if (error) throw error;
        toast({ title: 'Check-in thành công', description: `${data.participant_name}` });
        onSuccess?.();
      } catch (e) {
        console.error(e);
        saveOffline(data);
      }
    } else saveOffline(data);
  }

  function saveOffline(data: any) {
    const item: OfflineCheckIn = { id: Date.now().toString(), ...data, timestamp: new Date().toISOString() };
    const next = [...offlineQueue, item];
    setOfflineQueue(next);
    localStorage.setItem('campaign-checkin-queue', JSON.stringify(next));
    toast({ title: 'Check-in offline', description: 'Sẽ đồng bộ khi có mạng' });
  }

  async function syncOfflineQueue() {
    if (offlineQueue.length === 0) return;
    try {
      await Promise.all(offlineQueue.map((c) => supabase.from('campaign_checkins').insert({
        campaign_id: c.campaign_id, participant_name: c.participant_name, ward: c.ward,
        phone: c.phone, check_in_time: c.timestamp, offline_sync: true,
      })));
      setOfflineQueue([]);
      localStorage.removeItem('campaign-checkin-queue');
      toast({ title: 'Đồng bộ thành công' });
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast({ title: 'Lỗi đồng bộ', variant: 'destructive' });
    }
  }

  async function handleManual() {
    if (!manual.name.trim() || (!isClinic && !selectedCampaign)) {
      toast({ title: 'Thiếu thông tin', variant: 'destructive' });
      return;
    }
    if (isClinic) { await mintClinicTicket(manual.name); setManual({ name: '', ward: '', phone: '' }); return; }
    await processCheckIn({ campaign_id: selectedCampaign, participant_name: manual.name, ward: manual.ward, phone: manual.phone });
    setManual({ name: '', ward: '', phone: '' });
  }

  async function generate() {
    if (!manual.name.trim() || (!isClinic && !selectedCampaign)) {
      toast({ title: 'Thiếu thông tin', variant: 'destructive' });
      return;
    }
    const payload = isClinic
      ? { type: 'clinic-checkin', participant_name: manual.name, ts: Date.now() }
      : { type: 'campaign-checkin', campaign_id: selectedCampaign, participant_name: manual.name, ward: manual.ward, phone: manual.phone };
    setGeneratedQR(await QRCode.toDataURL(JSON.stringify(payload)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {isOnline ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-rose-600" />}
        <span className="text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
        {isClinic && <Badge variant="outline" className="ml-auto">Sao Mai Chain · mock</Badge>}
      </div>

      {!isClinic && (
        <div>
          <Label>Chọn chiến dịch</Label>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger><SelectValue placeholder="Chọn chiến dịch" /></SelectTrigger>
            <SelectContent>
              {campaigns.filter((c) => c.status === 'ongoing' || c.status === 'scheduled').map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Quét mã QR</CardTitle></CardHeader>
        <CardContent>
          {!isScanning ? (
            <div className="text-center">
              <Button onClick={startCamera} disabled={!isClinic && !selectedCampaign}>
                <Camera className="h-4 w-4 mr-2" /> Bắt đầu quét
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <video ref={videoRef} className="w-full max-w-sm mx-auto border rounded" style={{ maxHeight: 300 }} />
              <div className="text-center"><Button onClick={stopCamera} variant="outline">Dừng quét</Button></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{isClinic ? 'Nhập tay' : 'Check-in thủ công'}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tên *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Nhập tên" className="pl-10" />
              </div>
            </div>
            {!isClinic && (
              <div>
                <Label>Phường</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={manual.ward} onChange={(e) => setManual({ ...manual, ward: e.target.value })} placeholder="Phường" className="pl-10" />
                </div>
              </div>
            )}
          </div>
          {!isClinic && (
            <div>
              <Label>Số điện thoại</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} placeholder="Số điện thoại" className="pl-10" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleManual} disabled={!manual.name.trim() || (!isClinic && !selectedCampaign)}>
              {isClinic ? 'Nhận số thứ tự' : 'Check-in ngay'}
            </Button>
            <Button onClick={generate} variant="outline" disabled={!manual.name.trim() || (!isClinic && !selectedCampaign)}>Tạo mã QR</Button>
          </div>
        </CardContent>
      </Card>

      {clinicTicket && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><div className="font-bold">Số {clinicTicket.token} — {clinicTicket.name}</div></div>
            <div className="text-[11px] font-mono text-muted-foreground">tx: {shortHash(clinicTicket.tx, 10, 8)}</div>
            <p className="text-xs text-muted-foreground">Mô phỏng — phiếu khám không ghi vào database thật.</p>
          </CardContent>
        </Card>
      )}

      {generatedQR && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Mã QR</CardTitle></CardHeader>
          <CardContent className="text-center">
            <img src={generatedQR} alt="QR" className="mx-auto mb-2" />
          </CardContent>
        </Card>
      )}

      {!isClinic && offlineQueue.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg text-orange-600">Hàng đợi offline ({offlineQueue.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {offlineQueue.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm">
                <span>{c.participant_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(c.timestamp).toLocaleString()}</span>
              </div>
            ))}
            {isOnline && <Button onClick={syncOfflineQueue} className="w-full mt-2">Đồng bộ ngay</Button>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
