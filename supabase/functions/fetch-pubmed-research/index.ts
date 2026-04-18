import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PubMed E-utilities API (NIH/NCBI - free, official, highest authority)
const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Curated query topics covering: infectious diseases (VN priority), chronic diseases, AI in medicine
const TOPIC_QUERIES = [
  { category: 'infectious_diseases', query: '(dengue[Title] OR "hand foot mouth"[Title] OR tuberculosis[Title] OR influenza[Title] OR COVID-19[Title]) AND ("last 30 days"[PDat])', max: 8 },
  { category: 'chronic_diseases', query: '(diabetes[Title] OR hypertension[Title] OR stroke[Title] OR "cardiovascular disease"[Title]) AND ("last 30 days"[PDat])', max: 8 },
  { category: 'ai_medicine', query: '("artificial intelligence"[Title] OR "machine learning"[Title] OR "deep learning"[Title]) AND (medicine[Title] OR clinical[Title] OR diagnosis[Title]) AND ("last 30 days"[PDat])', max: 6 },
  { category: 'public_health', query: '("public health"[Title] OR epidemiology[Title] OR vaccination[Title]) AND ("last 30 days"[PDat])', max: 4 },
];

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publication_date: string | null;
  doi: string | null;
  keywords: string[];
  mesh_terms: string[];
}

async function searchPubMed(query: string, maxResults: number): Promise<string[]> {
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=date&retmode=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`esearch failed: ${res.status}`);
  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

async function fetchPubMedDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  const url = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`efetch failed: ${res.status}`);
  const xml = await res.text();
  return parsePubMedXML(xml);
}

function parsePubMedXML(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  const articleMatches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);

  for (const match of articleMatches) {
    const block = match[1];
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || '';
    const title = (block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1] || '')
      .replace(/<[^>]+>/g, '').trim();
    const abstract = Array.from(block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g))
      .map(m => m[1].replace(/<[^>]+>/g, '').trim()).join(' ');
    const journal = (block.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] || '').trim();
    const year = block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1];
    const month = block.match(/<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/)?.[1] || '01';
    const day = block.match(/<PubDate>[\s\S]*?<Day>(\d+)<\/Day>/)?.[1] || '01';
    const monthNum = isNaN(Number(month)) ? monthToNum(month) : month.padStart(2, '0');
    const publication_date = year ? `${year}-${monthNum}-${String(day).padStart(2, '0')}` : null;
    const doi = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || null;

    const authors = Array.from(block.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]+)<\/ForeName>[\s\S]*?<\/Author>/g))
      .slice(0, 5).map(m => `${m[2]} ${m[1]}`);

    const keywords = Array.from(block.matchAll(/<Keyword[^>]*>([^<]+)<\/Keyword>/g))
      .slice(0, 10).map(m => m[1].trim());
    const mesh_terms = Array.from(block.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g))
      .slice(0, 10).map(m => m[1].trim());

    if (pmid && title) {
      articles.push({ pmid, title, abstract, authors, journal, publication_date, doi, keywords, mesh_terms });
    }
  }
  return articles;
}

function monthToNum(month: string): string {
  const map: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  return map[month.slice(0, 3)] || '01';
}

async function generateVietnameseSummary(article: PubMedArticle): Promise<{ summary: string; relevance: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || !article.abstract) return null;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'Bạn là chuyên gia y khoa. Trả về JSON: {"summary":"tóm tắt 2-3 câu tiếng Việt","relevance":"ý nghĩa lâm sàng 1 câu"}'
          },
          {
            role: 'user',
            content: `Tiêu đề: ${article.title}\n\nAbstract: ${article.abstract.slice(0, 2000)}`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('AI summary error:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const customQuery = body.query;
    const customCategory = body.category || 'custom';

    let totalNew = 0;
    let totalScanned = 0;
    const errors: string[] = [];

    const topics = customQuery
      ? [{ category: customCategory, query: customQuery, max: 10 }]
      : TOPIC_QUERIES;

    for (const topic of topics) {
      try {
        console.log(`🔍 Searching: ${topic.category}`);
        const pmids = await searchPubMed(topic.query, topic.max);
        totalScanned += pmids.length;

        if (pmids.length === 0) continue;

        // Filter out already-stored PMIDs
        const { data: existing } = await supabase
          .from('medical_research_articles')
          .select('pmid')
          .in('pmid', pmids);
        const existingSet = new Set((existing || []).map((e: any) => e.pmid));
        const newPmids = pmids.filter(p => !existingSet.has(p));

        if (newPmids.length === 0) {
          console.log(`✓ All ${pmids.length} articles already in DB for ${topic.category}`);
          continue;
        }

        const articles = await fetchPubMedDetails(newPmids);

        for (const article of articles) {
          // Generate VI summary in parallel (best-effort)
          const ai = await generateVietnameseSummary(article);

          const { error } = await supabase
            .from('medical_research_articles')
            .upsert({
              pmid: article.pmid,
              title: article.title,
              abstract: article.abstract || null,
              authors: article.authors,
              journal: article.journal || null,
              publication_date: article.publication_date,
              doi: article.doi,
              pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
              topic_category: topic.category,
              keywords: article.keywords,
              mesh_terms: article.mesh_terms,
              ai_summary_vi: ai?.summary || null,
              ai_clinical_relevance: ai?.relevance || null,
            }, { onConflict: 'pmid' });

          if (!error) totalNew++;
          else console.error('Insert error:', error.message);
        }

        // Rate limit: NCBI allows 3 req/s without API key
        await new Promise(r => setTimeout(r, 400));
      } catch (e: any) {
        console.error(`Topic ${topic.category} error:`, e.message);
        errors.push(`${topic.category}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scanned: totalScanned,
      new_articles: totalNew,
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
