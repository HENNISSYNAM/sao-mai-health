import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MedicalInsight {
  id: string;
  insight_type: "cross_evidence" | "trend_synthesis" | "clinical_alert" | "public_briefing";
  topic_category: string;
  disease_codes: string[] | null;
  region: string;
  title_vi: string;
  clinician_summary: string;
  community_summary: string;
  key_findings: string[] | null;
  recommendations: any;
  research_sources: Array<{ pmid: string; title: string; journal?: string; doi?: string }> | null;
  news_sources: Array<{ category: string; description: string; severity: string; date: string; source_name: string }> | null;
  evidence_count: number;
  confidence_score: number;
  novelty_score: number;
  urgency_level: "low" | "normal" | "high" | "critical";
  ai_model: string;
  generated_at: string;
  view_count: number;
}

export function useMedicalIntelligence(category?: string, limit: number = 20) {
  const [insights, setInsights] = useState<MedicalInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = supabase
        .from("medical_intelligence_insights")
        .select("*")
        .is("superseded_by", null)
        .order("generated_at", { ascending: false })
        .limit(limit);
      if (category && category !== "all") q = q.eq("topic_category", category);
      const { data, error } = await q;
      if (error) throw error;
      setInsights((data || []) as any);
    } catch (e: any) {
      console.error("Load insights error:", e);
      toast.error("Lỗi tải tri thức", { description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  const triggerSynthesis = useCallback(async () => {
    setIsSynthesizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("cross-evidence-synthesizer", { body: {} });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Sinh ${data.generated} tri thức mới`, {
          description: `Từ ${data.sources?.research || 0} nghiên cứu × ${data.sources?.alerts || 0} tin dịch tễ`,
        });
        await load();
      }
    } catch (e: any) {
      toast.error("Lỗi tổng hợp tri thức", { description: e.message });
    } finally {
      setIsSynthesizing(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("medical-intelligence-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "medical_intelligence_insights" },
        (payload) => {
          setInsights((prev) => [payload.new as MedicalInsight, ...prev].slice(0, limit));
        }
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [limit]);

  return { insights, isLoading, isSynthesizing, load, triggerSynthesis };
}
