import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Sparkles, Stethoscope, Pill, FlaskConical, Activity, Hash, FileText, Copy } from "lucide-react";

export type NlpEntityType =
  | "TRIỆU_CHỨNG"
  | "TÊN_XÉT_NGHIỆM"
  | "KẾT_QUẢ_XÉT_NGHIỆM"
  | "CHẨN_ĐOÁN"
  | "THUỐC";

export interface NlpEntity {
  text: string;
  position: [number, number];
  type: NlpEntityType;
  assertions: Array<"isNegated" | "isFamily" | "isHistorical">;
  candidates: string[];
}

export interface NlpResult {
  entities: NlpEntity[];
}

const SAMPLE_TEXT = `Bệnh nhân nam 70 tuổi bị bệnh 1 tuần nay, ho đờm xanh, tức ngực, đau thượng vị, ợ hơi, được chẩn đoán mắc bệnh trào ngược dạ dày - thực quản. Bệnh nhân có tiền sử sử dụng Chlorpheniramine 0.4 MG/ML, Capsaicin 0.38 MG/ML, đã tiến hành tổng phân tích tế bào máu bằng máy lazer (tbm): WBC:14,43; NEUT% (Tỷ lệ % bạch cầu trung tính):76,4; LYPH% (Tỷ lệ bạch cầu lympho):12,8;`;

const TYPE_META: Record<NlpEntityType, { label: string; icon: any; cls: string }> = {
  "TRIỆU_CHỨNG": { label: "Triệu chứng", icon: Activity, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  "TÊN_XÉT_NGHIỆM": { label: "Tên XN", icon: FlaskConical, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  "KẾT_QUẢ_XÉT_NGHIỆM": { label: "Kết quả XN", icon: Hash, cls: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  "CHẨN_ĐOÁN": { label: "Chẩn đoán", icon: Stethoscope, cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  "THUỐC": { label: "Thuốc", icon: Pill, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
};

const ASSERTION_META: Record<string, { label: string; cls: string }> = {
  isNegated: { label: "Phủ định", cls: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300" },
  isFamily: { label: "Người nhà", cls: "bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300" },
  isHistorical: { label: "Tiền sử", cls: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300" },
};

interface Props {
  initialText?: string;
  source?: string;
  docId?: string;
  compact?: boolean;
}

export function ClinicalNlpPanel({ initialText = "", source = "manual", docId, compact }: Props) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NlpResult | null>(null);
  const [filter, setFilter] = useState<NlpEntityType | "all">("all");

  async function run() {
    if (!text.trim()) { toast.error("Nhập văn bản y khoa trước"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("clinical-nlp", {
        body: { text, source, doc_id: docId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ entities: data?.entities ?? [] });
      toast.success(`Trích xuất ${data?.entities?.length ?? 0} khái niệm y khoa`);
    } catch (e: any) {
      toast.error("Lỗi NLP: " + (e?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  }

  // Highlight using char-offset positions (code-point aware)
  const highlighted = useMemo(() => {
    if (!result?.entities?.length) return null;
    const cp = Array.from(text);
    const ents = [...result.entities]
      .filter((e) => e.position?.[0] >= 0 && e.position?.[1] > e.position[0])
      .sort((a, b) => a.position[0] - b.position[0]);
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    ents.forEach((e, i) => {
      const [s, en] = e.position;
      if (s < cursor) return;
      if (s > cursor) parts.push(<span key={`t${i}`}>{cp.slice(cursor, s).join("")}</span>);
      const meta = TYPE_META[e.type] ?? TYPE_META["TRIỆU_CHỨNG"];
      const neg = e.assertions?.includes("isNegated");
      parts.push(
        <span
          key={`e${i}`}
          className={`px-1 rounded border ${meta.cls} ${neg ? "line-through opacity-70" : ""}`}
          title={`${meta.label}${e.candidates?.length ? " · " + e.candidates.join(", ") : ""}${e.assertions?.length ? " · " + e.assertions.join(", ") : ""}`}
        >
          {cp.slice(s, en).join("")}
        </span>
      );
      cursor = en;
    });
    if (cursor < cp.length) parts.push(<span key="tail">{cp.slice(cursor).join("")}</span>);
    return parts;
  }, [result, text]);

  const filtered = useMemo(
    () => result?.entities?.filter((e) => filter === "all" || e.type === filter) ?? [],
    [result, filter]
  );

  function copyJson() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.entities, null, 2));
    toast.success("Đã copy JSON output");
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Clinical NLP — chuẩn hoá khái niệm y khoa</h3>
            <p className="text-xs text-muted-foreground">Trích xuất triệu chứng, chẩn đoán (ICD-10), thuốc (RxNorm), xét nghiệm và ngữ cảnh (phủ định, tiền sử, người nhà).</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE_TEXT)}>
            <FileText className="w-4 h-4 mr-1" /> Ví dụ mẫu
          </Button>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Dán ghi chú bác sĩ, giấy xuất viện, kết quả xét nghiệm hoặc tóm tắt EHR..."
        rows={compact ? 4 : 8}
        className="font-mono text-sm"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={run} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Trích xuất khái niệm
        </Button>
        {result && (
          <>
            <span className="text-xs text-muted-foreground">
              {result.entities?.length ?? 0} khái niệm
            </span>
            <Button variant="outline" size="sm" onClick={copyJson}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy JSON
            </Button>
          </>
        )}
      </div>

      {result && (
        <>
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Văn bản đã annotate</div>
            <div className="text-sm leading-7 whitespace-pre-wrap">{highlighted}</div>
          </Card>

          <div className="flex flex-wrap gap-1.5">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Tất cả ({result.entities?.length ?? 0})</Button>
            {(Object.keys(TYPE_META) as NlpEntityType[]).map((t) => {
              const count = result.entities?.filter((e) => e.type === t).length ?? 0;
              if (count === 0) return null;
              const Icon = TYPE_META[t].icon;
              return (
                <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)}>
                  <Icon className="w-3.5 h-3.5 mr-1" /> {TYPE_META[t].label} ({count})
                </Button>
              );
            })}
          </div>

          <Card className="p-0 overflow-hidden">
            <ScrollArea className="max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Khái niệm</th>
                    <th className="text-left px-3 py-2">Loại</th>
                    <th className="text-left px-3 py-2">Vị trí</th>
                    <th className="text-left px-3 py-2">Assertions</th>
                    <th className="text-left px-3 py-2">Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, i) => {
                    const meta = TYPE_META[e.type] ?? TYPE_META["TRIỆU_CHỨNG"];
                    return (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{e.text}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          [{e.position[0]}, {e.position[1]}]
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {e.assertions?.length ? e.assertions.map((a) => (
                              <Badge key={a} variant="outline" className={`text-[10px] ${ASSERTION_META[a]?.cls ?? ""}`}>
                                {ASSERTION_META[a]?.label ?? a}
                              </Badge>
                            )) : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {e.candidates?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {e.candidates.map((c) => (
                                <code key={c} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  {c}
                                </code>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </Card>
        </>
      )}
    </div>
  );
}
