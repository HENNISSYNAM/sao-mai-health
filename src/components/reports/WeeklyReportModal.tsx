import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, X } from "lucide-react";

interface DiseaseRow {
  stt: number;
  tenBenh: string;
  macTuanNay: number;
  tuVongTuanNay: number;
  macLuyKe: number;
  tuVongLuyKe: number;
  ghiChu?: string;
}

interface WeeklyReportModalProps {
  open: boolean;
  onClose: () => void;
  donViBaoCao?: string;
  dailyCounts?: Array<{ disease_code: string; cases: number; day: string }>;
}

const DISEASE_LABELS: Record<string, string> = {
  dengue:       "Sốt xuất huyết Dengue",
  hfmd:         "Tay chân miệng",
  influenza:    "Cúm mùa (Influenza)",
  covid19:      "COVID-19",
  typhoid:      "Thương hàn",
  cholera:      "Tả",
  measles:      "Sởi",
  rubella:      "Rubella",
  hepatitis_a:  "Viêm gan A",
  rabies:       "Bệnh dại",
  malaria:      "Sốt rét",
  diphtheria:   "Bạch hầu",
  pertussis:    "Ho gà",
  tetanus:      "Uốn ván",
  encephalitis: "Viêm não vi-rút",
};

// Week number from date
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

function getWeekRange(weekOffset = 0): { from: Date; to: Date; week: number; year: number } {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday, to: sunday, week: getWeekNumber(monday), year: monday.getFullYear() };
}

