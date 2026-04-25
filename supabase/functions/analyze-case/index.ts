import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseData } = await req.json();
    console.log('Analyzing case:', caseData);

    // Prepare disease context
    const diseaseInfo: Record<string, any> = {
      'D01': { name: 'Sốt xuất huyết Dengue', typical_symptoms: ['fever', 'headache', 'muscle_pain', 'joint_pain', 'rash'], severity_indicators: ['bleeding', 'severe_abdominal_pain', 'persistent_vomiting'], treatment: 'Theo dõi sát, bù nước, hạ sốt. Nhập viện nếu có dấu hiệu cảnh báo.', isolation: 'Cách ly muỗi trong 5 ngày đầu, dùng màn chống muỗi.' },
      'D02': { name: 'Bệnh tay chân miệng', typical_symptoms: ['fever', 'mouth_sores', 'hand_rash', 'foot_rash'], severity_indicators: ['high_fever', 'seizures', 'difficulty_breathing'], treatment: 'Điều trị triệu chứng, giữ vệ sinh miệng, theo dõi biến chứng.', isolation: 'Cách ly ít nhất 7 ngày, tránh tiếp xúc gần.' },
      'D03': { name: 'COVID-19', typical_symptoms: ['fever', 'cough', 'difficulty_breathing', 'loss_taste', 'loss_smell'], severity_indicators: ['severe_breathing_difficulty', 'chest_pain', 'low_oxygen'], treatment: 'Cách ly, theo dõi SpO2, điều trị theo phác đồ. Nhập viện nếu nặng.', isolation: 'Cách ly 7-10 ngày, đeo khẩu trang, vệ sinh tay.' },
      'D04': { name: 'Nhiễm khuẩn đường hô hấp', typical_symptoms: ['fever', 'cough', 'sore_throat', 'difficulty_breathing'], severity_indicators: ['high_fever', 'severe_difficulty_breathing', 'chest_pain'], treatment: 'Kháng sinh nếu cần, giữ ấm, uống nhiều nước.', isolation: 'Hạn chế tiếp xúc khi có triệu chứng, đeo khẩu trang.' },
      'D05': { name: 'Sốt rét (Malaria)', typical_symptoms: ['fever', 'chills', 'sweating', 'headache', 'muscle_pain'], severity_indicators: ['severe_anemia', 'organ_failure', 'altered_consciousness'], treatment: 'Thuốc chống sốt rét theo phác đồ, nhập viện nếu nặng.', isolation: 'Ngủ màn chống muỗi, diệt muỗi môi trường.' },
      'D06': { name: 'Cúm A/H1N1', typical_symptoms: ['fever', 'cough', 'sore_throat', 'body_aches', 'fatigue'], severity_indicators: ['severe_breathing_difficulty', 'pneumonia', 'high_fever'], treatment: 'Oseltamivir trong 48h đầu, theo dõi sát, nhập viện nếu nặng.', isolation: 'Cách ly 7 ngày, đeo khẩu trang, vệ sinh tay.' },
      'dengue': { name: 'Sốt xuất huyết Dengue', typical_symptoms: ['fever', 'headache', 'muscle_pain'], severity_indicators: ['bleeding'], treatment: 'Theo dõi sát, bù nước.', isolation: 'Cách ly muỗi.' },
      'tcm': { name: 'Tay chân miệng', typical_symptoms: ['fever', 'mouth_sores'], severity_indicators: ['high_fever'], treatment: 'Điều trị triệu chứng.', isolation: 'Cách ly 7 ngày.' },
      'covid19': { name: 'COVID-19', typical_symptoms: ['fever', 'cough'], severity_indicators: ['low_oxygen'], treatment: 'Cách ly, theo dõi SpO2.', isolation: 'Cách ly 7-10 ngày.' },
      'ari': { name: 'Viêm hô hấp', typical_symptoms: ['fever', 'cough'], severity_indicators: ['chest_pain'], treatment: 'Kháng sinh nếu cần.', isolation: 'Đeo khẩu trang.' },
    };

    const disease = diseaseInfo[caseData.disease_code] || {
      name: caseData.disease_code || 'Không xác định',
      typical_symptoms: [], severity_indicators: [],
      treatment: 'Cần đánh giá thêm', isolation: 'Theo khuyến cáo Y tế'
    };

    const symptoms = caseData.symptoms || {};
    const symptomsList = Object.entries(symptoms)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const systemPrompt = `Bạn là Bác sĩ AI chuyên về dịch tễ và bệnh truyền nhiễm tại HCMC Health Hub.
Nhiệm vụ: Phân tích ca bệnh và đưa ra đề xuất y khoa.

Thông tin ca bệnh:
- Bệnh: ${disease.name} (${caseData.disease_code})
- Tuổi/Giới: ${caseData.patient_age_bucket || 'N/A'} / ${caseData.patient_gender || 'N/A'}
- Khu vực: ${caseData.district_id || 'N/A'}, ${caseData.ward_id || 'N/A'}
- Triệu chứng: ${symptomsList.join(', ') || 'Không có'}
- Ngày: ${caseData.occurred_at}

Trả về JSON:
{
  "diagnosis_confidence": "high/medium/low",
  "severity_level": "mild/moderate/severe",
  "key_findings": ["..."],
  "recommendations": {
    "immediate_actions": ["..."],
    "monitoring": ["..."],
    "treatment": "${disease.treatment}",
    "isolation": "${disease.isolation}"
  },
  "risk_factors": ["..."],
  "follow_up": "...",
  "alert_level": "green/yellow/orange/red"
}
Chỉ trả về JSON hợp lệ.`;

    let analysis;

    try {
      const result = await callAIWithFallback({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Phân tích ca bệnh này và đưa ra đề xuất y khoa chi tiết.' }
        ],
        temperature: 0.7,
        functionName: 'analyze-case',
      });

      // Parse JSON from AI response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(result.content);
      }
    } catch (e) {
      console.warn('AI failed or parse error, using fallback analysis:', e);
      analysis = {
        diagnosis_confidence: 'medium',
        severity_level: 'moderate',
        key_findings: ['Đang đánh giá dựa trên dữ liệu có sẵn', `Bệnh: ${disease.name}`, `Triệu chứng: ${symptomsList.length > 0 ? symptomsList.join(', ') : 'Chưa ghi nhận'}`],
        recommendations: {
          immediate_actions: ['Theo dõi sát triệu chứng', 'Bù nước đầy đủ'],
          monitoring: ['Nhiệt độ mỗi 4-6h', 'Các triệu chứng cảnh báo'],
          treatment: disease.treatment,
          isolation: disease.isolation
        },
        risk_factors: ['Cần đánh giá thêm dựa trên tiền sử bệnh'],
        follow_up: 'Tái khám sau 3-5 ngày hoặc khi có dấu hiệu nặng hơn',
        alert_level: 'yellow'
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Case analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
