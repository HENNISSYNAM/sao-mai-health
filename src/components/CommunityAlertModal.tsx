import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Camera, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import {
  AlertClassification,
  normalizeClassification,
  getPrecisionLevel,
  mapCategoryToDiseaseCode,
  getSyntheticCasesBySeverity,
} from '@/lib/communityAlert';

interface CommunityAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertCreated?: () => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const CommunityAlertModal: React.FC<CommunityAlertModalProps> = ({
  open,
  onOpenChange,
  onAlertCreated,
}) => {
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [classification, setClassification] =
    useState<AlertClassification | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===============================
  // GPS HANDLING
  // ===============================

  useEffect(() => {
    if (!open) return;

    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setAccuracy(position.coords.accuracy);
        setLocationUpdatedAt(new Date().toISOString());
      },
      () => {
        toast.error('Không thể xác định vị trí. Vui lòng cho phép truy cập GPS.');
      },
      { enableHighAccuracy: true }
    );
  }, [open]);

  // ===============================
  // AI LOCAL CLASSIFICATION PREVIEW
  // ===============================

  useEffect(() => {
    if (!description) {
      setClassification(null);
      return;
    }

    const result = normalizeClassification(null);
    setClassification(result);
  }, [description]);

  // ===============================
  // PHOTO HANDLING
  // ===============================

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const resetState = () => {
    setDescription('');
    setPhotoFile(null);
    setPreviewUrl(null);
    setClassification(null);
  };

  // ===============================
  // SUBMIT HANDLER
  // ===============================

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Bạn cần đăng nhập.');
      return;
    }

    if (!description.trim()) {
      toast.error('Vui lòng mô tả tình trạng');
      return;
    }

    if (!coords) {
      toast.error('Không thể xác định vị trí.');
      return;
    }

    if (!photoFile) {
      toast.error('Vui lòng đính kèm ảnh minh chứng.');
      return;
    }

    setSubmitting(true);

    try {
      // ==========================
      // Upload photo
      // ==========================

      const ext = photoFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('alert-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('alert-photos')
        .getPublicUrl(filePath);

      const photoUrl = urlData.publicUrl;

      // ==========================
      // AI Classification (Edge Function)
      // ==========================

      let finalClassification: AlertClassification =
        normalizeClassification(null);

      try {
        const { data, error } = await supabase.functions.invoke(
          'classify-alert',
          {
            body: {
              description,
              lat: coords.lat,
              lng: coords.lng,
            },
          }
        );

        if (!error && data) {
          finalClassification = normalizeClassification(data);
        }
      } catch (err) {
        console.error('Classification error:', err);
      }

      // ==========================
      // Insert into DB
      // ==========================

      const { error: insertError } = await supabase
        .from('community_alerts')
        .insert({
          user_id: user.id,
          description: description.trim(),
          photo_url: photoUrl,
          lat: coords.lat,
          lng: coords.lng,
          address: address || null,
          category: finalClassification.category,
          icon: finalClassification.icon,
          severity: finalClassification.severity,
          disease_code: mapCategoryToDiseaseCode(
            finalClassification.category
          ),
          estimated_cases: getSyntheticCasesBySeverity(
            finalClassification.severity
          ),
          ai_classification: {
            ...finalClassification,
            location: {
              accuracy,
              captured_at: locationUpdatedAt,
              precision: getPrecisionLevel(accuracy),
              source:
                accuracy === null
                  ? 'app_cached'
                  : 'browser_or_presence',
            },
          },
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      toast.success('Gửi cảnh báo thành công!');
      resetState();
      onAlertCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi gửi cảnh báo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ===============================
  // UI
  // ===============================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>Báo cáo cảnh báo y tế</DialogTitle>
          <DialogDescription>
            Gửi cảnh báo tình trạng sức khỏe tại khu vực của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Mô tả tình trạng</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: nhiều người sốt cao trong khu phố..."
          />
        </div>

        {coords && (
          <div className="text-sm flex items-center gap-2 text-muted-foreground">
            <MapPin size={14} />
            GPS chính xác: {accuracy?.toFixed(0)}m (
            {getPrecisionLevel(accuracy)})
          </div>
        )}

        {classification && (
          <div className="flex gap-2">
            <Badge>{classification.category}</Badge>
            <Badge variant="outline">
              {classification.severity}
            </Badge>
          </div>
        )}

        {previewUrl && (
          <img
            src={previewUrl}
            alt="preview"
            className="rounded-lg max-h-48 object-cover"
          />
        )}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handlePhotoChange(e.target.files[0]);
            }
          }}
        />

        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="mr-2" size={16} />
          Chọn ảnh
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Đang gửi...
            </>
          ) : (
            <>
              <Send className="mr-2" size={16} />
              Gửi cảnh báo
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CommunityAlertModal;
