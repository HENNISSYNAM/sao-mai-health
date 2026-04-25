// Cross-Evidence Synthesizer: "Bộ não y tế" tự sinh tri thức từ
// đối chiếu nghiên cứu PubMed × tin tức dịch tễ cộng đồng (community_alerts + case_events)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "infectious_diseases",
  "chronic_diseases",
  "ai_medicine",
  "public_health",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1) Lấy nghiên cứu PubMed mới nhất (7 ngày)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: research } = await supabase
      .from("medical_research_articles")
      .select("pmid, title, abstract, journal, doi, topic_category, ai_summary_vi, mesh_terms, publication_date")
      .gte("fetched_at", sevenDaysAgo)
      .order("publication_date", { ascending: false, nullsFirst: false })
      .limit(40);

    // 2) Lấy tin tức dịch tễ cộng đồng gần nhất (community_alerts + case_events)
    const { data: alerts } = await supabase
      .from("community_alerts")
      .select("category, description, severity, address, created_at, ai_classification")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: cases } = await supabase
      .from("case_events")
      .select("disease_code, occurred_at, district_id, source")
      .gte("occurred_at", sevenDaysAgo)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if ((!research || research.length === 0) && (!alerts || alerts.length === 0)) {
      return new Response(
        JSON.stringify({ success: true, generated: 0, reason: "Insufficient input data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalGenerated = 0;
    const allInsights: any[] = [];

    // 3) Sinh insight cho từng category
    for (const category of CATEGORIES) {
      const catResearch = (research || []).filter((r) => r.topic_category === category).slice(0, 8);
      if (catResearch.length === 0) continue;

      // Tin dịch tễ phù hợp với category (đơn giản hoá: infectious & public_health dùng alerts/cases)
      const relevantAlerts = ["infectious_diseases", "public_health"].includes(category)
        ? (alerts || []).slice(0, 10)
        : [];
      const relevantCases = category === "infectious_diseases" ? (cases || []).slice(0, 20) : [];

      const researchBlock = catResearch
        .map(
          (r, i) =>
            `[R${i + 1}] PMID:${r.pmid} | ${r.journal || "?"} | "${r.title}"\n   Tóm tắt VI: ${r.ai_summary_vi || (r.abstract?.slice(0, 300) ?? "")}`
        )
        .join("\n\n");

      const newsBlock =
        relevantAlerts.length > 0
          ? relevantAlerts
              .map(
                (a, i) =>
                  `[N${i + 1}] ${a.created_at?.slice(0, 10)} | ${a.category}/${a.severity} | ${a.address || "?"} | ${a.description?.slice(0, 200)}`
              )
              .join("\n")
          : "(không có tin dịch tễ cộng đồng phù hợp tuần này)";

      const casesBlock =
        relevantCases.length > 0
          ? `Ca thực tế ghi nhận: ${relevantCases.length} ca, các bệnh: ${[...new Set(relevantCases.map((c) => c.disease_code))].join(", ")}`
          : "";

      // 4) Gọi Gemini để đối chiếu chéo
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Bạn là "Bộ não y tế" - một hệ thống AI tổng hợp tri thức y học thế hệ mới.

NHIỆM VỤ: Đối chiếu CHÉO giữa nghiên cứu khoa học (PubMed) và tin tức dịch tễ cộng đồng Việt Nam để sinh ra TRI THỨC MỚI có giá trị thực tiễn.

QUY TẮC:
1. KHÔNG bịa - chỉ tổng hợp từ dữ liệu được cung cấp
2. Mỗi insight phải dẫn nguồn cụ thể (PMID nghiên cứu + tin nào)
3. Viết SONG MODE: bản chuyên gia (chính xác y khoa) + bản cộng đồng (dễ hiểu, hành động)
4. Chỉ tạo insight thực sự MỚI - tránh lặp lại tri thức đã biết phổ thông
5. Đánh giá độ tin cậy (confidence) trung thực: dữ liệu yếu = score thấp

Trả về JSON theo schema. Tối đa 2 insight chất lượng cao cho danh mục này.`,
            },
            {
              role: "user",
              content: `Danh mục: ${category}
Khu vực: Việt Nam

=== NGHIÊN CỨU KHOA HỌC PUBMED (7 ngày qua) ===
${researchBlock}

=== TIN TỨC DỊCH TỄ CỘNG ĐỒNG (7 ngày qua) ===
${newsBlock}

${casesBlock}

Hãy sinh tri thức mới bằng cách đối chiếu các nguồn trên.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_insights",
                description: "Submit cross-evidence insights",
                parameters: {
                  type: "object",
                  properties: {
                    insights: {
                      type: "array",
                      maxItems: 2,
                      items: {
                        type: "object",
                        properties: {
                          title_vi: { type: "string" },
                          insight_type: {
                            type: "string",
                            enum: ["cross_evidence", "trend_synthesis", "clinical_alert", "public_briefing"],
                          },
                          disease_codes: { type: "array", items: { type: "string" } },
                          clinician_summary: { type: "string", description: "Bản chuyên gia y khoa, có dẫn chứng" },
                          community_summary: { type: "string", description: "Bản cộng đồng dễ hiểu, có hành động cụ thể" },
                          key_findings: { type: "array", items: { type: "string" }, maxItems: 5 },
                          recommendations: {
                            type: "object",
                            properties: {
                              clinician: { type: "array", items: { type: "string" } },
                              community: { type: "array", items: { type: "string" } },
                            },
                            required: ["clinician", "community"],
                          },
                          referenced_research: {
                            type: "array",
                            items: { type: "string", description: "PMID được dẫn" },
                          },
                          referenced_news_indices: {
                            type: "array",
                            items: { type: "integer", description: "Chỉ số N1, N2... (0-indexed)" },
                          },
                          confidence_score: { type: "number", minimum: 0, maximum: 1 },
                          novelty_score: { type: "number", minimum: 0, maximum: 1 },
                          urgency_level: { type: "string", enum: ["low", "normal", "high", "critical"] },
                        },
                        required: [
                          "title_vi",
                          "insight_type",
                          "clinician_summary",
                          "community_summary",
                          "key_findings",
                          "recommendations",
                          "confidence_score",
                          "urgency_level",
                        ],
                      },
                    },
                  },
                  required: ["insights"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_insights" } },
        }),
      });

      if (!aiResp.ok) {
        console.error(`AI error for ${category}:`, aiResp.status, await aiResp.text());
        continue;
      }

      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.warn(`No tool call for ${category}`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error(`Parse error for ${category}:`, e);
        continue;
      }

      // 5) Map dẫn nguồn → insert
      for (const ins of parsed.insights || []) {
        const researchSources = (ins.referenced_research || [])
          .map((pmid: string) => {
            const r = catResearch.find((x) => x.pmid === pmid);
            return r ? { pmid: r.pmid, title: r.title, journal: r.journal, doi: r.doi } : null;
          })
          .filter(Boolean);

        const newsSources = (ins.referenced_news_indices || [])
          .map((idx: number) => {
            const a = relevantAlerts[idx];
            return a
              ? {
                  category: a.category,
                  description: a.description?.slice(0, 200),
                  severity: a.severity,
                  date: a.created_at,
                  source_name: "Community Alert",
                }
              : null;
          })
          .filter(Boolean);

        const row = {
          insight_type: ins.insight_type || "cross_evidence",
          topic_category: category,
          disease_codes: ins.disease_codes || [],
          region: "VN",
          title_vi: ins.title_vi,
          clinician_summary: ins.clinician_summary,
          community_summary: ins.community_summary,
          key_findings: ins.key_findings || [],
          recommendations: ins.recommendations || {},
          research_sources: researchSources,
          news_sources: newsSources,
          evidence_count: researchSources.length + newsSources.length,
          confidence_score: ins.confidence_score ?? 0.7,
          novelty_score: ins.novelty_score ?? 0.5,
          urgency_level: ins.urgency_level || "normal",
          ai_model: "google/gemini-2.5-flash",
        };

        const { error } = await supabase.from("medical_intelligence_insights").insert(row);
        if (error) console.error("Insert error:", error);
        else {
          totalGenerated++;
          allInsights.push(row.title_vi);
        }
      }
    }

    console.log(`✅ Generated ${totalGenerated} insights:`, allInsights);

    return new Response(
      JSON.stringify({
        success: true,
        generated: totalGenerated,
        titles: allInsights,
        sources: {
          research: research?.length || 0,
          alerts: alerts?.length || 0,
          cases: cases?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Synthesizer error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
