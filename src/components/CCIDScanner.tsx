import { useEffect, useRef, useState, useCallback } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanLine, X, Zap, ZapOff, CheckCircle2, RefreshCw, User, Calendar, MapPin, CreditCard } from "lucide-react";
import { toast } from "sonner";

export interface CCIDData {
  citizenId: string;
  fullName: string;
  dateOfBirth: string; // yyyy-MM-dd
  gender: "male" | "female" | "other";
  address: string;
  issueDate?: string;
}

interface CCIDScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: CCIDData) => void;
}

// ─── Vietnamese CCCD QR parser ───
// Format (Thông tư 07/2016 + Nghị định 59/2022):
//   ID | OldID | FullName | DOB(ddmmyyyy) | Gender | Address | IssueDate(ddmmyyyy)
// Example:
//   079092012345||NGUYEN VAN AN|15061985|Nam|123 Nguyen Thai Hoc Quan 1 TP Ho Chi Minh|01052021
function parseCCID(raw: string): CCIDData | null {
  try {
    // Support both | and newline separators (some printers use \n)
    const sep = raw.includes("|") ? "|" : "\n";
    const parts = raw.split(sep).map(p => p.trim());

    if (parts.length < 5) return null;

    const citizenId = parts[0];
    // CCCD must be 9 or 12 digits
    if (!/^\d{9,12}$/.test(citizenId)) return null;

    // parts[1] = old ID (may be empty), parts[2] = name
    const fullName = (parts.length >= 7 ? parts[2] : parts[1]).trim();
    if (!fullName || fullName.length < 2) return null;

    const dobRaw    = parts.length >= 7 ? parts[3] : parts[2];
    const genderRaw = parts.length >= 7 ? parts[4] : parts[3];
    const address   = parts.length >= 7 ? parts[5] : parts[4];
    const issueDateRaw = parts.length >= 7 ? parts[6] : "";

    // Parse DOB: ddmmyyyy or dd/mm/yyyy
    const dobClean = dobRaw.replace(/\D/g, "");
    let dateOfBirth = "";
    if (dobClean.length === 8) {
      const dd = dobClean.slice(0, 2);
      const mm = dobClean.slice(2, 4);
      const yyyy = dobClean.slice(4, 8);
      dateOfBirth = `${yyyy}-${mm}-${dd}`;
    }

    // Parse gender (Nam / Nữ / Male / Female)
    const g = genderRaw.toLowerCase();
    const gender: CCIDData["gender"] =
      g === "nữ" || g === "nu" || g === "female" || g === "f" ? "female" :
      g === "nam" || g === "male" || g === "m"                ? "male"   : "other";

    // Parse issue date
    let issueDate: string | undefined;
    if (issueDateRaw) {
      const idClean = issueDateRaw.replace(/\D/g, "");
      if (idClean.length === 8) {
        issueDate = `${idClean.slice(4, 8)}-${idClean.slice(2, 4)}-${idClean.slice(0, 2)}`;
      }
    }

    return { citizenId, fullName, dateOfBirth, gender, address: address.trim(), issueDate };
  } catch {
    return null;
  }
}

// ─── Preview card after scan ───
function ScannedPreview({ data, onConfirm, onRescan }: {
  data: CCIDData;
  onConfirm: () => void;
  onRescan: () => void;
}) {
  const genderLabel = data.gender === "male" ? "Nam" : data.gender === "female" ? "Nữ" : "Khác";
  return (
    <div className="p-4 space-y-3 animate-fade-up">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
        <span className="font-semibold text-sm">Quét thành công!</span>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
        <Row icon={<CreditCard className="h-3.5 w-3.5 text-primary" />} label="Số CCCD" value={data.citizenId} />
        <Row icon={<User className="h-3.5 w-3.5 text-primary" />}      label="Họ và tên" value={data.fullName} />
        <Row icon={<Calendar className="h-3.5 w-3.5 text-primary" />}  label="Ngày sinh"
          value={data.dateOfBirth
            ? new Date(data.dateOfBirth + "T00:00:00").toLocaleDateString("vi-VN")
            : "—"} />
        <Row icon={<User className="h-3.5 w-3.5 text-primary" />}      label="Giới tính" value={genderLabel} />
        <Row icon={<MapPin className="h-3.5 w-3.5 text-primary" />}    label="Địa chỉ"   value={data.address} truncate />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onRescan}>
          <RefreshCw className="h-3.5 w-3.5" /> Quét lại
        </Button>
        <Button size="sm" className="flex-1 gap-1.5 bg-success hover:bg-success/90" onClick={onConfirm}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận
        </Button>
      </div>
    </div>
  );
}

