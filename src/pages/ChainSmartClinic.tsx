import { ChainShell } from "@/components/chain/ChainShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCheckInPanel } from "@/components/shared/QRCheckInPanel";
import { useAssistantSkill } from "@/store/useAssistantSkill";
import {
  Stethoscope, QrCode, Bot, Users, CheckCircle2, Clock, Pill,
} from "lucide-react";

const QUEUE = [
  { num: "A-12", name: "Lê Thị H.", spec: "Nội tổng quát", wait: 4, status: "calling" },
  { num: "A-13", name: "Trần Văn M.", spec: "Tim mạch", wait: 12, status: "waiting" },
  { num: "B-04", name: "Phạm Quốc B.", spec: "Hô hấp", wait: 18, status: "waiting" },
  { num: "B-05", name: "Đỗ Thị L.", spec: "Hô hấp", wait: 24, status: "waiting" },
  { num: "C-09", name: "Vũ Anh T.", spec: "Da liễu", wait: 32, status: "notified" },
];

export default function ChainSmartClinic() {
  const openAssistant = useAssistantSkill((s) => s.open);

  return (
    <ChainShell>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary" /> AI Smart Clinic</h2>
        <p className="text-sm text-muted-foreground">QR Check-in · AI Triage · Doctor Assistant · Queue Board — giảm 30-40% thời gian chờ.</p>
      </div>

      {/* Consolidated AI Assistant entry */}
      <Card className="p-4 mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-semibold flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Trợ lý AI dùng chung</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI Triage và Doctor Assistant đã được gộp vào trợ lý AI nổi (góc dưới phải). Chọn kỹ năng phù hợp.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openAssistant("triage")}>
              <Stethoscope className="w-4 h-4 mr-1" /> AI Triage
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openAssistant("doctor")}>
              <Pill className="w-4 h-4 mr-1" /> Doctor Assistant
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4 h-auto">
          <TabsTrigger value="checkin"><QrCode className="w-4 h-4 mr-1" /> QR Check-in</TabsTrigger>
          <TabsTrigger value="queue"><Users className="w-4 h-4 mr-1" /> Queue Board</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin">
          <Card className="p-5">
            <div className="mb-3">
              <h3 className="font-bold flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> QR Check-in 60 giây</h3>
              <p className="text-xs text-muted-foreground">Dùng chung component với Campaigns. Ở Smart Clinic là phiên mô phỏng — phiếu khám không ghi DB.</p>
            </div>
            <QRCheckInPanel mode="clinic" />
          </Card>
        </TabsContent>

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
