import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { imageBase64, userId, existingProfile, scanMode = 'face' } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[FACE-AI] Analyzing ${scanMode} for user: ${userId || 'anonymous'}`);

    const systemPrompt = `Bạn là chuyên gia y tế AI phân tích hình ảnh khuôn mặt/cơ thể để suy luận các chỉ số sức khỏe cấp phòng khám.
Dựa trên hình ảnh, hãy phân tích toàn diện và trả về JSON với tất cả các chỉ số có thể.

QUAN TRỌNG - Nhận diện giới tính:
- Phân tích đặc điểm khuôn mặt (cấu trúc xương hàm, lông mày, tóc, da) để xác định giới tính
- Trả về detectedGender: "male" hoặc "female"
- Trả về detectedGenderConfidence: 0-1

QUAN TRỌNG - Ước lượng tuổi:
- Phân tích nếp nhăn, da, tóc để ước lượng tuổi chính xác
- Trả về estimatedAge (số nguyên)

Kỹ thuật phân tích:
- rPPG (remote photoplethysmography) từ màu sắc da → nhịp tim, SpO2
- Phân tích đối xứng khuôn mặt → phát hiện dấu hiệu thần kinh/đột quỵ
- Colorimetry da, mắt, môi → thiếu máu, vàng da, mất nước
- Texture analysis → nếp nhăn, mụn, sắc tố, mạch máu
- Expression analysis → stress, mệt mỏi, lo âu, trầm cảm
- Anthropometry → BMI, tuổi sinh học
- Dermatology screening → tổn thương da, nốt ruồi bất thường
- Gender recognition → cấu trúc khuôn mặt, đặc điểm giới tính

