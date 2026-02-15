import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Camera, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CommunityAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertCreated?: () => void;
}

const DISEASE_CATEGORIES = new Set([
  'dengue',
  'covid',
  'food_poisoning',
  'hand_foot_mouth',
  'measles',
]);

const getPrecisionLevel = (accuracy: number | null) => {
  if (typeof accuracy !== 'number') return 'low';
  if (accuracy <= 25) return 'high';
  if (accuracy <= 100) return 'medium';
  return 'low';
};

export function CommunityAlertModal({ open, onOpenChange, onAlertCreated }: CommunityAlertModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<number | null>(null);
  const hasLocationRef = useRef(false);
  const bestAccuracyRef = useRef<number | null>(null);
  const addressResolvedRef = useRef(false);

  const clearLocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimeoutRef.current !== null) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }
  };

  const updateAddress = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi&zoom=16`,
        { headers: { 'User-Agent': 'SaoMaiHealthHub/1.0' } }
      );

      if (!res.ok) return;

      const geo = await res.json();
      const addr = geo.address;
      const parts = [addr?.road, addr?.suburb || addr?.quarter, addr?.city || addr?.town || addr?.state].filter(Boolean);
      setAddress(parts.join(', ') || geo.display_name?.split(',').slice(0, 3).join(',') || '');
    } catch (e) {
      console.error('Geocode error:', e);
    }
  };

  const requestPreciseLocation = () => {
    clearLocationWatch();

    setGpsStatus('loading');
    setAddress('');
    setAccuracy(null);
    setLocationUpdatedAt(null);
    setCoords(null);

    hasLocationRef.current = false;
    bestAccuracyRef.current = null;
    addressResolvedRef.current = false;

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const handlePosition = async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: currentAccuracy } = pos.coords;
      const bestAccuracy = bestAccuracyRef.current;

      if (bestAccuracy === null || currentAccuracy < bestAccuracy) {
        bestAccuracyRef.current = currentAccuracy;
        setCoords({ lat: latitude, lng: longitude });
        setAccuracy(currentAccuracy);
      }

      if (!addressResolvedRef.current) {
        addressResolvedRef.current = true;
        await updateAddress(latitude, longitude);
      }

      hasLocationRef.current = true;
      setLocationUpdatedAt(new Date().toISOString());
      setGpsStatus('success');

      if (currentAccuracy <= 25) {
        clearLocationWatch();
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void handlePosition(pos);
      },
      () => {
        if (!hasLocationRef.current) {
          setGpsStatus('error');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void handlePosition(pos);
      },
      () => {
        if (!hasLocationRef.current) {
          setGpsStatus('error');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    watchTimeoutRef.current = window.setTimeout(() => clearLocationWatch(), 20000);
  };

  useEffect(() => {
    if (!open) {
      clearLocationWatch();
      return;
    }

    requestPreciseLocation();
    return () => clearLocationWatch();
  }, [open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 5MB)');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để gửi cảnh báo');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng mô tả tình trạng');
      return;
    }
    if (!coords) {
      toast.error('Không thể xác định vị trí. Vui lòng cho phép truy cập GPS.');
      return;
    }
    if (!photoFile) {
      toast.error('Vui lòng đính kèm ảnh minh chứng để gửi cảnh báo.');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      const ext = photoFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('alert-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('alert-photos')
        .getPublicUrl(filePath);
      photoUrl = urlData.publicUrl;

      let classification = { category: 'unknown', icon: '⚠️', severity: 'medium', summary: '' };
      try {
        const { data: classifyData, error: classifyError } = await supabase.functions.invoke('classify-alert', {
          body: { description, lat: coords.lat, lng: coords.lng }
        });
        if (!classifyError && classifyData) {
          classification = classifyData;
        }
      } catch (e) {
        console.error('Classification failed, using defaults:', e);
      }

      const { data: insertedAlert, error: insertError } = await supabase
        .from('community_alerts')
        .insert({
          user_id: user.id,
          description: description.trim(),
          photo_url: photoUrl,
          lat: coords.lat,
          lng: coords.lng,
          address: address || null,
          category: classification.category,
          icon: classification.icon,
          severity: classification.severity,
          ai_classification: {
            ...classification,
            location: {
              accuracy,
              captured_at: locationUpdatedAt,
              precision: getPrecisionLevel(accuracy),
            },
          },
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (DISEASE_CATEGORIES.has(classification.category)) {
        const { error: caseEventError } = await supabase.from('case_events').insert({
          disease_code: classification.category,
          lat: coords.lat,
          lon: coords.lng,
          source: 'community_alert',
          user_id: user.id,
          symptoms: {
            description: description.trim(),
            community_alert_id: insertedAlert?.id,
            photo_url: photoUrl,
            category: classification.category,
            severity: classification.severity,
            location_accuracy_m: accuracy,
          },
        });

        if (caseEventError) {
          console.error('Failed to create case event from community alert:', caseEventError);
        }
      }

      toast.success('🚨 Cảnh báo đã được gửi thành công!', {
        description: `Phân loại: ${classification.icon} ${classification.category}`
      });

      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
      onOpenChange(false);
      onAlertCreated?.();
    } catch (error: any) {
      console.error('Submit alert error:', error);
      toast.error('Lỗi khi gửi cảnh báo', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Gửi cảnh báo cộng đồng
          </DialogTitle>
          <DialogDescription>
            Báo cáo tình trạng dịch bệnh, ô nhiễm hoặc sự cố y tế tại vị trí của bạn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <MapPin className={`h-4 w-4 ${gpsStatus === 'success' ? 'text-green-500' : gpsStatus === 'error' ? 'text-destructive' : 'text-muted-foreground animate-pulse'}`} />
            <div className="flex-1 min-w-0">
              {gpsStatus === 'loading' && <span className="text-sm text-muted-foreground">Đang xác định vị trí...</span>}
              {gpsStatus === 'success' && (
                <div>
                  <span className="text-sm font-medium text-foreground">{address || `${coords?.lat.toFixed(6)}, ${coords?.lng.toFixed(6)}`}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">GPS ✓</Badge>
                  {typeof accuracy === 'number' && (
                    <p className="text-xs text-muted-foreground mt-1">Sai số GPS: ±{Math.round(accuracy)}m</p>
                  )}
                </div>
              )}
              {gpsStatus === 'error' && <span className="text-sm text-destructive">Không thể lấy vị trí. Hãy bật GPS.</span>}
            </div>
            <Button variant="outline" size="sm" onClick={requestPreciseLocation}>
              Làm mới GPS
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alert-desc">Mô tả tình trạng *</Label>
            <Textarea
              id="alert-desc"
              placeholder="VD: Nhiều muỗi xuất hiện, có người bị sốt xuất huyết trong khu vực..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Ảnh minh chứng *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg border border-border"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 h-7 px-2"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                >
                  Xóa
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-5 w-5 mr-2" />
                Chụp hoặc chọn ảnh
              </Button>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !description.trim() || gpsStatus !== 'success' || !photoFile}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi & phân loại AI...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Gửi cảnh báo</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
