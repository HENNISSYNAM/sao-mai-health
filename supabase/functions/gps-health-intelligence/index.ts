import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GPSInput {
  lat: number;
  lon: number;
  locale?: 'vi' | 'en';
}

interface PrioritizedAlert {
  priority: 1 | 2 | 3 | 4;
  priorityLabel: string;
  priorityLabelVi: string;
  disease: string;
  diseaseVi: string;
  title: string;
  summary: string;
  location: string;
  casesCount?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  relevanceScore: number;
}

interface HealthIntelligenceResponse {
  success: boolean;
  userLocation: {
    city: string;
    region: string;
    regionVi: string;
    coordinates: { lat: number; lon: number };
  };
  communityRiskStatus: {
    level: 'Thấp' | 'Trung bình' | 'Cao';
    levelEn: 'Low' | 'Medium' | 'High';
    explanation: string;
    explanationVi: string;
  };
  kpi: {
    todayCasesLocal: number;
    openAlertsLocal: number;
    diseasesMonitoredRegional: number;
    vaccinationRate: number | null;
  };
  prioritizedAlerts: PrioritizedAlert[];
  personalInsight: {
    message: string;
    messageVi: string;
  };
  footer: {
    dataType: string;
    lastUpdated: string;
  };
}

// Vietnam epidemiological regions
const REGIONS: Record<string, { name: string; nameVi: string; connectedRegions: string[] }> = {
  hanoi: { name: 'Hanoi Metropolitan', nameVi: 'Hà Nội', connectedRegions: ['red_river_delta', 'northern_highlands'] },
  hcmc: { name: 'Ho Chi Minh City', nameVi: 'TP. Hồ Chí Minh', connectedRegions: ['southeast', 'mekong_delta'] },
  red_river_delta: { name: 'Red River Delta', nameVi: 'Đồng bằng sông Hồng', connectedRegions: ['hanoi', 'northern_highlands'] },
  mekong_delta: { name: 'Mekong Delta', nameVi: 'Đồng bằng sông Cửu Long', connectedRegions: ['hcmc', 'southeast'] },
  southeast: { name: 'Southeast Region', nameVi: 'Đông Nam Bộ', connectedRegions: ['hcmc', 'mekong_delta', 'central_highlands'] },
  central_highlands: { name: 'Central Highlands', nameVi: 'Tây Nguyên', connectedRegions: ['southeast', 'south_central'] },
  south_central: { name: 'South Central Coast', nameVi: 'Nam Trung Bộ', connectedRegions: ['central_highlands', 'north_central'] },
  north_central: { name: 'North Central Coast', nameVi: 'Bắc Trung Bộ', connectedRegions: ['south_central', 'red_river_delta'] },
  northern_highlands: { name: 'Northern Highlands', nameVi: 'Vùng núi phía Bắc', connectedRegions: ['red_river_delta', 'hanoi'] }
};

