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

export function CommunityAlertModal({ open, onOpenChange, onAlertCreated }: CommunityAlertModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-collect GPS on open
  useEffect(() => {
    if (!open) return;
    setGpsStatus('loading');
    
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGpsStatus('success');
        
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi&zoom=16`,
            { headers: { 'User-Agent': 'SaoMaiHealthHub/1.0' } }
          );
          if (res.ok) {
            const geo = await res.json();
            const addr = geo.address;
            const parts = [addr.road, addr.suburb || addr.quarter, addr.city || addr.town || addr.state].filter(Boolean);
            setAddress(parts.join(', ') || geo.display_name?.split(',').slice(0, 3).join(',') || '');
          }
        } catch (e) {
          console.error('Geocode error:', e);
        }
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

    setSubmitting(true);
    try {
      // 1. Upload photo if exists
      let photoUrl: string | null = null;
      if (photoFile) {
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
      }

      // 2. AI classify the alert
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

      // 3. Insert into community_alerts
      const { error: insertError } = await supabase
        .from('community_alerts' as any)
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
          ai_classification: classification,
        });

      if (insertError) throw insertError;

      toast.success('🚨 Cảnh báo đã được gửi thành công!', {
        description: `Phân loại: ${classification.icon} ${classification.category}`
      });

      // Reset form
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
          {/* GPS Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <MapPin className={`h-4 w-4 ${gpsStatus === 'success' ? 'text-green-500' : gpsStatus === 'error' ? 'text-destructive' : 'text-muted-foreground animate-pulse'}`} />
            <div className="flex-1 min-w-0">
              {gpsStatus === 'loading' && <span className="text-sm text-muted-foreground">Đang xác định vị trí...</span>}
              {gpsStatus === 'success' && (
                <div>
                  <span className="text-sm font-medium text-foreground">{address || `${coords?.lat.toFixed(4)}, ${coords?.lng.toFixed(4)}`}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">GPS ✓</Badge>
                </div>
              )}
              {gpsStatus === 'error' && <span className="text-sm text-destructive">Không thể lấy vị trí. Hãy bật GPS.</span>}
            </div>
          </div>

          {/* Description */}
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

          {/* Photo upload */}
          <div className="space-y-2">
            <Label>Ảnh minh chứng (tùy chọn)</Label>
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

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !description.trim() || gpsStatus !== 'success'}
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
