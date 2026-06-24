import { useState } from "react";
import { ChainShell } from "@/components/chain/ChainShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Stethoscope, QrCode, Bot, Users, Loader2, CheckCircle2, AlertTriangle, Pill, Clock, MessageSquare, Send } from "lucide-react";

const triageColor: Record<number, string> = {
  1: "bg-rose-600 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-amber-400 text-black",
  4: "bg-emerald-500 text-white",
  5: "bg-blue-500 text-white",
};

const QUEUE = [
  { num: "A-12", name: "Lê Thị H.", spec: "Nội tổng quát", wait: 4, status: "calling" },
  { num: "A-13", name: "Trần Văn M.", spec: "Tim mạch", wait: 12, status: "waiting" },
  { num: "B-04", name: "Phạm Quốc B.", spec: "Hô hấp", wait: 18, status: "waiting" },
  { num: "B-05", name: "Đỗ Thị L.", spec: "Hô hấp", wait: 24, status: "waiting" },
  { num: "C-09", name: "Vũ Anh T.", spec: "Da liễu", wait: 32, status: "notified" },
];

const MOCK_PATIENT = {
  name: "Nguyễn Văn A · 47 tuổi · Nam",
  history: "Hen phế quản · Tiểu đường type 2 (HbA1c 7.2%) · Tăng huyết áp",
  meds: "Metformin 500mg, Amlodipine 5mg, Salbutamol khi cần",
  allergies: "Không rõ tiền sử dị ứng",
  vitals: "HA 138/86 · M 78 · SpO₂ 97% · Nhiệt độ 36.8°C",
};

