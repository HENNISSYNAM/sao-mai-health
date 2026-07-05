import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Sparkles, Stethoscope, Pill, FlaskConical, Activity, UserRound, FileText } from "lucide-react";

interface Entity {
  idx: number;
  text: string;
  start: number;
  end: number;
  type: "symptom" | "lab" | "disease" | "drug" | "patient_info";
  normalized: string;
  code: string | null;
  code_system: string | null;
  context: { negated: boolean; family: boolean; historical: boolean; hypothetical: boolean; subject: string };
  value: string | null;
  unit: string | null;
  confidence: number;
}

interface NlpResult {
  entities: Entity[];
  relations?: { source: number; target: number; type: string }[];
  summary?: string;
  primary_diagnoses?: { icd10: string; name: string }[];
  primary_medications?: { name: string; rxnorm?: string; dose?: string; frequency?: string }[];
}

const SAMPLE_TEXT = `Bệnh nhân nam, 58 tuổi, tiền sử tăng huyết áp 5 năm. Mẹ có tiền sử tiểu đường type 2.
Vào viện vì đau ngực trái lan cánh tay trái 2 giờ, kèm khó thở nhẹ. Không sốt, không ho.
Khám: HA 168/95 mmHg, mạch 92 l/ph, SpO2 96%. HbA1c 7.4%, LDL 168 mg/dL, Troponin T 0.08 ng/mL.
Chẩn đoán: Cơn đau thắt ngực không ổn định (I20.0), Tăng huyết áp nguyên phát (I10), Rối loạn lipid máu (E78.5).
Điều trị: Aspirin 81mg 1v/ngày, Atorvastatin 40mg 1v tối, Amlodipine 5mg 1v sáng, Nitroglycerin ngậm dưới lưỡi khi đau.`;

const TYPE_META: Record<Entity["type"], { label: string; icon: any; cls: string }> = {
  symptom: { label: "Triệu chứng", icon: Activity, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  lab: { label: "Xét nghiệm", icon: FlaskConical, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  disease: { label: "Bệnh", icon: Stethoscope, cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  drug: { label: "Thuốc", icon: Pill, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  patient_info: { label: "BN", icon: UserRound, cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30" },
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
  const [filter, setFilter] = useState<Entity["type"] | "all">("all");

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
      setResult(data.result as NlpResult);
      toast.success(`Trích xuất ${data.result?.entities?.length ?? 0} khái niệm y khoa`);
    } catch (e: any) {
      toast.error("Lỗi NLP: " + (e?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  }

  const highlighted = useMemo(() => {
    if (!result?.entities?.length) return null;
    const ents = [...result.entities]
      .filter((e) => e.start >= 0 && e.end > e.start)
      .sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    ents.forEach((e, i) => {
      if (e.start < cursor) return; // skip overlaps
      if (e.start > cursor) parts.push(<span key={`t${i}`}>{text.slice(cursor, e.start)}</span>);
      const meta = TYPE_META[e.type] ?? TYPE_META.symptom;
      const neg = e.context?.negated;
      parts.push(
        <span
          key={`e${i}`}
          className={`px-1 rounded border ${meta.cls} ${neg ? "line-through opacity-70" : ""}`}
          title={`${meta.label}${e.code ? ` · ${e.code_system}:${e.code}` : ""}${neg ? " (phủ định)" : ""}${e.context?.family ? " · người nhà" : ""}${e.context?.historical ? " · tiền sử" : ""}`}
        >
          {text.slice(e.start, e.end)}
        </span>
      );
      cursor = e.end;
    });
    if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
    return parts;
  }, [result, text]);

  const filtered = useMemo(
    () => result?.entities?.filter((e) => filter === "all" || e.type === filter) ?? [],
    [result, filter]
  );

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

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading || !text.trim()}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Trích xuất khái niệm
        </Button>
        {result && (
          <span className="text-xs text-muted-foreground">
            {result.entities?.length ?? 0} entities · {result.relations?.length ?? 0} relations
          </span>
        )}
      </div>

      {result && (
        <>
          {result.summary && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="text-[10px] uppercase tracking-wide text-primary font-semibold mb-1">Tóm tắt AI</div>
              <p className="text-sm">{result.summary}</p>
            </Card>
          )}

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Văn bản đã annotate</div>
            <div className="text-sm leading-7 whitespace-pre-wrap">{highlighted}</div>
          </Card>

          <div className="flex flex-wrap gap-1.5">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Tất cả ({result.entities?.length ?? 0})</Button>
            {(Object.keys(TYPE_META) as Entity["type"][]).map((t) => {
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
                    <th className="text-left px-3 py-2">Chuẩn hoá</th>
                    <th className="text-left px-3 py-2">Mã</th>
                    <th className="text-left px-3 py-2">Ngữ cảnh</th>
                    <th className="text-right px-3 py-2">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const meta = TYPE_META[e.type] ?? TYPE_META.symptom;
                    return (
                      <tr key={e.idx} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{e.text}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {e.normalized}
                          {e.value && <span className="ml-1 font-mono text-xs">({e.value}{e.unit ? ` ${e.unit}` : ""})</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {e.code ? <span>{e.code_system}:<span className="text-primary">{e.code}</span></span> : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {e.context?.negated && <Badge variant="outline" className="text-[10px] bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300">phủ định</Badge>}
                            {e.context?.family && <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300">người nhà</Badge>}
                            {e.context?.historical && <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">tiền sử</Badge>}
                            {e.context?.hypothetical && <Badge variant="outline" className="text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300">nghi ngờ</Badge>}
                            {!e.context?.negated && !e.context?.family && !e.context?.historical && !e.context?.hypothetical && <span className="text-xs text-muted-foreground">hiện tại</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{Math.round((e.confidence ?? 0) * 100)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </Card>

          {(result.primary_diagnoses?.length || result.primary_medications?.length) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!!result.primary_diagnoses?.length && (
                <Card className="p-3">
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-rose-500" /> Chẩn đoán chính (ICD-10)</div>
                  <div className="space-y-1">
                    {result.primary_diagnoses.map((d, i) => (
                      <div key={i} className="text-sm flex justify-between"><span>{d.name}</span><code className="text-xs text-primary">{d.icd10}</code></div>
                    ))}
                  </div>
                </Card>
              )}
              {!!result.primary_medications?.length && (
                <Card className="p-3">
                  <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Pill className="w-4 h-4 text-emerald-500" /> Thuốc chính (RxNorm)</div>
                  <div className="space-y-1">
                    {result.primary_medications.map((m, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex justify-between"><span className="font-medium">{m.name}</span>{m.rxnorm && <code className="text-xs text-primary">{m.rxnorm}</code>}</div>
                        {(m.dose || m.frequency) && <div className="text-xs text-muted-foreground">{[m.dose, m.frequency].filter(Boolean).join(" · ")}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
