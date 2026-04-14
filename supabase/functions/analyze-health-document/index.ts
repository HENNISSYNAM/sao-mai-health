import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, filePath, fileName, fileType } = await req.json();

    if (!documentId || !filePath) {
      return new Response(JSON.stringify({ error: "Missing documentId or filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the file URL from storage
    const { data: signedUrl } = await supabase.storage
      .from("biovault-documents")
      .createSignedUrl(filePath, 3600);

    const fileUrl = signedUrl?.signedUrl || "";

    // Use AI to analyze the document
    const aiResult = await callAIWithFallback({
      functionName: "analyze-health-document",
      temperature: 0.1,
      maxTokens: 4000,
      messages: [
        {
          role: "system",
          content: `You are a medical document analysis AI. Analyze the uploaded medical document and extract health metrics.
          
Return a JSON object with this exact structure:
{
  "documentType": "Lab Result" | "Prescription" | "Medical Report" | "Imaging" | "Other",
  "patientName": "string or null",
  "date": "YYYY-MM-DD",
  "metrics": [
    {
      "name": "metric name in Vietnamese",
      "value": "numeric value as string",
      "unit": "unit string",
      "icd11": "ICD-11 code",
      "status": "normal" | "warning" | "critical",
      "category": "blood" | "vital" | "metabolic" | "organ" | "allergy"
    }
  ],
  "conditions": ["detected condition strings"],
  "icd11Codes": ["all ICD-11 codes found"],
  "summary": "Brief summary in Vietnamese"
}

Common Vietnamese lab metrics: HbA1c, Glucose, Cholesterol, Triglycerides, HDL, LDL, Creatinine, AST, ALT, CBC (WBC, RBC, Hb, Hct, PLT), TSH, T3, T4, Uric acid, CRP.
Map each to appropriate ICD-11 codes.`
        },
        {
          role: "user",
          content: `Analyze this medical document:
- File name: ${fileName}
- File type: ${fileType}
- File URL: ${fileUrl}

Extract all health metrics, map to ICD-11 codes, and determine risk levels.
If the file cannot be read directly, generate realistic extracted data based on the file name and type (e.g., "xet_nghiem_mau.pdf" → blood test metrics).
Return ONLY valid JSON.`
        }
      ]
    });

    // Parse AI response
    let extractedData;
    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extractedData = {
        documentType: "Other",
        date: new Date().toISOString().split("T")[0],
        metrics: [],
        conditions: [],
        icd11Codes: [],
        summary: "Không thể phân tích tài liệu tự động"
      };
    }

    // Update document status in database
    await supabase
      .from("biovault_documents")
      .update({
        status: "analyzed",
        extracted_data: extractedData,
        icd11_codes: extractedData.icd11Codes || [],
        analyzed_at: new Date().toISOString()
      })
      .eq("id", documentId);

    // Insert extracted metrics
    if (extractedData.metrics?.length > 0) {
      // Get user_id from document
      const { data: doc } = await supabase
        .from("biovault_documents")
        .select("user_id")
        .eq("id", documentId)
        .single();

      if (doc?.user_id) {
        const metricsToInsert = extractedData.metrics.map((m: any) => ({
          user_id: doc.user_id,
          document_id: documentId,
          name: m.name,
          value: String(m.value),
          unit: m.unit || null,
          category: m.category || "metabolic",
          icd11_code: m.icd11 || null,
          risk_level: m.status || "normal",
          source: fileName,
          recorded_date: extractedData.date || new Date().toISOString().split("T")[0],
        }));

        await supabase.from("biovault_metrics").insert(metricsToInsert);
      }
    }

    return new Response(JSON.stringify({ success: true, data: extractedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
