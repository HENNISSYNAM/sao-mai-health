import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
import { QRCheckInPanel } from '@/components/shared/QRCheckInPanel';

interface QRCheckInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: any[];
  onSuccess: () => void;
}

/** Thin Dialog wrapper around the shared QRCheckInPanel (campaign mode). */
export function QRCheckIn({ open, onOpenChange, campaigns, onSuccess }: QRCheckInProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> QR Check-in</DialogTitle>
          <DialogDescription>Quét mã QR hoặc nhập thông tin thủ công để check-in</DialogDescription>
        </DialogHeader>
        <QRCheckInPanel mode="campaign" campaigns={campaigns} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
