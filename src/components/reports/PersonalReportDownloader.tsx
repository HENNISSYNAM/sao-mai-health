import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ReportType = 'news' | 'twin' | 'stroke' | 'all';

interface PersonalReportDownloaderProps {
  reportType: ReportType;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
}

function markdownToHtml(md: string): string {
  // Handle tables: | col | col |
  let result = md.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_match, header: string, _sep: string, body: string) => {
    const thCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  result = result
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return result;
}

function generateReportNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `BC-${datePart}-${seq}`;
}

function getVietnameseDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `TP. Hồ Chí Minh, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

function openReportWindow(html: string, reportType: string, generatedAt: string) {
  const typeLabel: Record<string, string> = {
    news: 'PHÂN TÍCH TIN TỨC Y TẾ',
    twin: 'PHÂN TÍCH SỨC KHỎE CÁ NHÂN (SONG SINH SỐ)',
    stroke: 'TÌNH BÁO DỊCH TỄ VÀ ĐÁNH GIÁ RỦI RO',
    all: 'TỔNG HỢP SỨC KHỎE CÁ NHÂN',
  };
  const title = typeLabel[reportType] || 'PHÂN TÍCH Y TẾ';
  const reportNumber = generateReportNumber();
  const dateStr = getVietnameseDate(generatedAt);

  const doc = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Báo cáo ${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');
  @page { size: A4; margin: 20mm 25mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'Noto Serif', serif;
    color: #1a1a1a;
    background: #fff;
    padding: 40px 50px;
    max-width: 210mm;
    margin: auto;
    line-height: 1.8;
    font-size: 13.5pt;
  }

  /* === HEADER === */
  .gov-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }
  .gov-header-left {
    text-align: center;
    width: 45%;
  }
  .gov-header-left .org-name {
    font-size: 13pt;
    font-weight: 700;
    color: #1a365d;
    text-transform: uppercase;
  }
  .gov-header-left .org-sub {
    font-size: 11pt;
    color: #4a5568;
    font-style: italic;
  }
  .gov-header-right {
    text-align: center;
    width: 50%;
  }
  .gov-header-right .republic {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .gov-header-right .motto {
    font-size: 12pt;
    font-weight: 700;
    text-decoration: underline;
    letter-spacing: 0.5px;
  }
  .header-line {
    border: none;
    border-top: 3px solid #c53030;
    margin: 10px 0 24px 0;
  }

  /* === TITLE === */
  .report-title {
    text-align: center;
    margin: 20px 0 6px 0;
  }
  .report-title h1 {
    font-size: 16pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #1a365d;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .report-title .report-subtitle {
    font-size: 14pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #2d3748;
  }
  .report-number {
    text-align: center;
    font-size: 12pt;
    color: #4a5568;
    font-style: italic;
    margin-bottom: 20px;
  }

  /* === RECIPIENT === */
  .recipient {
    margin: 16px 0;
    font-size: 13pt;
  }
  .recipient strong {
    color: #1a365d;
  }

  /* === CONTENT === */
  .report-body {
    margin-top: 16px;
  }
  .report-body strong {
    color: #1a365d;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12pt;
  }
  table th, table td {
    border: 1px solid #718096;
    padding: 6px 10px;
    text-align: left;
  }
  table th {
    background: #edf2f7;
    font-weight: 700;
    color: #1a365d;
    text-transform: uppercase;
    font-size: 11pt;
  }
  table tr:nth-child(even) td {
    background: #f7fafc;
  }
  ul { padding-left: 24px; margin: 6px 0; }
  li { margin-bottom: 3px; }

  /* === FOOTER / SIGNATURE === */
  .signature-block {
    margin-top: 40px;
    display: flex;
    justify-content: flex-end;
  }
  .signature-content {
    text-align: center;
    width: 280px;
  }
  .signature-content .date-line {
    font-size: 12pt;
    font-style: italic;
    margin-bottom: 6px;
  }
  .signature-content .title-line {
    font-size: 13pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #1a365d;
    margin-bottom: 40px;
  }
  .signature-content .name-line {
    font-size: 13pt;
    font-weight: 700;
    color: #2d3748;
  }
  .stamp-placeholder {
    width: 80px;
    height: 80px;
    border: 2px dashed #cbd5e0;
    border-radius: 50%;
    margin: 0 auto 8px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9pt;
    color: #a0aec0;
  }

  .disclaimer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9pt;
    color: #a0aec0;
    line-height: 1.5;
  }

  /* === PRINT === */
  .no-print { }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

  <!-- PRINT BUTTON -->
  <button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:10px 20px;background:#1a365d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12pt;font-family:'Times New Roman',serif;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
    🖨️ In / Lưu PDF
  </button>

  <!-- HEADER -->
  <div class="gov-header">
    <div class="gov-header-left">
      <div class="org-name">Sao Mai Health</div>
      <div class="org-sub">Nền tảng Y tế Thông minh AI</div>
    </div>
    <div class="gov-header-right">
      <div class="republic">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
    </div>
  </div>
  <hr class="header-line"/>

  <!-- TITLE -->
  <div class="report-title">
    <h1>BÁO CÁO</h1>
    <div class="report-subtitle">${title}</div>
  </div>
  <div class="report-number">Số: ${reportNumber}</div>

  <!-- RECIPIENT -->
  <div class="recipient">
    <strong>Kính gửi:</strong> Người dùng hệ thống Sao Mai Health<br/>
    <strong>Căn cứ:</strong> Dữ liệu thu thập và phân tích từ hệ thống giám sát y tế Sao Mai Health
  </div>

  <!-- BODY -->
  <div class="report-body">
    ${html}
  </div>

  <!-- SIGNATURE -->
  <div class="signature-block">
    <div class="signature-content">
      <div class="date-line">${dateStr}</div>
      <div class="title-line">Người lập báo cáo</div>
      <div class="stamp-placeholder">Dấu AI</div>
      <div class="name-line">Hệ thống AI Sao Mai</div>
    </div>
  </div>

  <!-- DISCLAIMER -->
  <div class="disclaimer">
    Báo cáo được tạo tự động bởi hệ thống trí tuệ nhân tạo. Kết quả mang tính chất tham khảo, không thay thế chẩn đoán y khoa chuyên nghiệp.<br/>
    © ${new Date().getFullYear()} Sao Mai Health — Nền tảng Y tế Thông minh AI
  </div>

</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(doc);
    w.document.close();
  } else {
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const PersonalReportDownloader: React.FC<PersonalReportDownloaderProps> = ({
  reportType,
  label,
  className,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
}) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const defaultLabels: Record<ReportType, string> = {
    news: t('reports.downloadNews', 'Tải báo cáo tin tức'),
    twin: t('reports.downloadTwin', 'Tải báo cáo sức khỏe'),
    stroke: t('reports.downloadStroke', 'Tải báo cáo dịch tễ'),
    all: t('reports.downloadAll', 'Tải báo cáo tổng hợp'),
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setProgress(25);

      const { data, error } = await supabase.functions.invoke('generate-personal-report', {
        body: { userId: user?.id || null, reportType },
      });

      setProgress(80);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const html = markdownToHtml(data.markdown || '');
      setProgress(100);

      openReportWindow(html, reportType, data.generatedAt);
      toast.success(t('reports.ready', 'Báo cáo đã sẵn sàng'));
    } catch (err: any) {
      console.error('Report generation failed:', err);
      toast.error(t('reports.error', 'Không thể tạo báo cáo'), {
        description: err.message,
      });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-1.5"
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : showIcon ? (
          <FileDown className="h-3.5 w-3.5" />
        ) : null}
        <span className="text-xs">{label || defaultLabels[reportType]}</span>
      </Button>
      {isGenerating && (
        <Progress value={progress} className="h-1 w-full" />
      )}
    </div>
  );
};
