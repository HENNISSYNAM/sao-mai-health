import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthDataPoint {
  id: string;
  disease: string;
  location: string;
  date: string;
  cases: number;
  source: string;
  sourceUrl?: string;
  timestamp: string;
}

interface DeltaPacket {
  type: 'insert' | 'update';
  dataPoint: HealthDataPoint;
  previousValue?: number;
  change?: number;
  changePercent?: number;
}

interface DeltaResult {
  success: boolean;
  deltas: DeltaPacket[];
  summary: {
    newDataPoints: number;
    updatedDataPoints: number;
    unchangedDataPoints: number;
    totalCases: number;
    diseases: string[];
    locations: string[];
    dateRange: { start: string; end: string };
  };
  timestamp: string;
}

// Disease code mapping
const DISEASE_MAP: Record<string, string> = {
  'dengue': 'A90',
  'sốt xuất huyết': 'A90',
  'covid': 'U07.1',
  'covid-19': 'U07.1',
  'corona': 'U07.1',
  'hand foot mouth': 'B08.4',
  'tay chân miệng': 'B08.4',
  'hfmd': 'B08.4',
  'influenza': 'J10',
  'cúm': 'J10',
  'flu': 'J10',
  'ari': 'J06.9',
  'respiratory': 'J06.9',
  'hô hấp': 'J06.9',
  'measles': 'B05',
  'sởi': 'B05',
  'cholera': 'A00',
  'tả': 'A00',
  'typhoid': 'A01',
  'thương hàn': 'A01',
};

// Vietnam location mapping
const LOCATION_MAP: Record<string, string> = {
  'ho chi minh': 'VN-SG',
  'hcmc': 'VN-SG',
  'saigon': 'VN-SG',
  'tp.hcm': 'VN-SG',
  'tp hcm': 'VN-SG',
  'hanoi': 'VN-HN',
  'hà nội': 'VN-HN',
  'ha noi': 'VN-HN',
  'da nang': 'VN-DN',
  'đà nẵng': 'VN-DN',
  'can tho': 'VN-CT',
  'cần thơ': 'VN-CT',
  'hai phong': 'VN-HP',
  'hải phòng': 'VN-HP',
  'binh duong': 'VN-BD',
  'bình dương': 'VN-BD',
  'dong nai': 'VN-DN2',
  'đồng nai': 'VN-DN2',
  'vietnam': 'VN',
  'việt nam': 'VN',
};

