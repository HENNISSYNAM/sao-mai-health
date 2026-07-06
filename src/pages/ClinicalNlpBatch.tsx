import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Upload, Loader2, Sparkles, Package, RotateCcw, FileText, CheckCircle2, AlertCircle, Play,
} from "lucide-react";
import {
  BatchItem, readTxtFilesAsItems, readZipAsTxtItems, runBatch, runOne, packSubmission,
} from "@/lib/nlpBatch";
import { ClinicalNlpPanel } from "@/components/shared/ClinicalNlpPanel";

export default function ClinicalNlpBatch() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(4);

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    try {
      let next: BatchItem[] = [];
      const zip = accepted.find((f) => /\.zip$/i.test(f.name));
      if (zip) {
        next = await readZipAsTxtItems(zip);
      } else {
        const txts = accepted.filter((f) => /\.txt$/i.test(f.name));
        next = await readTxtFilesAsItems(txts);
      }
      if (!next.length) { toast.error("Không tìm thấy file .txt"); return; }
      setItems(next);
      toast.success(`Đã nạp ${next.length} file`);
    } catch (e: any) {
      toast.error("Lỗi đọc file: " + e.message);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"], "text/plain": [".txt"] },
    multiple: true,
  });

  const stats = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    const err = items.filter((i) => i.status === "error").length;
    const run = items.filter((i) => i.status === "running").length;
    return { done, err, run, total: items.length, pct: items.length ? Math.round((done + err) / items.length * 100) : 0 };
  }, [items]);

  async function startAll() {
    if (!items.length || running) return;
    setRunning(true);
    // Reset non-done items
    setItems((prev) => prev.map((i) => (i.status === "done" ? i : { ...i, status: "pending", error: undefined })));
    try {
      const snapshot = [...items].map((i) => (i.status === "done" ? i : { ...i, status: "pending" as const }));
      await runBatch(snapshot, concurrency, (idx, next) => {
        setItems((prev) => {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        });
      });
      toast.success("Hoàn tất batch");
    } finally {
      setRunning(false);
    }
  }

  async function retryOne(idx: number) {
    setItems((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], status: "running", error: undefined };
      return c;
    });
    const next = await runOne(items[idx]);
    setItems((prev) => {
      const c = [...prev];
      c[idx] = next;
      return c;
    });
  }

  async function downloadZip() {
    if (!items.some((i) => i.status === "done")) { toast.error("Chưa có kết quả nào"); return; }
    await packSubmission(items);
    toast.success("Đã tải submission.zip");
  }

  function reset() {
    setItems([]);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Clinical NLP — Batch Runner
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload <code>test.zip</code> (100 file <code>.txt</code>) hoặc chọn trực tiếp các file <code>.txt</code>. Hệ thống trích xuất khái niệm y khoa (TRIỆU_CHỨNG, CHẨN_ĐOÁN, THUỐC, xét nghiệm), ánh xạ ICD-10 & RxNorm, xuất <code>submission.zip</code>.
        </p>
      </div>

      <Card className="p-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="font-medium">{isDragActive ? "Thả file tại đây" : "Kéo thả test.zip hoặc file .txt"}</p>
          <p className="text-xs text-muted-foreground mt-1">Hỗ trợ: 1 file .zip hoặc nhiều file .txt</p>
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={startAll} disabled={running || !items.length}>
                {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                Chạy tất cả ({items.length})
              </Button>
              <Button variant="outline" onClick={downloadZip} disabled={!items.some((i) => i.status === "done")}>
                <Package className="w-4 h-4 mr-1" /> Tải submission.zip
              </Button>
              <Button variant="ghost" onClick={reset} disabled={running}>
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              <div className="ml-auto flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Concurrency:</label>
                <select
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  disabled={running}
                  className="border rounded px-2 py-1 bg-background"
                >
                  {[1, 2, 4, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <Card className="p-2 text-center"><div className="text-muted-foreground">Tổng</div><div className="font-bold text-lg">{stats.total}</div></Card>
              <Card className="p-2 text-center"><div className="text-muted-foreground">Đang chạy</div><div className="font-bold text-lg text-blue-600">{stats.run}</div></Card>
              <Card className="p-2 text-center"><div className="text-muted-foreground">Hoàn tất</div><div className="font-bold text-lg text-emerald-600">{stats.done}</div></Card>
              <Card className="p-2 text-center"><div className="text-muted-foreground">Lỗi</div><div className="font-bold text-lg text-rose-600">{stats.err}</div></Card>
            </div>
            <Progress value={stats.pct} className="h-2" />
          </div>
        )}
      </Card>

      {items.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">File</th>
                  <th className="text-left px-3 py-2">Trạng thái</th>
                  <th className="text-left px-3 py-2">Entities</th>
                  <th className="text-left px-3 py-2">Ghi chú</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{it.name}</td>
                    <td className="px-3 py-2">
                      {it.status === "pending" && <Badge variant="outline">chờ</Badge>}
                      {it.status === "running" && <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin inline" /> đang chạy</Badge>}
                      {it.status === "done" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> xong</Badge>}
                      {it.status === "error" && <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"><AlertCircle className="w-3 h-3 mr-1 inline" /> lỗi</Badge>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{it.entities?.length ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]" title={it.error}>{it.error ?? ""}</td>
                    <td className="px-3 py-2 text-right">
                      {it.status === "error" && (
                        <Button variant="ghost" size="sm" onClick={() => retryOne(i)}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Thử với 1 văn bản
        </div>
        <ClinicalNlpPanel source="batch-preview" />
      </Card>
    </div>
  );
}
