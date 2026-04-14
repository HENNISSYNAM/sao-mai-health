import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity, Brain, Wind, FileDown, Loader2, TrendingUp, Footprints, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChartData {
  steps: { date: string; value: number }[];
  balance: { date: string; value: number }[];
  activity: { date: string; value: number; label: string }[];
  environment: { date: string; aqi: number | null; temperature: number | null; humidity: number | null }[];
  tremor: { date: string; events: number; intensity: number }[];
}

interface ReportData {
  markdown: string;
  chart_data: ChartData;
  generatedAt: string;
  period: number;
  dataPoints: number;
  provider: string;
}

function markdownToHtml(md: string): string {
  let result = md.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_match, header: string, _sep: string, body: string) => {
    const thCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th class="px-3 py-2 text-left text-xs font-medium">${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td class="px-3 py-2 text-sm">${c.trim()}</td>`).join('');
      return `<tr class="border-b border-border/50">${cells}</tr>`;
    }).join('');
    return `<table class="w-full border-collapse my-4 text-sm"><thead><tr class="border-b-2 border-primary/20 bg-muted/30">${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });
  result = result
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return result;
}

export const SensorHealthReport: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('7');
  const [report, setReport] = useState<ReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateReport = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để tạo báo cáo');
      return;
    }

    setIsGenerating(true);
    setProgress(15);

    try {
      setProgress(30);
      const { data, error } = await supabase.functions.invoke('generate-sensor-health-report', {
        body: { userId: user.id, period: parseInt(period) },
      });

      setProgress(85);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setReport(data as ReportData);
      setProgress(100);
      toast.success('Báo cáo cảm biến đã sẵn sàng');
    } catch (err: any) {
      console.error('Sensor report error:', err);
      toast.error('Không thể tạo báo cáo', { description: err.message });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const html = markdownToHtml(report.markdown);
    const dateStr = new Date(report.generatedAt).toLocaleDateString('vi-VN');
    const doc = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>Báo cáo Cảm biến Sức khỏe - ${dateStr}</title>
<style>
  @page{size:A4;margin:20mm 25mm}
  body{font-family:'Times New Roman',serif;color:#1a1a1a;background:#fff;padding:40px 50px;max-width:210mm;margin:auto;line-height:1.8;font-size:13.5pt}
  strong{color:#1a365d}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12pt}
  th,td{border:1px solid #718096;padding:6px 10px;text-align:left}
  th{background:#edf2f7;font-weight:700;color:#1a365d;text-transform:uppercase;font-size:11pt}
  tr:nth-child(even) td{background:#f7fafc}
  ul{padding-left:24px;margin:6px 0}
  .header{text-align:center;margin-bottom:24px}
  .header h1{font-size:16pt;font-weight:700;text-transform:uppercase;color:#1a365d}
  .disclaimer{margin-top:36px;text-align:center;font-size:9pt;color:#a0aec0;border-top:1px solid #e2e8f0;padding-top:12px}
  .no-print{}
  @media print{.no-print{display:none!important}}
</style></head><body>
<button class="no-print" onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:10px 20px;background:#1a365d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12pt">🖨️ In / Lưu PDF</button>
<div class="header"><h1>BÁO CÁO SỨC KHỎE CẢM BIẾN THIẾT BỊ</h1><p>Kỳ báo cáo: ${report.period} ngày | Ngày tạo: ${dateStr}</p></div>
<div>${html}</div>
<div class="disclaimer">Báo cáo được tạo tự động bởi AI. Kết quả mang tính tham khảo, không thay thế chẩn đoán y khoa chuyên nghiệp.<br/>© ${new Date().getFullYear()} Sao Mai Health</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(doc); w.document.close(); }
  };

  const activityLabels: Record<number, string> = { 1: 'Ít', 2: 'Nhẹ', 3: 'Vừa', 4: 'Mạnh' };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Báo cáo Sức khỏe từ Cảm biến
          </CardTitle>
          <CardDescription>Phân tích AI kết hợp dữ liệu cảm biến thiết bị và môi trường</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {isGenerating ? 'Đang phân tích...' : 'Tạo báo cáo AI'}
            </Button>
            {report && (
              <Button variant="outline" onClick={downloadReport} className="gap-2">
                <FileDown className="h-4 w-4" />
                Tải PDF
              </Button>
            )}
          </div>
          {isGenerating && <Progress value={progress} className="h-1.5 mt-3" />}
        </CardContent>
      </Card>

      {/* Charts */}
      {report?.chart_data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Steps chart */}
          {report.chart_data.steps.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-primary" />
                  Bước chân theo ngày
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={report.chart_data.steps}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Bước" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Balance chart */}
          {report.chart_data.balance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-info" />
                  Điểm thăng bằng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={report.chart_data.balance}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" name="Thăng bằng" stroke="hsl(var(--info))" fill="hsl(var(--info) / 0.2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Activity level chart */}
          {report.chart_data.activity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-success" />
                  Mức vận động
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.chart_data.activity}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} tickFormatter={(v) => activityLabels[v] || ''} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => activityLabels[v] || v} />
                    <Bar dataKey="value" name="Mức" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Environment chart */}
          {report.chart_data.environment.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wind className="h-4 w-4 text-warning" />
                  AQI & Nhiệt độ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={report.chart_data.environment}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="aqi" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="aqi" type="monotone" dataKey="aqi" name="AQI" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line yAxisId="temp" type="monotone" dataKey="temperature" name="°C" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tremor chart */}
          {report.chart_data.tremor.some(t => t.events > 0) && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Phát hiện run tay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={report.chart_data.tremor}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="events" name="Sự kiện run" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI Report Content */}
      {report?.markdown && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Phân tích AI
              <Badge variant="outline" className="text-xs">{report.provider}</Badge>
              <Badge variant="outline" className="text-xs">{report.dataPoints} ngày dữ liệu</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(report.markdown) }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