function fmt(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function WeeklyReportModal({ open, onClose, donViBaoCao = "", dailyCounts = [] }: WeeklyReportModalProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const range = getWeekRange(weekOffset);

  // Aggregate this-week counts from dailyCounts
  const weekFrom = range.from.toISOString().split("T")[0];
  const weekTo   = range.to.toISOString().split("T")[0];

  const thisWeekByDisease: Record<string, number> = {};
  const totalByDisease: Record<string, number> = {};
  for (const row of dailyCounts) {
    totalByDisease[row.disease_code] = (totalByDisease[row.disease_code] || 0) + row.cases;
    if (row.day >= weekFrom && row.day <= weekTo) {
      thisWeekByDisease[row.disease_code] = (thisWeekByDisease[row.disease_code] || 0) + row.cases;
    }
  }

  // Build rows — use all known diseases, fill zeros if no data
  const allCodes = Array.from(new Set([
    ...Object.keys(DISEASE_LABELS),
    ...Object.keys(thisWeekByDisease),
  ]));

  const rows: DiseaseRow[] = allCodes
    .map((code, i) => ({
      stt: i + 1,
      tenBenh: DISEASE_LABELS[code] || code,
      macTuanNay: thisWeekByDisease[code] || 0,
      tuVongTuanNay: 0,
      macLuyKe: totalByDisease[code] || 0,
      tuVongLuyKe: 0,
    }))
    .filter(r => r.macTuanNay > 0 || r.macLuyKe > 0);

  const totalThisWeek = rows.reduce((s, r) => s + r.macTuanNay, 0);
  const totalLuyKe    = rows.reduce((s, r) => s + r.macLuyKe, 0);

  const printReport = () => {
    const el = document.getElementById("report-print-area");
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="vi"><head>
      <meta charset="UTF-8"/>
      <title>Báo cáo tuần ${range.week}/${range.year}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; margin: 20mm 15mm; color: #000; }
        h2, h3 { text-align: center; text-transform: uppercase; margin: 4px 0; }
        h2 { font-size: 14pt; }
        .subtitle { text-align: center; font-size: 11pt; margin-bottom: 12px; }
        .meta { display: flex; justify-content: space-between; margin: 8px 0; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
        th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
        th { background: #d9d9d9; font-weight: bold; }
        td:nth-child(2) { text-align: left; }
        tfoot td { font-weight: bold; background: #f0f0f0; }
        .sign { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11pt; }
        .sign-block { text-align: center; width: 40%; }
        .sign-block .title { font-weight: bold; text-transform: uppercase; }
        .sign-block .note { font-style: italic; font-size: 10pt; margin-bottom: 40px; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0 flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Xuất báo cáo dịch tễ hàng tuần
          </DialogTitle>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Controls */}
        <div className="px-4 py-2 flex items-center gap-3 border-b">
          <span className="text-sm font-medium text-muted-foreground">Tuần báo cáo:</span>
          <Select value={String(weekOffset)} onValueChange={v => setWeekOffset(Number(v))}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tuần hiện tại (tuần {range.week})</SelectItem>
              <SelectItem value="-1">Tuần trước (tuần {getWeekRange(-1).week})</SelectItem>
              <SelectItem value="-2">2 tuần trước (tuần {getWeekRange(-2).week})</SelectItem>
              <SelectItem value="-3">3 tuần trước (tuần {getWeekRange(-3).week})</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={printReport} className="ml-auto gap-2">
            <Printer className="h-4 w-4" />
            In / Lưu PDF
          </Button>
        </div>

        {/* Report preview */}
        <div className="p-6 bg-white text-black" id="report-print-area">
          {/* Header */}
          <div className="flex justify-between text-xs mb-2">
            <div>
              <p className="font-bold uppercase">Sở Y tế / CDC</p>
              <p>{donViBaoCao || "Trung tâm Kiểm soát Bệnh tật TP.HCM"}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Mẫu A1</p>
              <p>Thông tư 54/2015/TT-BYT</p>
            </div>
          </div>

          <h2 className="text-center text-base font-bold uppercase mt-4 mb-1">
            BÁO CÁO CA BỆNH TRUYỀN NHIỄM HÀNG TUẦN
          </h2>
          <p className="text-center text-sm mb-4">
            Tuần thứ <strong>{range.week}</strong> năm <strong>{range.year}</strong>&ensp;|&ensp;
            Từ ngày <strong>{fmt(range.from)}</strong> đến ngày <strong>{fmt(range.to)}</strong>
          </p>

          <div className="flex justify-between text-sm mb-3">
            <span>Đơn vị báo cáo: <strong>{donViBaoCao || "______________________"}</strong></span>
            <span>Ngày báo cáo: <strong>{fmt(new Date())}</strong></span>
          </div>

          {/* Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-800 px-2 py-1.5 text-center w-10">STT</th>
                <th className="border border-gray-800 px-2 py-1.5 text-left">Tên bệnh</th>
                <th className="border border-gray-800 px-2 py-1.5 text-center w-20">Mắc<br/>tuần này</th>
                <th className="border border-gray-800 px-2 py-1.5 text-center w-20">Tử vong<br/>tuần này</th>
                <th className="border border-gray-800 px-2 py-1.5 text-center w-20">Mắc<br/>lũy kế</th>
                <th className="border border-gray-800 px-2 py-1.5 text-center w-20">Tử vong<br/>lũy kế</th>
                <th className="border border-gray-800 px-2 py-1.5 text-center">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-800 px-2 py-4 text-center text-gray-500 italic">
                    Chưa có dữ liệu cho tuần này
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.stt} className="even:bg-gray-50">
                  <td className="border border-gray-800 px-2 py-1 text-center">{r.stt}</td>
                  <td className="border border-gray-800 px-2 py-1">{r.tenBenh}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center font-semibold text-red-700">{r.macTuanNay || "—"}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{r.tuVongTuanNay || "—"}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{r.macLuyKe || "—"}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center">{r.tuVongLuyKe || "—"}</td>
                  <td className="border border-gray-800 px-2 py-1">{r.ghiChu || ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={2} className="border border-gray-800 px-2 py-1.5 text-right">TỔNG CỘNG</td>
                <td className="border border-gray-800 px-2 py-1.5 text-center text-red-700">{totalThisWeek || "—"}</td>
                <td className="border border-gray-800 px-2 py-1.5 text-center">—</td>
                <td className="border border-gray-800 px-2 py-1.5 text-center">{totalLuyKe || "—"}</td>
                <td className="border border-gray-800 px-2 py-1.5 text-center">—</td>
                <td className="border border-gray-800 px-2 py-1.5" />
              </tr>
            </tfoot>
          </table>

          {/* Signature block */}
          <div className="flex justify-between mt-8 text-sm">
            <div className="text-center w-2/5">
              <p className="font-bold uppercase">Người lập báo cáo</p>
              <p className="italic text-xs">(Ký, ghi rõ họ tên)</p>
              <div className="h-14" />
            </div>
            <div className="text-center w-2/5">
              <p className="text-xs italic">TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
              <p className="font-bold uppercase">Thủ trưởng đơn vị</p>
              <p className="italic text-xs">(Ký, đóng dấu)</p>
              <div className="h-14" />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Được tạo tự động bởi Sao Mai Health — Nền tảng giám sát dịch tễ học cộng đồng
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
