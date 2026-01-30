import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OnboardingInput {
  user_id: string;
  google_profile?: {
    name?: string;
    email?: string;
    locale?: string;
    age_range?: string;
  };
  device_locale?: string;
  gps_consent: boolean;
  gps_coords?: { lat: number; lon: number };
  language_preference?: string;
}

interface InferenceLog {
  field: string;
  inferred_value: string | null;
  confidence: number;
  source: string;
}

interface DigitalTwinProfile {
  user_id: string;
  language: string;
  region: { city: string | null; province: string | null; confidence: number };
  living_environment: { value: string | null; confidence: number };
  date_of_birth: string | null;
  age: number | null;
  age_group: string | null;
  health_sensitivity: { likely_sensitive: boolean; basis: string | null };
  primary_interest: string[];
  alert_threshold: string;
  inference_log: InferenceLog[];
}

// Vietnam region disease priority mapping
const regionDiseasePriority: Record<string, string[]> = {
  "Hồ Chí Minh": ["dengue", "respiratory"],
  "Hà Nội": ["respiratory", "flu"],
  "Đà Nẵng": ["dengue", "typhoid"],
  "Cần Thơ": ["dengue", "cholera"],
  "Bình Dương": ["dengue", "respiratory"],
  "Đồng Nai": ["dengue", "respiratory"],
  "default": ["dengue", "respiratory"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: OnboardingInput = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("Onboarding input:", JSON.stringify(input, null, 2));

    const inferenceLog: InferenceLog[] = [];
    
    // Phase A: AI-powered inference
    const language = input.language_preference || 
                     input.google_profile?.locale?.split('-')[0] || 
                     input.device_locale?.split('-')[0] || 
                     'vi';
    
    inferenceLog.push({
      field: "language",
      inferred_value: language,
      confidence: input.language_preference ? 100 : 80,
      source: input.language_preference ? "user_preference" : "locale_detection"
    });

    // Region inference via AI if GPS available
    let region = { city: null as string | null, province: null as string | null, confidence: 0 };
    let livingEnvironment = { value: null as string | null, confidence: 0 };
    let primaryInterest: string[] = [];

    if (input.gps_consent && input.gps_coords) {
      // Call AI to infer region from GPS
      const gpsPrompt = `Given GPS coordinates: lat=${input.gps_coords.lat}, lon=${input.gps_coords.lon} in Vietnam.
      
Determine:
1. City/Province name in Vietnamese
2. Living environment type: "Đô thị" (urban), "Ngoại ô" (suburban), or "Nông thôn" (rural)
3. Confidence level (0-100)

Return JSON only:
{
  "city": "string",
  "province": "string", 
  "living_environment": "Đô thị|Ngoại ô|Nông thôn",
  "confidence": number
}`;

      try {
        const gpsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a Vietnamese geography expert. Return ONLY valid JSON." },
              { role: "user", content: gpsPrompt }
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        });

        if (gpsResponse.ok) {
          const gpsData = await gpsResponse.json();
          const gpsContent = gpsData.choices?.[0]?.message?.content;
          const jsonMatch = gpsContent?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            region = { 
              city: parsed.city, 
              province: parsed.province, 
              confidence: parsed.confidence || 85 
            };
            livingEnvironment = { 
              value: parsed.living_environment, 
              confidence: parsed.confidence || 80 
            };
            
            // Set primary interest based on region
            const cityKey = parsed.city || "default";
            primaryInterest = regionDiseasePriority[cityKey] || regionDiseasePriority["default"];

            inferenceLog.push({
              field: "region",
              inferred_value: `${parsed.city}, ${parsed.province}`,
              confidence: parsed.confidence || 85,
              source: "gps_ai_inference"
            });

            inferenceLog.push({
              field: "living_environment",
              inferred_value: parsed.living_environment,
              confidence: parsed.confidence || 80,
              source: "gps_density_analysis"
            });
          }
        }
      } catch (e) {
        console.error("GPS inference error:", e);
      }
    }

    // Age group inference
    let ageGroup: string | null = null;
    let age: number | null = null;
    let healthSensitivity = { likely_sensitive: false, basis: null as string | null };

    if (input.google_profile?.age_range) {
      ageGroup = input.google_profile.age_range;
      inferenceLog.push({
        field: "age_group",
        inferred_value: ageGroup,
        confidence: 90,
        source: "google_profile"
      });
    } else if (input.google_profile?.email) {
      // Check for .edu domain (likely student)
      if (input.google_profile.email.includes('.edu') || 
          input.google_profile.email.includes('student')) {
        ageGroup = "18-25";
        inferenceLog.push({
          field: "age_group",
          inferred_value: ageGroup,
          confidence: 65,
          source: "email_domain_inference"
        });
      }
    }

    // Health sensitivity
    if (ageGroup) {
      if (ageGroup.includes("<18") || ageGroup.includes("0-17")) {
        healthSensitivity = { likely_sensitive: true, basis: "minor_age_group" };
      } else if (ageGroup.includes(">60") || ageGroup.includes("60+") || ageGroup.includes("65+")) {
        healthSensitivity = { likely_sensitive: true, basis: "senior_age_group" };
      }
    }

    // Build profile
    const profile: DigitalTwinProfile = {
      user_id: input.user_id,
      language,
      region,
      living_environment: livingEnvironment,
      date_of_birth: null,
      age,
      age_group: ageGroup,
      health_sensitivity: healthSensitivity,
      primary_interest: primaryInterest,
      alert_threshold: "high_risk_only",
      inference_log: inferenceLog
    };

    // Generate user message
    const needsAgeQuestion = !ageGroup || inferenceLog.find(l => l.field === "age_group")?.confidence! < 60;
    
    let userMessage = "";
    if (language === 'vi') {
      const regionText = region.city ? `khu vực ${region.city}` : "khu vực chưa xác định";
      const ageText = ageGroup ? `nhóm tuổi ${ageGroup}` : "tuổi chưa rõ";
      
      userMessage = `Chào mừng bạn! Mình đã tự suy luận một số thông tin để tiết kiệm thời gian:\n\n`;
      userMessage += `📍 Vị trí: ${region.city || 'Chưa xác định'}\n`;
      userMessage += `🏠 Môi trường: ${livingEnvironment.value || 'Chưa xác định'}\n`;
      userMessage += `👤 Nhóm tuổi: ${ageGroup || 'Chưa rõ'}\n`;
      userMessage += `🎯 Ưu tiên theo dõi: ${primaryInterest.join(', ') || 'Chung'}\n\n`;
      
      if (needsAgeQuestion) {
        userMessage += `Để cá nhân hóa cảnh báo sức khỏe, bạn có thể cho biết ngày sinh không? (Tùy chọn)`;
      } else {
        userMessage += `Thông tin trên có chính xác không?`;
      }
    } else {
      userMessage = `Welcome! I've automatically inferred some information to save time:\n\n`;
      userMessage += `📍 Location: ${region.city || 'Unknown'}\n`;
      userMessage += `🏠 Environment: ${livingEnvironment.value || 'Unknown'}\n`;
      userMessage += `👤 Age group: ${ageGroup || 'Unknown'}\n`;
      userMessage += `🎯 Health priorities: ${primaryInterest.join(', ') || 'General'}\n\n`;
      
      if (needsAgeQuestion) {
        userMessage += `To personalize health alerts, would you like to provide your date of birth? (Optional)`;
      } else {
        userMessage += `Is this information correct?`;
      }
    }

    // Determine what questions to ask
    const questions_needed: string[] = [];
    if (needsAgeQuestion) {
      questions_needed.push("date_of_birth");
    }
    // Optional chronic conditions question
    questions_needed.push("chronic_conditions");

    return new Response(JSON.stringify({
      profile,
      user_message: userMessage,
      questions_needed,
      actions: ["confirm", "edit", "skip"]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in onboarding-agent:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