function Row({ icon, label, value, truncate = false }: {
  icon: React.ReactNode; label: string; value: string; truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className={`text-xs font-medium ${truncate ? "line-clamp-2" : ""}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function CCIDScanner({ open, onClose, onScan }: CCIDScannerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const scannerRef  = useRef<QrScanner | null>(null);
  const lastToastAt = useRef(0);

  const [hasFlash,  setHasFlash]  = useState(false);
  const [flashOn,   setFlashOn]   = useState(false);
  const [camError,  setCamError]  = useState<string | null>(null);
  const [preview,   setPreview]   = useState<CCIDData | null>(null);

  const startScanner = useCallback(() => {
    if (!videoRef.current) return;
    setCamError(null);
    setPreview(null);

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const data = parseCCID(result.data);
        if (data) {
          scanner.stop();
          setPreview(data);
        } else {
          // Throttle "unrecognized" toasts to once per 3s
          const now = Date.now();
          if (now - lastToastAt.current > 3000) {
            lastToastAt.current = now;
            toast.warning("QR không phải CCCD/CMND. Hãy quét mặt sau thẻ.");
          }
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
        maxScansPerSecond: 5,
      }
    );

    scannerRef.current = scanner;

    scanner.start()
      .then(async () => {
        try {
          const flash = await (scanner as any).hasFlash?.();
          setHasFlash(!!flash);
        } catch { /* flash not supported */ }
      })
      .catch((err: Error) => {
        const msg = err.message?.includes("permission")
          ? "Vui lòng cho phép truy cập camera trong cài đặt trình duyệt."
          : "Không tìm thấy camera. Kiểm tra thiết bị.";
        setCamError(msg);
      });
  }, []);

  useEffect(() => {
    if (!open) {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      setPreview(null);
      setFlashOn(false);
      setCamError(null);
      return;
    }

    // Small delay so Dialog animation completes before camera starts
    const t = setTimeout(startScanner, 150);
    return () => {
      clearTimeout(t);
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [open, startScanner]);

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.toggleFlash();
      setFlashOn(prev => !prev);
    } catch { /* not supported */ }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onScan(preview);
    toast.success(`Đã điền thông tin cho ${preview.fullName}`);
    onClose();
  };

  const handleRescan = () => {
    setPreview(null);
    startScanner();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-2 flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5 text-primary" />
            Quét QR CCCD / CMND
          </DialogTitle>
          <Badge variant="outline" className="text-[10px]">VN eID</Badge>
        </DialogHeader>

        {/* Camera view — hidden when preview is showing */}
        {!preview && (
          <>
            <div className="relative bg-black" style={{ aspectRatio: "1" }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Animated scan frame */}
              {!camError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    {/* Corner brackets */}
                    {[
                      "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
                      "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
                      "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
                      "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-7 h-7 border-primary ${cls}`} />
                    ))}
                    {/* Scanning line */}
                    <div className="absolute left-2 right-2 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                  </div>
                  <p className="absolute bottom-6 text-white/70 text-xs font-medium px-4 text-center drop-shadow">
                    Đặt QR code mặt sau CCCD vào khung
                  </p>
                </div>
              )}

              {/* Camera error overlay */}
              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                  <ScanLine className="h-10 w-10 text-muted-foreground opacity-40" />
                  <p className="text-white/70 text-sm">{camError}</p>
                  <Button size="sm" variant="secondary" onClick={startScanner} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                  </Button>
                </div>
              )}
            </div>

            {/* Footer controls */}
            <div className="p-3 flex items-center justify-between gap-2 bg-muted/30 border-t border-border">
              <p className="text-[11px] text-muted-foreground flex-1 leading-tight">
                Hỗ trợ CCCD 12 số (2021+) và CMND 9 số
              </p>
              <div className="flex gap-1.5">
                {hasFlash && (
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={toggleFlash} title="Bật/tắt đèn flash">
                    {flashOn
                      ? <Zap className="h-3.5 w-3.5 text-yellow-400" />
                      : <ZapOff className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={onClose}>
                  <X className="h-3.5 w-3.5" /> Đóng
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Preview after successful scan */}
        {preview && (
          <ScannedPreview
            data={preview}
            onConfirm={handleConfirm}
            onRescan={handleRescan}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
