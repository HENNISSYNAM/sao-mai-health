import { useState } from "react";
import { useMedicalIntelligence, type MedicalInsight } from "@/hooks/useMedicalIntelligence";
import { useMedicalResearch } from "@/hooks/useMedicalResearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink, RefreshCw, BookOpen, FlaskConical, Brain, Activity, Globe2, Calendar,
  Sparkles, Stethoscope, Users, Zap, Network, FileText, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "all", label: "Tất cả", icon: BookOpen },
  { id: "infectious_diseases", label: "Truyền nhiễm", icon: Activity },
  { id: "chronic_diseases", label: "Mãn tính", icon: FlaskConical },
  { id: "ai_medicine", label: "AI Y tế", icon: Brain },
  { id: "public_health", label: "YT Cộng đồng", icon: Globe2 },
];

const URGENCY_STYLE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
  normal: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

type AudienceMode = "clinician" | "community";

export default function Research() {
  const [tab, setTab] = useState<"insights" | "research" | "news">("insights");
  const [category, setCategory] = useState<string>("all");
  const [mode, setMode] = useState<AudienceMode>("community");

  const { insights, isLoading: loadingInsights, isSynthesizing, triggerSynthesis } =
    useMedicalIntelligence(category, 30);
  const { articles, isLoading: loadingArticles, isFetching, triggerFetch } =
    useMedicalResearch(category, 30);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 max-w-6xl">
      {/* Header — Bộ não y tế */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              Bộ não Y tế
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Nền tảng dữ liệu y học tự học — đối chiếu chéo{" "}
              <span className="font-semibold text-foreground">nghiên cứu khoa học (PubMed)</span> với{" "}
              <span className="font-semibold text-foreground">tin tức dịch tễ cộng đồng</span> để sinh tri thức thế hệ mới.
            </p>
          </div>
        </div>

        {/* Audience toggle */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-muted self-start sm:self-auto">
          <button
            onClick={() => setMode("community")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all",
              mode === "community"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" /> Cộng đồng
          </button>
          <button
            onClick={() => setMode("clinician")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all",
              mode === "clinician"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Stethoscope className="h-3.5 w-3.5" /> Chuyên gia
          </button>
        </div>
      </div>

      {/* Pipeline indicator */}
      <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="font-medium">PubMed/NIH</span>
            </div>
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-medium">Tin dịch tễ VN</span>
            </div>
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-medium">AI Cross-Evidence</span>
            </div>
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">Tri thức mới</span>
            </div>
            <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">
              Tự động 6:30 & 18:30 ICT
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" /> Tri thức AI
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5 text-xs sm:text-sm">
            <FlaskConical className="h-3.5 w-3.5" /> Nghiên cứu
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5" /> Dịch tễ
          </TabsTrigger>
        </TabsList>

        {/* Category filter (shared) */}
        <ScrollArea className="w-full mt-3">
          <div className="flex gap-1.5 pb-1">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-all",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* TAB 1: Insights */}
        <TabsContent value="insights" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {insights.length} tri thức · chế độ{" "}
              <span className="font-semibold text-foreground">
                {mode === "clinician" ? "Chuyên gia" : "Cộng đồng"}
              </span>
            </p>
            <Button
              onClick={triggerSynthesis}
              disabled={isSynthesizing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Sparkles className={cn("h-4 w-4", isSynthesizing && "animate-pulse")} />
              {isSynthesizing ? "Đang tổng hợp…" : "Sinh tri thức"}
            </Button>
          </div>

          {loadingInsights ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Bộ não chưa sinh tri thức nào</p>
                <p className="text-xs mt-1">Cần thêm nghiên cứu PubMed và tin tức dịch tễ để AI đối chiếu.</p>
                <Button onClick={triggerSynthesis} variant="link" className="mt-2">
                  Kích hoạt tổng hợp ngay
                </Button>
              </CardContent>
            </Card>
          ) : (
            insights.map((ins) => <InsightCard key={ins.id} insight={ins} mode={mode} />)
          )}
        </TabsContent>

        {/* TAB 2: Research (PubMed) */}
        <TabsContent value="research" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {articles.length} bài · Nguồn: PubMed/NIH (NLM)
            </p>
            <Button onClick={triggerFetch} disabled={isFetching} variant="outline" size="sm" className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              {isFetching ? "Đang quét…" : "Cập nhật PubMed"}
            </Button>
          </div>

          {loadingArticles ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Chưa có nghiên cứu nào.</p>
              </CardContent>
            </Card>
          ) : (
            articles.map((a) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base sm:text-lg leading-snug">{a.title}</CardTitle>
                    <a
                      href={a.pubmed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                    {a.journal && <span className="font-medium italic">{a.journal}</span>}
                    {a.publication_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {a.publication_date}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">PMID: {a.pmid}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {a.ai_summary_vi && (
                    <div className="rounded-md bg-accent/40 p-3 text-sm">
                      <p>{a.ai_summary_vi}</p>
                      {a.ai_clinical_relevance && (
                        <p className="mt-2 text-xs text-muted-foreground italic">💡 {a.ai_clinical_relevance}</p>
                      )}
                    </div>
                  )}
                  {a.abstract && !a.ai_summary_vi && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{a.abstract}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB 3: News (community surveillance) */}
        <TabsContent value="news" className="mt-4">
          <Card>
            <CardContent className="py-6 text-center">
              <Activity className="h-10 w-10 mx-auto mb-3 text-primary opacity-60" />
              <p className="text-sm font-medium">Tin dịch tễ cộng đồng</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Tin tức và cảnh báo cộng đồng được tổng hợp tại trang Giám sát.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href="/surveillance">
                  <Globe2 className="h-4 w-4 mr-2" /> Mở trang Giám sát
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Insight Card ---------------- */
function InsightCard({ insight, mode }: { insight: MedicalInsight; mode: AudienceMode }) {
  const summary = mode === "clinician" ? insight.clinician_summary : insight.community_summary;
  const recs =
    insight.recommendations && typeof insight.recommendations === "object"
      ? (insight.recommendations as any)[mode] || []
      : [];

  return (
    <Card className="hover:shadow-md transition-all border-l-4 border-l-primary/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className={cn("text-[10px] gap-1 border", URGENCY_STYLE[insight.urgency_level])}>
            {insight.urgency_level === "critical" && <AlertTriangle className="h-3 w-3" />}
            {insight.urgency_level === "high" && <Zap className="h-3 w-3" />}
            {insight.urgency_level.toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" />
            Tin cậy {Math.round(insight.confidence_score * 100)}%
          </Badge>
          {insight.novelty_score >= 0.6 && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              ✨ Mới
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true, locale: vi })}
          </span>
        </div>
        <CardTitle className="text-base sm:text-lg leading-snug">{insight.title_vi}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm leading-relaxed">{summary}</p>

        {insight.key_findings && insight.key_findings.length > 0 && (
          <div className="rounded-md bg-muted/40 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Phát hiện chính
            </p>
            <ul className="text-xs space-y-1">
              {insight.key_findings.slice(0, 4).map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary mt-0.5">▸</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recs.length > 0 && (
          <div className="rounded-md bg-primary/5 border border-primary/15 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-primary">
              {mode === "clinician" ? "Khuyến nghị lâm sàng" : "Hành động khuyến nghị"}
            </p>
            <ul className="text-xs space-y-1">
              {recs.slice(0, 4).map((r: string, i: number) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence sources */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
          {insight.research_sources && insight.research_sources.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FlaskConical className="h-3 w-3" />
              <span>{insight.research_sources.length} nghiên cứu</span>
              {insight.research_sources.slice(0, 2).map((r) => (
                <a
                  key={r.pmid}
                  href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary underline-offset-2 hover:underline"
                  title={r.title}
                >
                  PMID:{r.pmid}
                </a>
              ))}
            </div>
          )}
          {insight.news_sources && insight.news_sources.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{insight.news_sources.length} tin dịch tễ</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