export default function ChainSmartClinic() {
  // Triage
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);

  // Check-in
  const [checkinDone, setCheckinDone] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  // Doctor assistant
  const [question, setQuestion] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult] = useState<any>(null);

  async function runTriage() {
    if (!symptoms.trim()) { toast.error("Nhập triệu chứng trước."); return; }
    setTriaging(true);
    setTriageResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-triage", {
        body: { mode: "triage", symptoms, age: Number(age) || undefined },
      });
      if (error) throw error;
      setTriageResult(data?.result);
    } catch (e: any) {
      toast.error("AI lỗi: " + e.message);
    } finally {
      setTriaging(false);
    }
  }

  async function runDoctor() {
    setDocLoading(true);
    setDocResult(null);
    try {
      const summary = `${MOCK_PATIENT.name}\nTiền sử: ${MOCK_PATIENT.history}\nThuốc: ${MOCK_PATIENT.meds}\nDị ứng: ${MOCK_PATIENT.allergies}\nSinh tồn: ${MOCK_PATIENT.vitals}`;
      const { data, error } = await supabase.functions.invoke("ai-triage", {
        body: { mode: "doctor", patient_summary: summary, question: question || "Đề xuất chẩn đoán phân biệt và xét nghiệm." },
      });
      if (error) throw error;
      setDocResult(data?.result);
    } catch (e: any) {
      toast.error("AI lỗi: " + e.message);
    } finally {
      setDocLoading(false);
    }
  }

  function fakeCheckin() {
    setCheckingIn(true);
    setTimeout(() => { setCheckingIn(false); setCheckinDone(true); }, 1500);
  }

  return (
    <ChainShell>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary" /> AI Smart Clinic</h2>
        <p className="text-sm text-muted-foreground">Triage AI · QR Check-in · Doctor Assistant · Queue Board — giảm 30-40% thời gian chờ.</p>
      </div>

      <Tabs defaultValue="triage" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4 h-auto">
          <TabsTrigger value="triage"><Stethoscope className="w-4 h-4 mr-1" /> Triage</TabsTrigger>
          <TabsTrigger value="checkin"><QrCode className="w-4 h-4 mr-1" /> Check-in</TabsTrigger>
          <TabsTrigger value="doctor"><Bot className="w-4 h-4 mr-1" /> Doctor AI</TabsTrigger>
          <TabsTrigger value="queue"><Users className="w-4 h-4 mr-1" /> Queue</TabsTrigger>
        </TabsList>

        {/* TRIAGE */}
        <TabsContent value="triage" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="font-bold">AI Pre-screening</h3>
            <Textarea placeholder="Nhập triệu chứng: vd. Đau ngực trái lan ra cánh tay, kéo dài 30 phút, vã mồ hôi…" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={5} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tuổi" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
              <Button onClick={runTriage} disabled={triaging}>
                {triaging ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-1" />}
                Phân loại
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Công cụ hỗ trợ tham khảo, không thay thế bác sĩ.</p>
          </Card>

          <Card className="p-5 min-h-[280px]">
            {!triageResult ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Bot className="w-12 h-12 mb-2 opacity-30" />
                Kết quả triage hiển thị ở đây
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${triageColor[triageResult.triage_level] || "bg-muted"}`}>
                    {triageResult.triage_level}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Mức ưu tiên ESI</div>
                    <div className="font-bold">{triageResult.specialty}</div>
                    <div className="text-xs flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> ~{triageResult.estimated_wait_minutes} phút chờ</div>
                  </div>
                </div>
                <div className="text-sm">{triageResult.reasoning}</div>
                {triageResult.red_flags?.length > 0 && (
                  <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Dấu hiệu cảnh báo</div>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-rose-700 dark:text-rose-300">
                      {triageResult.red_flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* CHECK-IN */}
        <TabsContent value="checkin">
          <Card className="p-6">
            {!checkinDone ? (
              <div className="text-center max-w-md mx-auto py-8">
                <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">Quét QR tại cơ sở y tế</h3>
                <p className="text-sm text-muted-foreground mb-4">HR-NFT của bạn sẽ được nạp tự động vào hệ thống bác sĩ — không cần giấy tờ.</p>
                <Button onClick={fakeCheckin} disabled={checkingIn} size="lg">
                  {checkingIn ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xác thực on-chain…</> : "Demo: Quét QR"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <div>
                    <div className="font-bold">Hoàn tất thủ tục trong 47 giây</div>
                    <div className="text-xs text-muted-foreground">So với trung bình 15-20 phút truyền thống.</div>
                  </div>
                </div>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Bệnh nhân</div>
                  <div className="font-bold text-lg">{MOCK_PATIENT.name}</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground">Tiền sử</div>{MOCK_PATIENT.history}</div>
                    <div><div className="text-xs text-muted-foreground">Thuốc đang dùng</div>{MOCK_PATIENT.meds}</div>
                    <div><div className="text-xs text-muted-foreground">Dị ứng</div>{MOCK_PATIENT.allergies}</div>
                    <div><div className="text-xs text-muted-foreground">Sinh tồn nhập viện</div>{MOCK_PATIENT.vitals}</div>
                  </div>
                </Card>
                <div className="flex gap-2">
                  <Badge variant="outline">6 HR-NFT đã nạp</Badge>
                  <Badge variant="outline">3 đơn thuốc gần nhất</Badge>
                  <Badge variant="outline">Đã liên kết BHYT</Badge>
                </div>
                <Button variant="outline" onClick={() => setCheckinDone(false)} size="sm">Demo lại</Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* DOCTOR AI */}
        <TabsContent value="doctor" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-bold mb-2">Hồ sơ bệnh nhân</h3>
            <div className="space-y-2 text-sm">
              <div className="p-2 rounded bg-muted/50"><div className="text-xs text-muted-foreground">Bệnh nhân</div>{MOCK_PATIENT.name}</div>
              <div className="p-2 rounded bg-muted/50"><div className="text-xs text-muted-foreground">Tiền sử</div>{MOCK_PATIENT.history}</div>
              <div className="p-2 rounded bg-muted/50"><div className="text-xs text-muted-foreground">Thuốc</div>{MOCK_PATIENT.meds}</div>
              <div className="p-2 rounded bg-muted/50"><div className="text-xs text-muted-foreground">Sinh tồn</div>{MOCK_PATIENT.vitals}</div>
            </div>
            <div className="mt-4 space-y-2">
              <Textarea placeholder="Câu hỏi cho AI (vd. Bệnh nhân than đau ngực, nên xét nghiệm gì?)" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
              <Button onClick={runDoctor} disabled={docLoading} className="w-full">
                {docLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
                Hỏi AI Doctor
              </Button>
            </div>
          </Card>

          <Card className="p-5 min-h-[400px]">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> AI Doctor Assistant</h3>
            {!docResult ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-12">
                <Bot className="w-12 h-12 mb-2 opacity-30" />
                Gợi ý chẩn đoán hiển thị ở đây
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {docResult.differential_diagnosis?.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Chẩn đoán phân biệt</div>
                    <div className="space-y-1">
                      {docResult.differential_diagnosis.map((d: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                          <span>{d.name} <span className="text-xs text-muted-foreground">({d.icd10})</span></span>
                          <Badge variant={d.probability === "cao" ? "destructive" : "outline"}>{d.probability}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {docResult.drug_interactions?.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-1"><Pill className="w-4 h-4" /> Tương tác thuốc</div>
                    <ul className="text-xs space-y-0.5 list-disc list-inside text-amber-700 dark:text-amber-300">
                      {docResult.drug_interactions.map((d: string, i: number) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
                {docResult.recommended_tests?.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Xét nghiệm đề xuất</div>
                    <div className="flex flex-wrap gap-1">
                      {docResult.recommended_tests.map((t: string, i: number) => <Badge key={i} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {docResult.notes && <div className="text-xs italic text-muted-foreground">{docResult.notes}</div>}
                <Button size="sm" variant="outline" className="w-full mt-2"><Send className="w-4 h-4 mr-1" /> Kê đơn điện tử → nhà thuốc</Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* QUEUE */}
        <TabsContent value="queue">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Hàng đợi thời gian thực</h3>
              <Badge variant="outline" className="gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live</Badge>
            </div>
            <div className="space-y-2">
              {QUEUE.map((q) => (
                <div key={q.num} className={`flex items-center justify-between p-3 rounded-lg border ${
                  q.status === "calling" ? "bg-primary/10 border-primary/40" : "bg-muted/30 border-border"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                      q.status === "calling" ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"
                    }`}>{q.num}</div>
                    <div>
                      <div className="font-medium text-sm">{q.name}</div>
                      <div className="text-xs text-muted-foreground">{q.spec}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />~{q.wait} phút</div>
                    {q.status === "notified" && <Badge variant="outline" className="text-[10px] mt-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />SMS/Zalo đã gửi</Badge>}
                    {q.status === "calling" && <Badge className="text-[10px] mt-1 bg-primary">Đang gọi</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </ChainShell>
  );
}
