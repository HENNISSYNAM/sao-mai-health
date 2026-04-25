/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { callAIWithFallback } from "../_shared/aiProvider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Global + Vietnam location geocoding lookup
const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // === VIETNAM ===
  'ho chi minh': { lat: 10.8231, lng: 106.6297 },
  'hcmc': { lat: 10.8231, lng: 106.6297 },
  'tp hcm': { lat: 10.8231, lng: 106.6297 },
  'tp. hồ chí minh': { lat: 10.8231, lng: 106.6297 },
  'hồ chí minh': { lat: 10.8231, lng: 106.6297 },
  'hanoi': { lat: 21.0285, lng: 105.8542 },
  'hà nội': { lat: 21.0285, lng: 105.8542 },
  'da nang': { lat: 16.0544, lng: 108.2022 },
  'đà nẵng': { lat: 16.0544, lng: 108.2022 },
  'hai phong': { lat: 20.8449, lng: 106.6881 },
  'hải phòng': { lat: 20.8449, lng: 106.6881 },
  'can tho': { lat: 10.0452, lng: 105.7469 },
  'cần thơ': { lat: 10.0452, lng: 105.7469 },
  'binh duong': { lat: 11.3254, lng: 106.477 },
  'bình dương': { lat: 11.3254, lng: 106.477 },
  'dong nai': { lat: 10.9453, lng: 106.8243 },
  'đồng nai': { lat: 10.9453, lng: 106.8243 },
  'khanh hoa': { lat: 12.2388, lng: 109.1967 },
  'khánh hòa': { lat: 12.2388, lng: 109.1967 },
  'nha trang': { lat: 12.2388, lng: 109.1967 },
  'quang ninh': { lat: 21.006, lng: 107.2925 },
  'quảng ninh': { lat: 21.006, lng: 107.2925 },
  'thanh hoa': { lat: 19.8067, lng: 105.7852 },
  'thanh hóa': { lat: 19.8067, lng: 105.7852 },
  'nghe an': { lat: 18.679, lng: 105.6813 },
  'nghệ an': { lat: 18.679, lng: 105.6813 },
  'ha tinh': { lat: 18.3559, lng: 105.8877 },
  'hà tĩnh': { lat: 18.3559, lng: 105.8877 },
  'quang nam': { lat: 15.5735, lng: 108.474 },
  'quảng nam': { lat: 15.5735, lng: 108.474 },
  'binh thuan': { lat: 10.9285, lng: 108.1 },
  'bình thuận': { lat: 10.9285, lng: 108.1 },
  'lam dong': { lat: 11.946, lng: 108.442 },
  'lâm đồng': { lat: 11.946, lng: 108.442 },
  'da lat': { lat: 11.946, lng: 108.442 },
  'đà lạt': { lat: 11.946, lng: 108.442 },
  'long an': { lat: 10.5359, lng: 106.4113 },
  'tay ninh': { lat: 11.3352, lng: 106.0937 },
  'tây ninh': { lat: 11.3352, lng: 106.0937 },
  'ben tre': { lat: 10.2434, lng: 106.3756 },
  'bến tre': { lat: 10.2434, lng: 106.3756 },
  'an giang': { lat: 10.5216, lng: 105.1259 },
  'vung tau': { lat: 10.346, lng: 107.0843 },
  'vũng tàu': { lat: 10.346, lng: 107.0843 },
  'ba ria': { lat: 10.496, lng: 107.169 },
  'bà rịa': { lat: 10.496, lng: 107.169 },
  'hue': { lat: 16.4637, lng: 107.5909 },
  'huế': { lat: 16.4637, lng: 107.5909 },
  'vietnam': { lat: 16.0, lng: 106.0 },
  'việt nam': { lat: 16.0, lng: 106.0 },
  'mekong delta': { lat: 10.2, lng: 105.9 },
  'đồng bằng sông cửu long': { lat: 10.2, lng: 105.9 },
  'gia lai': { lat: 13.9833, lng: 108.0 },
  'dak lak': { lat: 12.71, lng: 108.05 },
  'đắk lắk': { lat: 12.71, lng: 108.05 },
  'phu yen': { lat: 13.0882, lng: 109.0929 },
  'phú yên': { lat: 13.0882, lng: 109.0929 },
  'quang binh': { lat: 17.4685, lng: 106.6222 },
  'quảng bình': { lat: 17.4685, lng: 106.6222 },
  'quang tri': { lat: 16.7503, lng: 107.1854 },
  'quảng trị': { lat: 16.7503, lng: 107.1854 },
  'ninh binh': { lat: 20.2539, lng: 105.975 },
  'ninh bình': { lat: 20.2539, lng: 105.975 },
  'thai binh': { lat: 20.4463, lng: 106.3365 },
  'thái bình': { lat: 20.4463, lng: 106.3365 },
  'nam dinh': { lat: 20.4388, lng: 106.1621 },
  'nam định': { lat: 20.4388, lng: 106.1621 },
  'ha nam': { lat: 20.5835, lng: 105.9229 },
  'hà nam': { lat: 20.5835, lng: 105.9229 },
  'vinh phuc': { lat: 21.3609, lng: 105.5474 },
  'vĩnh phúc': { lat: 21.3609, lng: 105.5474 },
  'bac ninh': { lat: 21.1862, lng: 106.076 },
  'bắc ninh': { lat: 21.1862, lng: 106.076 },
  'hung yen': { lat: 20.6464, lng: 106.0511 },
  'hưng yên': { lat: 20.6464, lng: 106.0511 },
  'hai duong': { lat: 20.9373, lng: 106.3146 },
  'hải dương': { lat: 20.9373, lng: 106.3146 },
  // === SOUTHEAST ASIA ===
  'southeast asia': { lat: 14.0, lng: 108.0 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'thailand': { lat: 15.87, lng: 100.9925 },
  'cambodia': { lat: 11.55, lng: 104.9167 },
  'phnom penh': { lat: 11.5564, lng: 104.9282 },
  'laos': { lat: 17.9757, lng: 102.6331 },
  'vientiane': { lat: 17.9757, lng: 102.6331 },
  'myanmar': { lat: 19.7633, lng: 96.0785 },
  'yangon': { lat: 16.8661, lng: 96.1951 },
  'malaysia': { lat: 3.139, lng: 101.6869 },
  'kuala lumpur': { lat: 3.139, lng: 101.6869 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'indonesia': { lat: -6.2088, lng: 106.8456 },
  'jakarta': { lat: -6.2088, lng: 106.8456 },
  'philippines': { lat: 14.5995, lng: 120.9842 },
  'manila': { lat: 14.5995, lng: 120.9842 },
  // === EAST ASIA ===
  'china': { lat: 39.9042, lng: 116.4074 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'guangzhou': { lat: 23.1291, lng: 113.2644 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'japan': { lat: 35.6762, lng: 139.6503 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'south korea': { lat: 37.5665, lng: 126.978 },
  'seoul': { lat: 37.5665, lng: 126.978 },
  'taiwan': { lat: 25.0330, lng: 121.5654 },
  // === SOUTH ASIA ===
  'india': { lat: 28.6139, lng: 77.209 },
  'new delhi': { lat: 28.6139, lng: 77.209 },
  'mumbai': { lat: 19.076, lng: 72.8777 },
  'bangladesh': { lat: 23.8103, lng: 90.4125 },
  'dhaka': { lat: 23.8103, lng: 90.4125 },
  'pakistan': { lat: 33.6844, lng: 73.0479 },
  'sri lanka': { lat: 6.9271, lng: 79.8612 },
  'nepal': { lat: 27.7172, lng: 85.324 },
  // === AFRICA ===
  'nigeria': { lat: 9.0579, lng: 7.4951 },
  'south africa': { lat: -33.9249, lng: 18.4241 },
  'kenya': { lat: -1.2921, lng: 36.8219 },
  'ethiopia': { lat: 9.0192, lng: 38.7525 },
  'egypt': { lat: 30.0444, lng: 31.2357 },
  'congo': { lat: -4.4419, lng: 15.2663 },
  'drc': { lat: -4.4419, lng: 15.2663 },
  'ghana': { lat: 5.6037, lng: -0.187 },
  'tanzania': { lat: -6.7924, lng: 39.2083 },
  'uganda': { lat: 0.3476, lng: 32.5825 },
  'mozambique': { lat: -25.9692, lng: 32.5732 },
  'cameroon': { lat: 3.848, lng: 11.5021 },
  'sudan': { lat: 15.5007, lng: 32.5599 },
  'africa': { lat: 0.0, lng: 25.0 },
  // === AMERICAS ===
  'united states': { lat: 38.9072, lng: -77.0369 },
  'usa': { lat: 38.9072, lng: -77.0369 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'california': { lat: 36.7783, lng: -119.4179 },
  'texas': { lat: 31.9686, lng: -99.9018 },
  'florida': { lat: 27.6648, lng: -81.5158 },
  'brazil': { lat: -15.7975, lng: -47.8919 },
  'mexico': { lat: 19.4326, lng: -99.1332 },
  'colombia': { lat: 4.711, lng: -74.0721 },
  'argentina': { lat: -34.6037, lng: -58.3816 },
  'peru': { lat: -12.0464, lng: -77.0428 },
  // === EUROPE ===
  'united kingdom': { lat: 51.5074, lng: -0.1278 },
  'uk': { lat: 51.5074, lng: -0.1278 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'france': { lat: 48.8566, lng: 2.3522 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'germany': { lat: 52.52, lng: 13.405 },
  'berlin': { lat: 52.52, lng: 13.405 },
  'italy': { lat: 41.9028, lng: 12.4964 },
  'spain': { lat: 40.4168, lng: -3.7038 },
  'russia': { lat: 55.7558, lng: 37.6173 },
  // === MIDDLE EAST ===
  'saudi arabia': { lat: 24.7136, lng: 46.6753 },
  'iran': { lat: 35.6892, lng: 51.389 },
  'iraq': { lat: 33.3152, lng: 44.3661 },
  'israel': { lat: 31.7683, lng: 35.2137 },
  'turkey': { lat: 39.9334, lng: 32.8597 },
  'uae': { lat: 25.2048, lng: 55.2708 },
  // === OCEANIA ===
  'australia': { lat: -33.8688, lng: 151.2093 },
  'new zealand': { lat: -36.8485, lng: 174.7633 },
  // === GENERIC ===
  'global': { lat: 20.0, lng: 0.0 },
  'world': { lat: 20.0, lng: 0.0 },
  'worldwide': { lat: 20.0, lng: 0.0 },
  'asia': { lat: 34.0, lng: 100.0 },
  'europe': { lat: 50.0, lng: 10.0 },
  'americas': { lat: 15.0, lng: -80.0 },
};

function geocodeLocation(location: string): { lat: number; lng: number } | null {
  const normalized = location.toLowerCase().trim();
  if (LOCATIONS[normalized]) return LOCATIONS[normalized];
  for (const [key, coords] of Object.entries(LOCATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  return null;
}

// Disease type mapping to standardized codes
const DISEASE_MAP: Record<string, string> = {
  dengue: 'dengue', 'sốt xuất huyết': 'dengue', 'sxh': 'dengue',
  covid19: 'covid19', covid: 'covid19', 'covid-19': 'covid19',
  hfmd: 'tcm', 'tay chân miệng': 'tcm', tcm: 'tcm', 'hand foot mouth': 'tcm',
  influenza: 'influenza', 'cúm': 'influenza', flu: 'influenza',
  measles: 'measles', 'sởi': 'measles',
  tuberculosis: 'tuberculosis', 'lao': 'tuberculosis',
  ari: 'ari', 'viêm hô hấp': 'ari', 'respiratory': 'ari',
  rabies: 'rabies', 'dại': 'rabies',
};

function mapDiseaseCode(diseaseType: string): string {
  const normalized = diseaseType.toLowerCase().trim();
  return DISEASE_MAP[normalized] || normalized;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔥 [NEWS-TO-HOTSPOTS] Starting inference from health_news_articles...');

    // 1. Fetch recent articles (last 7 days, unprocessed or all)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: articles, error: articlesErr } = await supabase
      .from('health_news_articles')
      .select('id, title, content_summary, disease_type, location, severity, classification, published_at, url, source')
      .gte('published_at', sevenDaysAgo)
      .order('published_at', { ascending: false })
      .limit(100);

    if (articlesErr) throw articlesErr;
    if (!articles || articles.length === 0) {
      console.log('📭 No recent articles to process');
      return new Response(JSON.stringify({ success: true, hotspots: [], message: 'No recent articles' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📰 Found ${articles.length} recent articles to analyze`);

    // 2. Group articles by their EXISTING location + disease directly from DB
    const GENERIC_LOCATIONS = new Set(['unknown', '']);
    
    // Separate articles into located vs generic
    const locatedGroups: Record<string, { articles: typeof articles; disease: string; location: string; maxSeverity: string }> = {};
    const genericArticles: typeof articles = [];

    for (const article of articles) {
      const loc = (article.location || '').trim();
      const disease = mapDiseaseCode(article.disease_type || 'other');
      
      if (!loc || GENERIC_LOCATIONS.has(loc.toLowerCase())) {
        genericArticles.push(article);
        continue;
      }

      // Try geocoding this location immediately
      const coords = geocodeLocation(loc);
      if (!coords) {
        genericArticles.push(article); // Can't geocode → treat as generic
        continue;
      }

      const key = `${loc.toLowerCase()}|${disease}`;
      if (!locatedGroups[key]) {
        locatedGroups[key] = { articles: [], disease, location: loc, maxSeverity: 'low' };
      }
      locatedGroups[key].articles.push(article);
      
      const sevOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      if ((sevOrder[article.severity || ''] || 0) > (sevOrder[locatedGroups[key].maxSeverity] || 0)) {
        locatedGroups[key].maxSeverity = article.severity || 'medium';
      }
    }

    console.log(`📊 ${Object.keys(locatedGroups).length} located groups, ${genericArticles.length} generic articles`);

    // 3. Build hotspots from located groups
    const hotspots: any[] = [];
    const usedCoords = new Set<string>();

    for (const [, group] of Object.entries(locatedGroups)) {
      const coords = geocodeLocation(group.location)!;
      
      // Deterministic offset for same-location different-disease
      const coordKey = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
      let offsetIdx = 0;
      let finalKey = coordKey;
      while (usedCoords.has(finalKey)) {
        offsetIdx++;
        finalKey = `${coordKey}_${offsetIdx}`;
      }
      usedCoords.add(finalKey);

      // Small spiral offset for same-city different-disease hotspots
      const angle = offsetIdx * 2.4;
      const dist = offsetIdx * 0.06;

      const sources = group.articles.slice(0, 5).map(a => ({
        title: a.title, source: a.source, url: a.url,
        severity: a.severity, publishedAt: a.published_at,
      }));

      hotspots.push({
        center_lat: coords.lat + Math.sin(angle) * dist,
        center_lng: coords.lng + Math.cos(angle) * dist,
        radius_km: Math.min(12, 3 + group.articles.length * 2),
        disease_code: group.disease,
        disease_name: getDiseaseLabel(group.disease),
        severity: group.maxSeverity,
        case_count: Math.max(1, group.articles.length * 5),
        user_density: 0,
        ai_source: sources,
        prediction_data: {
          inference: 'news-located',
          province: group.location,
          articleCount: group.articles.length,
        },
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 4. Use AI to assign specific provinces for generic articles (if any)
    if (genericArticles.length > 0) {
      console.log(`🤖 Using AI to locate ${genericArticles.length} generic articles...`);
      try {
        const summaries = genericArticles.map((a, i) =>
          `[${i}] "${a.title}" | disease: ${a.disease_type} | severity: ${a.severity}`
        ).join('\n');

        const result = await callAIWithFallback({
          messages: [
            {
              role: 'system',
              content: `You assign specific locations to health articles. For each article, pick the MOST LIKELY specific city/country.

IMPORTANT: You MUST use one of these exact location names:
VIETNAM: Ho Chi Minh, Hanoi, Da Nang, Can Tho, Hai Phong, Binh Duong, Dong Nai, Khanh Hoa, Thanh Hoa, Nghe An, Quang Nam, Hue, Quang Ninh, Gia Lai, Dak Lak
ASIA: Bangkok, Thailand, Cambodia, Phnom Penh, Laos, Myanmar, Malaysia, Singapore, Indonesia, Jakarta, Philippines, Manila, China, Beijing, Shanghai, Japan, Tokyo, South Korea, Seoul, India, New Delhi, Mumbai, Bangladesh, Dhaka, Pakistan, Taiwan
AFRICA: Nigeria, South Africa, Kenya, Ethiopia, Egypt, Congo, DRC, Ghana, Tanzania, Uganda
AMERICAS: USA, New York, Brazil, Mexico, Colombia, Argentina, Peru
EUROPE: United Kingdom, France, Germany, Italy, Spain, Russia
MIDDLE EAST: Saudi Arabia, Iran, Iraq, Turkey, UAE
OCEANIA: Australia, New Zealand

Group articles about the same disease+location together.
Return ONLY a JSON array:
[{"location": "exact name from list above", "disease": "disease_code", "severity": "low|medium|high|critical", "indices": [0,1], "cases": number}]`,
            },
            { role: 'user', content: summaries },
          ],
          temperature: 0,
          maxTokens: 2000,
          functionName: 'news-to-hotspots-generic',
        });

        const match = result.content.match(/\[[\s\S]*\]/);
        if (match) {
          const assignments = JSON.parse(match[0]);
          for (const a of assignments) {
            const coords = geocodeLocation(a.location);
            if (!coords) continue;

            const coordKey = `${coords.lat.toFixed(2)}_${coords.lng.toFixed(2)}`;
            let offsetIdx = 0;
            let finalKey = coordKey;
            while (usedCoords.has(finalKey)) { offsetIdx++; finalKey = `${coordKey}_${offsetIdx}`; }
            usedCoords.add(finalKey);

            const angle = offsetIdx * 2.4;
            const dist = offsetIdx * 0.06;
            const clusterArticles = (a.indices || []).map((i: number) => genericArticles[i]).filter(Boolean);

            hotspots.push({
              center_lat: coords.lat + Math.sin(angle) * dist,
              center_lng: coords.lng + Math.cos(angle) * dist,
              radius_km: 8,
              disease_code: mapDiseaseCode(a.disease || 'other'),
              disease_name: getDiseaseLabel(mapDiseaseCode(a.disease || 'other')),
              severity: a.severity || 'medium',
              case_count: a.cases || Math.max(1, clusterArticles.length * 3),
              user_density: 0,
              ai_source: clusterArticles.slice(0, 5).map((ar: any) => ({
                title: ar.title, source: ar.source, url: ar.url,
                severity: ar.severity, publishedAt: ar.published_at,
              })),
              prediction_data: {
                inference: 'news-ai-inferred',
                province: a.location,
                articleCount: clusterArticles.length,
              },
              detected_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ AI location inference failed, skipping generic articles:', e);
      }
    }

    // 4. Clean old and insert new hotspots
    if (hotspots.length > 0) {
      // Clean up ALL old news-based hotspots (replace with fresh data)
      await supabase
        .from('disease_hotspots')
        .delete()
        .eq('user_density', 0); // news-based hotspots have user_density=0

      // Insert new hotspots
      const { error: insertErr } = await supabase
        .from('disease_hotspots')
        .insert(hotspots);

      if (insertErr) {
        console.error('❌ Failed to insert hotspots:', insertErr);
      } else {
        console.log(`✅ Inserted ${hotspots.length} hotspots from news analysis`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      articlesAnalyzed: articles.length,
      clustersFound: hotspots.length,
      hotspotsCreated: hotspots.length,
      hotspots: hotspots.map(h => ({
        disease: h.disease_name,
        location: `${h.center_lat.toFixed(2)}, ${h.center_lng.toFixed(2)}`,
        severity: h.severity,
        caseEstimate: h.case_count,
        articleCount: h.prediction_data?.articleCount,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [NEWS-TO-HOTSPOTS] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDiseaseLabel(code: string): string {
  const labels: Record<string, string> = {
    dengue: 'Sốt xuất huyết',
    covid19: 'COVID-19',
    tcm: 'Tay chân miệng',
    influenza: 'Cúm mùa',
    measles: 'Sởi',
    tuberculosis: 'Lao',
    ari: 'Viêm hô hấp cấp',
    rabies: 'Dại',
    other: 'Khác',
  };
  return labels[code] || code;
}