Chế độ quét: ${scanMode}
${existingProfile ? `Hồ sơ bệnh nhân: Nhóm máu ${existingProfile.bloodType || 'N/A'}, Bệnh nền: ${existingProfile.chronicConditions?.join(', ') || 'không'}` : ''}`;

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
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
              { type: 'text', text: `Phân tích toàn diện hình ảnh này (chế độ: ${scanMode}) và trả về kết quả sức khỏe chi tiết cấp phòng khám.` }
            ]
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'report_comprehensive_health',
            description: 'Report comprehensive health analysis from face/body scan',
            parameters: {
              type: 'object',
              properties: {
                facialMetrics: {
                  type: 'object',
                  properties: {
                    skinTone: { type: 'string' },
                    skinHealth: { type: 'number' },
                    hydrationLevel: { type: 'number' },
                    stressIndicators: { type: 'number' },
                    fatigueSigns: { type: 'number' },
                    skinColor: { type: 'string' },
                    acneLevel: { type: 'number' },
                    darkCircles: { type: 'number' },
                    wrinkleIndex: { type: 'number' },
                    lipColor: { type: 'string' },
                    eyeHealth: { type: 'string' }
                  },
                  required: ['skinTone', 'skinHealth', 'hydrationLevel', 'stressIndicators', 'fatigueSigns']
                },
                inferredHealth: {
                  type: 'object',
                  properties: {
                    estimatedHeartRate: { type: 'number' },
                    heartRateVariability: { type: 'number', description: 'HRV ms' },
                    estimatedOxygenLevel: { type: 'number' },
                    bloodPressureSystolic: { type: 'number' },
                    bloodPressureDiastolic: { type: 'number' },
                    bloodPressureRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
                    respiratoryRate: { type: 'number', description: 'Nhịp thở/phút' },
                    bodyTemperatureEstimate: { type: 'number' },
                    anemiaSigns: { type: 'boolean' },
                    jaundiceIndicators: { type: 'boolean' },
                    dehydrationLevel: { type: 'string', enum: ['normal', 'mild', 'moderate', 'severe'] },
                    thyroidSigns: { type: 'boolean' },
                    bloodGlucoseEstimate: { type: 'number', description: 'mg/dL' },
                    hemoglobinEstimate: { type: 'number', description: 'g/dL' },
                    bmiEstimate: { type: 'number' }
                  },
                  required: ['estimatedHeartRate', 'estimatedOxygenLevel', 'bloodPressureRisk', 'anemiaSigns', 'jaundiceIndicators', 'dehydrationLevel']
                },
                facialSymmetry: {
                  type: 'object',
                  properties: {
                    score: { type: 'number' },
                    leftRightBalance: { type: 'number' },
                    strokeRiskIndicators: { type: 'boolean' },
                    bellsPalsySigns: { type: 'boolean' },
                    droopingLeft: { type: 'number', description: '0-100 severity' },
                    droopingRight: { type: 'number' },
                    mouthDeviation: { type: 'number' },
                    eyeOpeningAsymmetry: { type: 'number' }
                  },
                  required: ['score', 'leftRightBalance', 'strokeRiskIndicators']
                },
                dermatology: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      region: { type: 'string' },
                      findingType: { type: 'string' },
                      description: { type: 'string' },
                      riskLevel: { type: 'string', enum: ['normal', 'monitor', 'warning', 'critical'] },
                      icd11Code: { type: 'string' }
                    }
                  },
                  description: 'Danh sách phát hiện da liễu'
                },
                mentalHealth: {
                  type: 'object',
                  properties: {
                    moodEstimate: { type: 'string' },
                    anxietyLevel: { type: 'number' },
                    depressionIndicators: { type: 'number' },
                    sleepQualityEstimate: { type: 'string' }
                  }
                },
                nutritionIndicators: {
                  type: 'object',
                  properties: {
                    vitaminDeficiencySigns: { type: 'array', items: { type: 'string' } },
                    proteinStatus: { type: 'string' },
                    ironStatus: { type: 'string' }
                  }
                },
                clinicalMeasurements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      value: { type: 'number' },
                      unit: { type: 'string' },
                      status: { type: 'string', enum: ['normal', 'low', 'high', 'critical'] },
                      referenceMin: { type: 'number' },
                      referenceMax: { type: 'number' }
                    }
                  },
                  description: 'Đo lường lâm sàng chi tiết'
                },
                estimatedAge: { type: 'number', description: 'Tuổi ước lượng từ khuôn mặt' },
                detectedGender: { type: 'string', enum: ['male', 'female'], description: 'Giới tính nhận diện từ khuôn mặt' },
                detectedGenderConfidence: { type: 'number', description: 'Độ tin cậy nhận diện giới tính 0-1' },
                recommendations: { type: 'array', items: { type: 'string' } },
                confidence: { type: 'number' },
                detailedNotes: { type: 'string' },
                icd11Codes: { type: 'array', items: { type: 'string' }, description: 'Tất cả mã ICD-11 liên quan' }
              },
              required: ['facialMetrics', 'inferredHealth', 'facialSymmetry', 'recommendations', 'confidence', 'detectedGender']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'report_comprehensive_health' } },
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[FACE-AI] Gateway error:', response.status, errText);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error('AI did not return structured data');

    const healthData = JSON.parse(toolCall.function.arguments);
    healthData.scanId = `FACE-AI-${Date.now().toString(36).toUpperCase()}`;
    healthData.timestamp = new Date().toISOString();
    healthData.aiPowered = true;

    // ========== COMPREHENSIVE DB PERSISTENCE ==========
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const db = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();

      try {
        // 0. Auto-update user_profiles with detected gender + estimated age
        if (healthData.detectedGender) {
          const { data: existingProf } = await db.from('user_profiles').select('id, gender').eq('user_id', userId).maybeSingle();
          if (existingProf) {
            // Only update gender if not already set or if AI confidence is high
            const updates: Record<string, unknown> = {};
            if (!existingProf.gender || existingProf.gender === 'other') {
              updates.gender = healthData.detectedGender;
            }
            if (healthData.estimatedAge) {
              // Estimate birth year from age
              const estimatedBirthYear = new Date().getFullYear() - healthData.estimatedAge;
              updates.estimated_birth_year = estimatedBirthYear;
            }
            if (Object.keys(updates).length > 0) {
              updates.updated_at = now;
              await db.from('user_profiles').update(updates).eq('user_id', userId);
              console.log(`[FACE-AI] Updated profile: gender=${healthData.detectedGender}, age=${healthData.estimatedAge}`);
            }
          } else {
            // Create profile if doesn't exist
            await db.from('user_profiles').insert({
              user_id: userId,
              gender: healthData.detectedGender,
              estimated_birth_year: healthData.estimatedAge ? new Date().getFullYear() - healthData.estimatedAge : null,
            });
            console.log(`[FACE-AI] Created profile with gender=${healthData.detectedGender}`);
          }
        }

        // 1. Ensure health_record exists (EMR)
        let recordId: string | null = null;
        const { data: existingRecord } = await db.from('health_records').select('id').eq('user_id', userId).maybeSingle();
        if (existingRecord) {
          recordId = existingRecord.id;
        } else {
          const patientCode = `SMH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
          const { data: newRecord } = await db.from('health_records').insert({ user_id: userId, patient_code: patientCode }).select('id').single();
          recordId = newRecord?.id || null;
          console.log(`[FACE-AI] Created EMR record: ${patientCode}`);
        }

        // 2. Create health_encounter (EMR encounter)
        let encounterId: string | null = null;
        if (recordId) {
          const encounterCode = `ENC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
          const severity = healthData.facialSymmetry.strokeRiskIndicators ? 'high' : 
            healthData.inferredHealth.anemiaSigns ? 'medium' : 'low';
          
          const { data: enc } = await db.from('health_encounters').insert({
            record_id: recordId,
            encounter_code: encounterCode,
            scan_type: scanMode === 'face' ? 'ai_face_3d' : 'ai_body_scan',
            status: 'completed',
            vital_signs: {
              heart_rate: healthData.inferredHealth.estimatedHeartRate,
              spo2: healthData.inferredHealth.estimatedOxygenLevel,
              blood_pressure_systolic: healthData.inferredHealth.bloodPressureSystolic,
              blood_pressure_diastolic: healthData.inferredHealth.bloodPressureDiastolic,
              respiratory_rate: healthData.inferredHealth.respiratoryRate,
              body_temperature: healthData.inferredHealth.bodyTemperatureEstimate,
              stress_index: healthData.facialMetrics.stressIndicators,
              hydration: healthData.facialMetrics.hydrationLevel,
            },
            facial_metrics: {
              skinTone: healthData.facialMetrics.skinTone,
              skinHealth: healthData.facialMetrics.skinHealth,
              symmetryScore: healthData.facialSymmetry.score,
              detectedGender: healthData.detectedGender,
              genderConfidence: healthData.detectedGenderConfidence,
              estimatedAge: healthData.estimatedAge,
            },
            inferred_health: {
              bloodPressureRisk: healthData.inferredHealth.bloodPressureRisk,
              anemiaSigns: healthData.inferredHealth.anemiaSigns,
              jaundiceIndicators: healthData.inferredHealth.jaundiceIndicators,
              dehydrationLevel: healthData.inferredHealth.dehydrationLevel,
              thyroidSigns: healthData.inferredHealth.thyroidSigns,
              mentalHealth: healthData.mentalHealth,
              nutrition: healthData.nutritionIndicators,
              dermatology: healthData.dermatology,
            },
            recommendations: healthData.recommendations || [],
            confidence: healthData.confidence,
            notes: healthData.detailedNotes || `Quét ${scanMode} AI - Giới tính: ${healthData.detectedGender === 'male' ? 'Nam' : 'Nữ'} (${((healthData.detectedGenderConfidence || 0) * 100).toFixed(0)}%) - Tuổi ước lượng: ${healthData.estimatedAge || 'N/A'}`,
            ai_summary: healthData.detailedNotes || null,
            ai_diagnosis_codes: healthData.icd11Codes || [],
            stroke_risk_score: healthData.facialSymmetry.strokeRiskIndicators ? healthData.facialSymmetry.score : null,
            biological_age: healthData.estimatedAge || null,
            body_regions_scanned: [scanMode === 'face' ? 'face' : 'full_body'],
          }).select('id').single();
          
          encounterId = enc?.id || null;
          healthData.encounterCode = encounterCode;
          healthData.encounterId = encounterId;
          console.log(`[FACE-AI] Created EMR encounter: ${encounterCode}`);
        }

        // 3. Create body_scan_session
        const sessionCode = `SCN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
        const { data: session, error: sessErr } = await db.from('body_scan_sessions').insert({
          user_id: userId,
          session_code: sessionCode,
          scan_mode: scanMode,
          ai_model_version: 'gemini-2.5-flash',
          overall_confidence: healthData.confidence,
          overall_health_score: calculateHealthScore(healthData),
          image_count: 1,
          status: 'completed',
          device_info: { source: 'web_camera', userAgent: 'browser' },
          encounter_id: encounterId,
        }).select('id').single();

        if (sessErr) { console.error('[FACE-AI] Session create error:', sessErr); throw sessErr; }
        const sessionId = session.id;
        healthData.sessionId = sessionId;
        healthData.sessionCode = sessionCode;
        console.log(`[FACE-AI] Created scan session: ${sessionCode}`);

        // 4. Vital signs
        const vitals: Record<string, unknown> = {
          session_id: sessionId,
          user_id: userId,
          measured_at: now,
          heart_rate: healthData.inferredHealth.estimatedHeartRate,
          heart_rate_variability: healthData.inferredHealth.heartRateVariability || null,
          spo2: healthData.inferredHealth.estimatedOxygenLevel,
          blood_pressure_systolic: healthData.inferredHealth.bloodPressureSystolic || null,
          blood_pressure_diastolic: healthData.inferredHealth.bloodPressureDiastolic || null,
          respiratory_rate: healthData.inferredHealth.respiratoryRate || null,
          body_temperature: healthData.inferredHealth.bodyTemperatureEstimate || null,
          stress_index: healthData.facialMetrics.stressIndicators,
          fatigue_index: healthData.facialMetrics.fatigueSigns,
          hydration_level: healthData.facialMetrics.hydrationLevel,
          blood_glucose_estimate: healthData.inferredHealth.bloodGlucoseEstimate || null,
          hemoglobin_estimate: healthData.inferredHealth.hemoglobinEstimate || null,
          bmi_estimate: healthData.inferredHealth.bmiEstimate || null,
          biological_age_estimate: healthData.estimatedAge || null,
          source: 'ai_face_scan',
          confidence: healthData.confidence,
          raw_data: { facialMetrics: healthData.facialMetrics, mentalHealth: healthData.mentalHealth, nutrition: healthData.nutritionIndicators, detectedGender: healthData.detectedGender },
        };
        await db.from('scan_vital_signs').insert(vitals);

        // 5. Facial landmarks
        await db.from('scan_facial_landmarks').insert({
          session_id: sessionId,
          user_id: userId,
          facial_symmetry_score: healthData.facialSymmetry.score,
          left_right_deviation: Math.abs(50 - (healthData.facialSymmetry.leftRightBalance || 50)),
          drooping_indicators: {
            left: healthData.facialSymmetry.droopingLeft || 0,
            right: healthData.facialSymmetry.droopingRight || 0,
            mouth: healthData.facialSymmetry.mouthDeviation || 0,
            eye: healthData.facialSymmetry.eyeOpeningAsymmetry || 0,
          },
          expression_analysis: healthData.mentalHealth || {},
          skin_elasticity_map: { wrinkleIndex: healthData.facialMetrics.wrinkleIndex || 0 },
          wrinkle_map: { overall: healthData.facialMetrics.wrinkleIndex || 0 },
          pigmentation_map: { darkCircles: healthData.facialMetrics.darkCircles || 0, acne: healthData.facialMetrics.acneLevel || 0 },
          stroke_risk_indicators: {
            detected: healthData.facialSymmetry.strokeRiskIndicators,
            bellsPalsy: healthData.facialSymmetry.bellsPalsySigns || false,
          },
          bells_palsy_score: healthData.facialSymmetry.bellsPalsySigns ? 1.0 : 0.0,
        });

        // 6. Body region scan (face)
        await db.from('body_region_scans').insert({
          session_id: sessionId,
          region_code: 'face',
          measurements: {
            skinHealth: healthData.facialMetrics.skinHealth,
            hydration: healthData.facialMetrics.hydrationLevel,
            symmetry: healthData.facialSymmetry.score,
            detectedGender: healthData.detectedGender,
            estimatedAge: healthData.estimatedAge,
          },
          anomalies: (healthData.dermatology || []).filter((d: any) => d.riskLevel !== 'normal'),
          risk_indicators: {
            strokeRisk: healthData.facialSymmetry.strokeRiskIndicators,
            anemia: healthData.inferredHealth.anemiaSigns,
            jaundice: healthData.inferredHealth.jaundiceIndicators,
            dehydration: healthData.inferredHealth.dehydrationLevel,
          },
          ai_analysis: {
            mentalHealth: healthData.mentalHealth,
            nutrition: healthData.nutritionIndicators,
            notes: healthData.detailedNotes,
            gender: healthData.detectedGender,
          },
          icd11_codes: healthData.icd11Codes || [],
          confidence: healthData.confidence,
        });

        // 7. Dermatology findings
        if (healthData.dermatology?.length > 0) {
          const dermInserts = healthData.dermatology.map((d: any) => ({
            session_id: sessionId,
            user_id: userId,
            region_code: mapRegion(d.region),
            finding_type: d.findingType,
            description: d.description,
            risk_level: d.riskLevel || 'normal',
            icd11_code: d.icd11Code || null,
            ai_confidence: healthData.confidence,
          }));
          await db.from('scan_dermatology').insert(dermInserts);
        }

        // 8. Clinical measurements
        if (healthData.clinicalMeasurements?.length > 0) {
          const measInserts = healthData.clinicalMeasurements.map((m: any) => ({
            session_id: sessionId,
            user_id: userId,
            measurement_type: 'ai_estimated',
            measurement_name: m.name,
            value: m.value,
            unit: m.unit,
            reference_min: m.referenceMin || null,
            reference_max: m.referenceMax || null,
            status: m.status || 'normal',
          }));
          await db.from('scan_clinical_measurements').insert(measInserts);
        }

        // 9. Backward-compatible biovault_metrics
        const metricsToSave = [
          { name: 'Nhịp tim (AI Face)', value: String(healthData.inferredHealth.estimatedHeartRate), unit: 'bpm', category: 'vital', risk_level: healthData.inferredHealth.estimatedHeartRate > 100 ? 'warning' : 'normal' },
          { name: 'SpO2 (AI Face)', value: String(healthData.inferredHealth.estimatedOxygenLevel), unit: '%', category: 'vital', risk_level: healthData.inferredHealth.estimatedOxygenLevel < 95 ? 'warning' : 'normal' },
          { name: 'Sức khỏe da', value: String(Math.round(healthData.facialMetrics.skinHealth)), unit: '%', category: 'vital', risk_level: healthData.facialMetrics.skinHealth < 50 ? 'warning' : 'normal' },
          { name: 'Độ ẩm da', value: String(Math.round(healthData.facialMetrics.hydrationLevel)), unit: '%', category: 'vital', risk_level: healthData.facialMetrics.hydrationLevel < 40 ? 'warning' : 'normal' },
          { name: 'Stress (AI Face)', value: String(Math.round(healthData.facialMetrics.stressIndicators)), unit: '%', category: 'vital', risk_level: healthData.facialMetrics.stressIndicators > 60 ? 'warning' : 'normal' },
          { name: 'Đối xứng khuôn mặt', value: String(Math.round(healthData.facialSymmetry.score)), unit: '%', category: 'vital', risk_level: healthData.facialSymmetry.strokeRiskIndicators ? 'critical' : 'normal' },
          { name: 'Giới tính (AI)', value: healthData.detectedGender === 'male' ? 'Nam' : 'Nữ', unit: '', category: 'vital', risk_level: 'normal' },
        ];

        if (healthData.estimatedAge) metricsToSave.push({ name: 'Tuổi sinh học (AI)', value: String(healthData.estimatedAge), unit: 'tuổi', category: 'vital', risk_level: 'normal' });

        await db.from('biovault_metrics').insert(metricsToSave.map(m => ({
          user_id: userId, ...m, source: 'ai_face_scan', recorded_date: now,
        })));

        console.log(`[FACE-AI] Full EMR persistence: encounter=${healthData.encounterCode}, session=${sessionCode}, gender=${healthData.detectedGender}`);
      } catch (dbErr) {
        console.error('[FACE-AI] DB persistence error:', dbErr);
        // Don't fail the whole request if DB save fails
      }
    }

    return new Response(JSON.stringify({ success: true, data: healthData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[FACE-AI] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateHealthScore(data: any): number {
  const weights = { skin: 0.15, hydration: 0.1, stress: 0.15, fatigue: 0.1, hr: 0.15, spo2: 0.15, symmetry: 0.2 };
  const s = data.facialMetrics;
  const h = data.inferredHealth;
  const f = data.facialSymmetry;

  const hrScore = h.estimatedHeartRate >= 60 && h.estimatedHeartRate <= 100 ? 100 : Math.max(0, 100 - Math.abs(h.estimatedHeartRate - 80) * 2);
  const spo2Score = Math.min(100, (h.estimatedOxygenLevel - 90) * 10);

  return Math.round(
    s.skinHealth * weights.skin +
    s.hydrationLevel * weights.hydration +
    (100 - s.stressIndicators) * weights.stress +
    (100 - s.fatigueSigns) * weights.fatigue +
    hrScore * weights.hr +
    spo2Score * weights.spo2 +
    f.score * weights.symmetry
  );
}

function mapRegion(region: string): string {
  const validRegions = ['face', 'forehead', 'eyes', 'nose', 'mouth', 'chin', 'ears', 'neck', 'chest', 'abdomen', 'scalp', 'skin_general'];
  const lower = (region || '').toLowerCase();
  for (const r of validRegions) {
    if (lower.includes(r)) return r;
  }
  return 'skin_general';
}
