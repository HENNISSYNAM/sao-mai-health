import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Prepare disease context
    const diseaseInfo: Record<string, any> = {
      'D01': {
        name: 'Sốt xuất huyết Dengue',
        typical_symptoms: ['fever', 'headache', 'muscle_pain', 'joint_pain', 'rash'],
        severity_indicators: ['bleeding', 'severe_abdominal_pain', 'persistent_vomiting'],
        treatment: 'Theo dõi sát, bù nước, hạ sốt. Nhập viện nếu có dấu hiệu cảnh báo.',
        isolation: 'Cách ly muỗi trong 5 ngày đầu, dùng màn chống muỗi.'
      },
      'D02': {
        name: 'Bệnh tay chân miệng',
        typical_symptoms: ['fever', 'mouth_sores', 'hand_rash', 'foot_rash'],
        severity_indicators: ['high_fever', 'seizures', 'difficulty_breathing'],
        treatment: 'Điều trị triệu chứng, giữ vệ sinh miệng, theo dõi biến chứng.',
        isolation: 'Cách ly ít nhất 7 ngày, tránh tiếp xúc gần.'
      },
      'D03': {
        name: 'COVID-19',
        typical_symptoms: ['fever', 'cough', 'difficulty_breathing', 'loss_taste', 'loss_smell'],
        severity_indicators: ['severe_breathing_difficulty', 'chest_pain', 'low_oxygen'],
        treatment: 'Cách ly, theo dõi SpO2, điều trị theo phác đồ. Nhập viện nếu nặng.',
        isolation: 'Cách ly 7-10 ngày, đeo khẩu trang, vệ sinh tay.'
      },
      'D04': {
        name: 'Nhiễm khuẩn đường hô hấp',
        typical_symptoms: ['fever', 'cough', 'sore_throat', 'difficulty_breathing'],
        severity_indicators: ['high_fever', 'severe_difficulty_breathing', 'chest_pain'],
        treatment: 'Kháng sinh nếu cần, giữ ấm, uống nhiều nước.',
        isolation: 'Hạn chế tiếp xúc khi có triệu chứng, đeo khẩu trang.'
      },
      'D05': {
        name: 'Sốt rét (Malaria)',
        typical_symptoms: ['fever', 'chills', 'sweating', 'headache', 'muscle_pain'],
        severity_indicators: ['severe_anemia', 'organ_failure', 'altered_consciousness'],
        treatment: 'Thuốc chống sốt rét theo phác đồ, nhập viện nếu nặng.',
        isolation: 'Ngủ màn chống muỗi, diệt muỗi môi trường.'
      },
      'D06': {
        name: 'Cúm A/H1N1',
        typical_symptoms: ['fever', 'cough', 'sore_throat', 'body_aches', 'fatigue'],
        severity_indicators: ['severe_breathing_difficulty', 'pneumonia', 'high_fever'],
        treatment: 'Oseltamivir trong 48h đầu, theo dõi sát, nhập viện nếu nặng.',
        isolation: 'Cách ly 7 ngày, đeo khẩu trang, vệ sinh tay.'
      }
    };

    const disease = diseaseInfo[caseData.disease_code] || {
      name: 'Không xác định',
      typical_symptoms: [],
      severity_indicators: [],
      treatment: 'Cần đánh giá thêm',
      isolation: 'Theo khuyến cáo Y tế'
    };

    // Build symptom context
    const symptoms = caseData.symptoms || {};
    const symptomsList = Object.entries(symptoms)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);

    const systemPrompt = `Bạn là Bác sĩ AI chuyên về dịch tễ và bệnh truyền nhiễm tại HCMC Health Hub.
Nhiệm vụ: Phân tích ca bệnh và đưa ra đề xuất y khoa dựa trên triệu chứng và bối cảnh dịch tễ.

Thông tin ca bệnh:
- Bệnh: ${disease.name} (${caseData.disease_code})
- Tuổi/Giới: ${caseData.patient_age_bucket || 'N/A'} / ${caseData.patient_gender || 'N/A'}
- Khu vực: ${caseData.district_id || 'N/A'}, ${caseData.ward_id || 'N/A'}
- Triệu chứng báo cáo: ${symptomsList.join(', ') || 'Không có'}
- Ngày báo cáo: ${caseData.occurred_at}

Triệu chứng điển hình của ${disease.name}: ${disease.typical_symptoms.join(', ')}
Dấu hiệu cảnh báo: ${disease.severity_indicators.join(', ')}

Hãy trả lời theo format JSON sau:
{
  "diagnosis_confidence": "high/medium/low",
  "severity_level": "mild/moderate/severe",
  "key_findings": ["Điểm 1", "Điểm 2", "Điểm 3"],
  "recommendations": {
    "immediate_actions": ["Hành động 1", "Hành động 2"],
    "monitoring": ["Theo dõi 1", "Theo dõi 2"],
    "treatment": "${disease.treatment}",
    "isolation": "${disease.isolation}"
  },
  "risk_factors": ["Yếu tố nguy cơ 1", "Yếu tố nguy cơ 2"],
  "follow_up": "Thời gian tái khám và lưu ý",
  "alert_level": "green/yellow/orange/red"
}

Chỉ trả về JSON hợp lệ, không có text khác.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Phân tích ca bệnh này và đưa ra đề xuất y khoa chi tiết.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('AI analysis:', aiResponse);

    // Parse JSON from AI response
    let analysis;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', e);
      // Fallback analysis
      analysis = {
        diagnosis_confidence: 'medium',
        severity_level: 'moderate',
        key_findings: ['Cần đánh giá thêm', 'Theo dõi triệu chứng'],
        recommendations: {
          immediate_actions: ['Theo dõi sát', 'Bù nước'],
          monitoring: ['Nhiệt độ', 'Triệu chứng'],
          treatment: disease.treatment,
          isolation: disease.isolation
        },
        risk_factors: ['Cần đánh giá thêm'],
        follow_up: 'Tái khám sau 3-5 ngày',
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