function generateHash(data: HealthDataPoint): string {
  const str = `${data.disease}-${data.location}-${data.date}-${data.cases}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function extractDisease(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const [keyword, code] of Object.entries(DISEASE_MAP)) {
    if (lowerText.includes(keyword)) {
      return code;
    }
  }
  return null;
}

function extractLocation(text: string): string {
  const lowerText = text.toLowerCase();
  for (const [keyword, code] of Object.entries(LOCATION_MAP)) {
    if (lowerText.includes(keyword)) {
      return code;
    }
  }
  return 'VN'; // Default to Vietnam
}

function extractCaseCounts(text: string): number[] {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:ca|cases?|trường hợp|người)/gi,
    /(?:ghi nhận|reported|confirmed|phát hiện)\s*(\d{1,3}(?:,\d{3})*|\d+)/gi,
    /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:mắc|nhiễm|infected)/gi,
  ];

  const counts: number[] = [];
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (num > 0 && num < 10000000) { // Sanity check
        counts.push(num);
      }
    }
  }

  return counts;
}

function extractDate(text: string): string {
  // Try to extract date from text
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    /ngày\s*(\d{1,2})[\/\-](\d{1,2})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Return ISO date
      if (match[3]?.length === 4) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      } else if (match[1]?.length === 4) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
    }
  }

  // Default to today
  return new Date().toISOString().split('T')[0];
}

async function extractDataFromArticles(
  supabase: any,
  articles: any[]
): Promise<HealthDataPoint[]> {
  const dataPoints: HealthDataPoint[] = [];

  for (const article of articles) {
    const content = `${article.title} ${article.content_summary || ''} ${article.raw_content || ''}`;
    
    const disease = article.disease_type || extractDisease(content);
    if (!disease) continue;

    const location = article.location || extractLocation(content);
    const caseCounts = extractCaseCounts(content);
    const date = extractDate(content);

    if (caseCounts.length > 0) {
      // Use the largest number found as the case count
      const cases = Math.max(...caseCounts);
      
      const dataPoint: HealthDataPoint = {
        id: generateHash({
          disease,
          location,
          date,
          cases,
          source: article.source,
          timestamp: new Date().toISOString(),
        } as HealthDataPoint),
        disease,
        location,
        date,
        cases,
        source: article.source,
        sourceUrl: article.url,
        timestamp: new Date().toISOString(),
      };

      dataPoints.push(dataPoint);
    }
  }

  console.log(`📊 Extracted ${dataPoints.length} data points from ${articles.length} articles`);
  return dataPoints;
}

async function computeDeltas(
  supabase: any,
  newDataPoints: HealthDataPoint[]
): Promise<DeltaPacket[]> {
  const deltas: DeltaPacket[] = [];

  // Get existing data for comparison
  const { data: existingData, error } = await supabase
    .from('daily_counts')
    .select('*')
    .order('day', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching existing data:', error);
  }

  // Create lookup map for existing data
  const existingMap = new Map<string, any>();
  if (existingData) {
    for (const row of existingData) {
      const key = `${row.disease_code}-${row.district_id || 'VN'}-${row.day}`;
      existingMap.set(key, row);
    }
  }

  for (const dataPoint of newDataPoints) {
    const key = `${dataPoint.disease}-${dataPoint.location}-${dataPoint.date}`;
    const existing = existingMap.get(key);

    if (!existing) {
      // New data point
      deltas.push({
        type: 'insert',
        dataPoint,
      });
    } else if (existing.cases !== dataPoint.cases) {
      // Updated data point
      const change = dataPoint.cases - existing.cases;
      const changePercent = existing.cases > 0 
        ? ((change / existing.cases) * 100)
        : 100;

      deltas.push({
        type: 'update',
        dataPoint,
        previousValue: existing.cases,
        change,
        changePercent,
      });
    }
    // If cases are the same, skip (no delta)
  }

  console.log(`🔄 Computed ${deltas.length} deltas (${deltas.filter(d => d.type === 'insert').length} new, ${deltas.filter(d => d.type === 'update').length} updates)`);
  return deltas;
}

async function persistDeltas(supabase: any, deltas: DeltaPacket[]): Promise<void> {
  const inserts = deltas.filter(d => d.type === 'insert');
  
  if (inserts.length > 0) {
    const records = inserts.map(d => ({
      disease_code: d.dataPoint.disease,
      district_id: d.dataPoint.location,
      day: d.dataPoint.date,
      cases: d.dataPoint.cases,
    }));

    const { error } = await supabase
      .from('daily_counts')
      .upsert(records, { 
        onConflict: 'disease_code,ward_id,day',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error persisting deltas:', error);
    } else {
      console.log(`💾 Persisted ${records.length} new data points`);
    }
  }
}

async function broadcastDeltas(supabase: any, deltas: DeltaPacket[]): Promise<void> {
  if (deltas.length === 0) return;

  // Broadcast via Supabase Realtime
  const channel = supabase.channel('health-data-deltas');
  
  await channel.subscribe();
  
  // Send delta packet
  await channel.send({
    type: 'broadcast',
    event: 'delta-update',
    payload: {
      deltas,
      timestamp: new Date().toISOString(),
      summary: {
        newCount: deltas.filter(d => d.type === 'insert').length,
        updateCount: deltas.filter(d => d.type === 'update').length,
        totalCases: deltas.reduce((sum, d) => sum + d.dataPoint.cases, 0),
      }
    }
  });

  console.log(`📡 Broadcasted ${deltas.length} deltas via realtime channel`);
  
  await supabase.removeChannel(channel);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
    console.log(`🔬 Health Data Delta Agent started at ${vietnamTime.toISOString()}`);

    // Step 1: Fetch recent unprocessed articles
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    
    const { data: articles, error: fetchError } = await supabase
      .from('health_news_articles')
      .select('*')
      .gte('crawled_at', fifteenMinutesAgo)
      .eq('processed', false)
      .order('crawled_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`📰 Found ${articles?.length || 0} unprocessed articles`);

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        deltas: [],
        summary: {
          newDataPoints: 0,
          updatedDataPoints: 0,
          unchangedDataPoints: 0,
          totalCases: 0,
          diseases: [],
          locations: [],
          dateRange: { start: '', end: '' },
        },
        timestamp: vietnamTime.toISOString(),
        message: 'No new articles to process',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Extract numerical and categorical health data
    const dataPoints = await extractDataFromArticles(supabase, articles);

    // Step 3: Compute deltas against existing data
    const deltas = await computeDeltas(supabase, dataPoints);

    // Step 4: Persist new data (append only, never overwrite)
    await persistDeltas(supabase, deltas);

    // Step 5: Broadcast deltas via realtime
    await broadcastDeltas(supabase, deltas);

    // Step 6: Mark articles as processed
    const articleIds = articles.map(a => a.id);
    await supabase
      .from('health_news_articles')
      .update({ processed: true })
      .in('id', articleIds);

    // Build summary
    const diseases = [...new Set(deltas.map(d => d.dataPoint.disease))];
    const locations = [...new Set(deltas.map(d => d.dataPoint.location))];
    const dates = deltas.map(d => d.dataPoint.date).sort();

    const result: DeltaResult = {
      success: true,
      deltas,
      summary: {
        newDataPoints: deltas.filter(d => d.type === 'insert').length,
        updatedDataPoints: deltas.filter(d => d.type === 'update').length,
        unchangedDataPoints: dataPoints.length - deltas.length,
        totalCases: deltas.reduce((sum, d) => sum + d.dataPoint.cases, 0),
        diseases,
        locations,
        dateRange: {
          start: dates[0] || '',
          end: dates[dates.length - 1] || '',
        },
      },
      timestamp: vietnamTime.toISOString(),
    };

    console.log(`✅ Delta Agent completed: ${deltas.length} deltas processed`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Health Data Delta Agent error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      deltas: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