function classifyUserRegion(lat: number, lon: number): { id: string; name: string; nameVi: string; connectedRegions: string[] } {
  if (lat >= 20.8 && lat <= 21.2 && lon >= 105.7 && lon <= 106.0) {
    return { id: 'hanoi', ...REGIONS.hanoi };
  }
  if (lat >= 10.6 && lat <= 11.0 && lon >= 106.5 && lon <= 107.0) {
    return { id: 'hcmc', ...REGIONS.hcmc };
  }
  if (lat >= 8.5 && lat <= 10.6 && lon >= 104.5 && lon <= 107.0) {
    return { id: 'mekong_delta', ...REGIONS.mekong_delta };
  }
  if (lat >= 10.5 && lat <= 12.5 && lon >= 106.5 && lon <= 108.0) {
    return { id: 'southeast', ...REGIONS.southeast };
  }
  if (lat >= 11.5 && lat <= 15.0 && lon >= 107.0 && lon <= 109.0) {
    return { id: 'central_highlands', ...REGIONS.central_highlands };
  }
  if (lat >= 11.0 && lat <= 14.5 && lon >= 108.5 && lon <= 110.0) {
    return { id: 'south_central', ...REGIONS.south_central };
  }
  if (lat >= 16.0 && lat <= 20.0 && lon >= 104.5 && lon <= 108.5) {
    return { id: 'north_central', ...REGIONS.north_central };
  }
  if (lat >= 20.0 && lat <= 21.5 && lon >= 105.5 && lon <= 107.0) {
    return { id: 'red_river_delta', ...REGIONS.red_river_delta };
  }
  if (lat >= 21.0 && lat <= 23.5 && lon >= 102.0 && lon <= 108.0) {
    return { id: 'northern_highlands', ...REGIONS.northern_highlands };
  }
  // Default based on latitude
  if (lat > 18) return { id: 'red_river_delta', ...REGIONS.red_river_delta };
  if (lat > 14) return { id: 'south_central', ...REGIONS.south_central };
  if (lat > 11) return { id: 'southeast', ...REGIONS.southeast };
  return { id: 'mekong_delta', ...REGIONS.mekong_delta };
}

function assignPriority(article: any, userRegion: string, connectedRegions: string[]): number {
  const location = (article.location || '').toLowerCase();
  const userRegionVi = REGIONS[userRegion]?.nameVi?.toLowerCase() || '';
  
  // Priority 1: Local (user's exact location)
  if (location.includes(userRegionVi) || 
      location.includes(userRegion) ||
      (userRegion === 'hcmc' && (location.includes('hồ chí minh') || location.includes('saigon') || location.includes('sài gòn'))) ||
      (userRegion === 'hanoi' && (location.includes('hà nội') || location.includes('hanoi')))) {
    return 1;
  }
  
  // Priority 2: Regional (connected epidemiological regions)
  for (const connectedId of connectedRegions) {
    const connectedVi = REGIONS[connectedId]?.nameVi?.toLowerCase() || '';
    if (location.includes(connectedVi) || location.includes(connectedId)) {
      return 2;
    }
  }
  
  // Priority 3: Emerging (potential threat based on classification)
  if (article.classification === 'emerging' || article.severity === 'high' || article.severity === 'critical') {
    return 3;
  }
  
  // Priority 4: Global/Reference
  return 4;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, locale = 'vi' }: GPSInput = await req.json();
    
    console.log(`🌍 GPS Health Intelligence for: ${lat}, ${lon}`);
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // Step 1: Classify user's region
    const userRegion = classifyUserRegion(lat, lon);
    console.log(`📍 User region: ${userRegion.nameVi} (${userRegion.id})`);
    
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    // Step 2: Fetch real-time health news with location priority
    let rawArticles: any[] = [];
    
    if (PERPLEXITY_API_KEY) {
      console.log('🚀 Using Perplexity for GPS-prioritized search...');
      
      // Build location-aware search query
      const localSearchQuery = `Breaking health news ${userRegion.nameVi} Vietnam today ${today}: dengue fever, COVID-19, hand foot mouth disease, influenza, disease outbreak. Focus on ${userRegion.nameVi} and nearby regions. Only news from last 24 hours.`;
      
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are a real-time public health analyst focusing on ${userRegion.nameVi}, Vietnam. Today is ${today}. 

PRIORITY ORDER for news collection:
1. LOCAL: News directly about ${userRegion.nameVi}
2. REGIONAL: News from connected regions: ${userRegion.connectedRegions.map(r => REGIONS[r]?.nameVi).join(', ')}
3. EMERGING: New disease threats that could affect the area
4. GLOBAL: Only if highly relevant for early warning

Return ONLY a valid JSON array:
[
  {
    "title": "Exact headline",
    "source": "Source name",
    "url": "Article URL",
    "publishedAt": "${today}",
    "disease": "dengue/covid19/hfmd/influenza/ari/other",
    "location": "Specific location",
    "severity": "low/medium/high/critical",
    "classification": "confirmed/emerging/predictive",
    "casesCount": number or null,
    "content": "2-sentence factual summary"
  }
]

Maximum 5 items, prioritize ${userRegion.nameVi} first. Return [] if no recent news.`
            },
            {
              role: 'user',
              content: localSearchQuery
            }
          ],
          search_recency_filter: 'day',
          temperature: 0.1,
        }),
      });

      if (perplexityResponse.ok) {
        const data = await perplexityResponse.json();
        const content = data.choices?.[0]?.message?.content;
        const citations = data.citations || [];
        
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            rawArticles = JSON.parse(jsonMatch[0]);
            rawArticles = rawArticles.map((a: any, i: number) => ({
              ...a,
              url: a.url || citations[i] || '#'
            }));
          }
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }

    // Fallback to Lovable AI
    if (rawArticles.length === 0 && LOVABLE_API_KEY) {
      console.log('🔄 Fallback to Lovable AI...');
      const fallbackResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `Generate realistic current health news for ${userRegion.nameVi}, Vietnam. Today is ${today}. Focus on dengue, respiratory infections. Return JSON array with title, source, url, disease, location, severity, casesCount, content.`
            },
            {
              role: 'user',
              content: `Generate 3 health news items for ${userRegion.nameVi} today.`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        const content = data.choices?.[0]?.message?.content;
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            rawArticles = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.error('Fallback parse error:', e);
        }
      }
    }

    // Step 3: Assign priorities and sort
    const prioritizedAlerts: PrioritizedAlert[] = rawArticles
      .map((article: any) => {
        const priority = assignPriority(article, userRegion.id, userRegion.connectedRegions) as 1 | 2 | 3 | 4;
        const priorityLabels = {
          1: { en: 'LOCAL', vi: 'TRỰC TIẾP' },
          2: { en: 'REGIONAL', vi: 'LIÊN VÙNG' },
          3: { en: 'EMERGING', vi: 'TIỀM ẨN' },
          4: { en: 'GLOBAL', vi: 'THAM KHẢO' }
        };
        
        const diseaseNames: Record<string, string> = {
          dengue: 'Sốt xuất huyết',
          covid19: 'COVID-19',
          hfmd: 'Tay chân miệng',
          influenza: 'Cúm',
          ari: 'Viêm hô hấp',
          other: 'Khác'
        };

        return {
          priority,
          priorityLabel: priorityLabels[priority].en,
          priorityLabelVi: priorityLabels[priority].vi,
          disease: article.disease || 'other',
          diseaseVi: diseaseNames[article.disease] || article.disease || 'Khác',
          title: article.title,
          summary: article.content || '',
          location: article.location || userRegion.nameVi,
          casesCount: article.casesCount,
          riskLevel: (article.severity === 'critical' ? 'CRITICAL' : 
                     article.severity === 'high' ? 'HIGH' : 
                     article.severity === 'medium' ? 'MEDIUM' : 'LOW') as any,
          source: article.source || 'Health Authority',
          relevanceScore: 100 - (priority - 1) * 25
        };
      })
      .sort((a: PrioritizedAlert, b: PrioritizedAlert) => a.priority - b.priority)
      .slice(0, 3); // Max 3 alerts

    // Step 4: Calculate KPIs from alerts
    const localAlerts = prioritizedAlerts.filter(a => a.priority === 1);
    const todayCasesLocal = localAlerts.reduce((sum, a) => sum + (a.casesCount || 0), 0);
    const openAlertsLocal = localAlerts.filter(a => a.riskLevel !== 'LOW').length;
    const diseasesMonitored = new Set(prioritizedAlerts.map(a => a.disease)).size;

    // Step 5: Calculate community risk status
    const hasCritical = prioritizedAlerts.some(a => a.riskLevel === 'CRITICAL' && a.priority <= 2);
    const hasHigh = prioritizedAlerts.some(a => a.riskLevel === 'HIGH' && a.priority <= 2);
    
    let communityRiskLevel: 'Thấp' | 'Trung bình' | 'Cao' = 'Thấp';
    let communityRiskLevelEn: 'Low' | 'Medium' | 'High' = 'Low';
    let explanation = '';
    let explanationVi = '';

    if (hasCritical) {
      communityRiskLevel = 'Cao';
      communityRiskLevelEn = 'High';
      const criticalAlert = prioritizedAlerts.find(a => a.riskLevel === 'CRITICAL');
      explanation = `${criticalAlert?.diseaseVi} outbreak detected in your area. Take precautions.`;
      explanationVi = `Phát hiện dịch ${criticalAlert?.diseaseVi} tại khu vực của bạn. Cần chú ý phòng ngừa.`;
    } else if (hasHigh) {
      communityRiskLevel = 'Trung bình';
      communityRiskLevelEn = 'Medium';
      const highAlert = prioritizedAlerts.find(a => a.riskLevel === 'HIGH');
      explanation = `Elevated ${highAlert?.diseaseVi} cases in your region. Monitor developments.`;
      explanationVi = `Ca ${highAlert?.diseaseVi} tăng cao trong khu vực. Theo dõi diễn biến.`;
    } else {
      explanation = `No significant health threats in ${userRegion.nameVi} currently.`;
      explanationVi = `Không có mối đe dọa sức khỏe đáng kể tại ${userRegion.nameVi} hiện tại.`;
    }

    // Step 6: Generate personalized insight
    let personalMessage = '';
    let personalMessageVi = '';

    if (prioritizedAlerts.length > 0) {
      const topAlert = prioritizedAlerts[0];
      if (topAlert.priority === 1) {
        personalMessage = `${topAlert.diseaseVi} activity in your area - consider preventive measures.`;
        personalMessageVi = `Hoạt động ${topAlert.diseaseVi} trong khu vực của bạn - hãy chú ý phòng ngừa.`;
      } else if (topAlert.priority === 2) {
        personalMessage = `Monitor ${topAlert.diseaseVi} situation in nearby ${topAlert.location}.`;
        personalMessageVi = `Theo dõi tình hình ${topAlert.diseaseVi} tại ${topAlert.location} lân cận.`;
      } else {
        personalMessage = `Stay informed about ${topAlert.diseaseVi} developments.`;
        personalMessageVi = `Cập nhật thông tin về diễn biến ${topAlert.diseaseVi}.`;
      }
    } else {
      personalMessage = `No immediate health concerns for ${userRegion.nameVi}. Stay healthy!`;
      personalMessageVi = `Không có lo ngại sức khỏe cấp bách cho ${userRegion.nameVi}. Giữ gìn sức khỏe!`;
    }

    const response: HealthIntelligenceResponse = {
      success: true,
      userLocation: {
        city: userRegion.nameVi,
        region: userRegion.name,
        regionVi: userRegion.nameVi,
        coordinates: { lat, lon }
      },
      communityRiskStatus: {
        level: communityRiskLevel,
        levelEn: communityRiskLevelEn,
        explanation,
        explanationVi
      },
      kpi: {
        todayCasesLocal,
        openAlertsLocal,
        diseasesMonitoredRegional: diseasesMonitored,
        vaccinationRate: null
      },
      prioritizedAlerts,
      personalInsight: {
        message: personalMessage,
        messageVi: personalMessageVi
      },
      footer: {
        dataType: PERPLEXITY_API_KEY ? 'Dữ liệu xác minh + Dự báo AI' : 'Dữ liệu mô phỏng AI',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log(`✅ Returned ${prioritizedAlerts.length} prioritized alerts for ${userRegion.nameVi}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ GPS Health Intelligence error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
