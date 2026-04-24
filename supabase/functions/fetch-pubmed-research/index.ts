// Multi-source medical research aggregator:
// (1) PubMed/NCBI E-utilities (NIH) - peer-reviewed, highest authority
// (2) Europe PMC REST API - peer-reviewed mirror + open access
// (3) medRxiv/bioRxiv API - preprints (clearly flagged)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EUROPE_PMC_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest';
const MEDRXIV_BASE = 'https://api.biorxiv.org/details';

// Curated topic queries
const TOPIC_QUERIES = [
  { category: 'infectious_diseases', pubmed: '(dengue[Title] OR "hand foot mouth"[Title] OR tuberculosis[Title] OR influenza[Title] OR COVID-19[Title] OR malaria[Title]) AND ("last 30 days"[PDat])', europepmc: '(TITLE:"dengue" OR TITLE:"tuberculosis" OR TITLE:"influenza" OR TITLE:"COVID-19") AND (FIRST_PDATE:[2026-03-01 TO 2026-12-31])', max: 6 },
  { category: 'chronic_diseases', pubmed: '(diabetes[Title] OR hypertension[Title] OR stroke[Title] OR "cardiovascular disease"[Title]) AND ("last 30 days"[PDat])', europepmc: '(TITLE:"diabetes" OR TITLE:"hypertension" OR TITLE:"stroke") AND (FIRST_PDATE:[2026-03-01 TO 2026-12-31])', max: 6 },
  { category: 'ai_medicine', pubmed: '("artificial intelligence"[Title] OR "machine learning"[Title] OR "deep learning"[Title]) AND (medicine[Title] OR clinical[Title]) AND ("last 30 days"[PDat])', europepmc: '(TITLE:"artificial intelligence" OR TITLE:"machine learning") AND (TITLE:"clinical" OR TITLE:"medicine") AND (FIRST_PDATE:[2026-03-01 TO 2026-12-31])', max: 5 },
  { category: 'public_health', pubmed: '("public health"[Title] OR epidemiology[Title] OR vaccination[Title]) AND ("last 30 days"[PDat])', europepmc: '(TITLE:"public health" OR TITLE:"epidemiology" OR TITLE:"vaccination") AND (FIRST_PDATE:[2026-03-01 TO 2026-12-31])', max: 4 },
];

interface ResearchArticle {
  source: 'pubmed' | 'europepmc' | 'medrxiv';
  pmid: string; // unique key (PMID, EuropePMC ID, or DOI for preprints)
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publication_date: string | null;
  doi: string | null;
  url: string;
  is_preprint: boolean;
  keywords: string[];
  mesh_terms: string[];
}

// ---------- PubMed ----------
async function searchPubMed(query: string, maxResults: number): Promise<string[]> {
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=date&retmode=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`esearch failed: ${res.status}`);
  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

async function fetchPubMedDetails(pmids: string[]): Promise<ResearchArticle[]> {
  if (pmids.length === 0) return [];
  const url = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`efetch failed: ${res.status}`);
  const xml = await res.text();
  return parsePubMedXML(xml);
}

function parsePubMedXML(xml: string): ResearchArticle[] {
  const articles: ResearchArticle[] = [];
  const matches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);
  for (const match of matches) {
    const block = match[1];
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || '';
    const title = (block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1] || '').replace(/<[^>]+>/g, '').trim();
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
    const keywords = Array.from(block.matchAll(/<Keyword[^>]*>([^<]+)<\/Keyword>/g)).slice(0, 10).map(m => m[1].trim());
    const mesh_terms = Array.from(block.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g)).slice(0, 10).map(m => m[1].trim());
    if (pmid && title) {
      articles.push({
        source: 'pubmed', pmid, title, abstract, authors, journal,
        publication_date, doi, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        is_preprint: false, keywords, mesh_terms,
      });
    }
  }
  return articles;
}

function monthToNum(month: string): string {
  const map: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  return map[month.slice(0, 3)] || '01';
}

// ---------- Europe PMC ----------
async function fetchEuropePMC(query: string, maxResults: number): Promise<ResearchArticle[]> {
  const url = `${EUROPE_PMC_BASE}/search?query=${encodeURIComponent(query)}&format=json&pageSize=${maxResults}&sort=FIRST_PDATE_D+desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Europe PMC failed: ${res.status}`);
  const data = await res.json();
  const results = data.resultList?.result || [];
  return results.map((r: any) => {
    const pmid = r.pmid || `EPMC-${r.id}`;
    return {
      source: 'europepmc' as const,
      pmid,
      title: (r.title || '').replace(/\.$/, ''),
      abstract: r.abstractText || '',
      authors: (r.authorString || '').split(',').slice(0, 5).map((a: string) => a.trim()).filter(Boolean),
      journal: r.journalTitle || r.bookOrReportDetails?.publisher || '',
      publication_date: r.firstPublicationDate || null,
      doi: r.doi || null,
      url: r.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/` : `https://europepmc.org/article/${r.source}/${r.id}`,
      is_preprint: r.pubType?.includes('preprint') || false,
      keywords: r.keywordList?.keyword || [],
      mesh_terms: r.meshHeadingList?.meshHeading?.map((m: any) => m.descriptorName).slice(0, 10) || [],
    };
  }).filter((a: ResearchArticle) => a.pmid && a.title);
}

// ---------- medRxiv (preprints) ----------
async function fetchMedRxiv(maxResults: number): Promise<ResearchArticle[]> {
  // medRxiv API: latest preprints, last 7 days
  const today = new Date().toISOString().slice(0, 10);
  const past = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const url = `${MEDRXIV_BASE}/medrxiv/${past}/${today}/0`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const collection = (data.collection || []).slice(0, maxResults);
    return collection.map((r: any) => ({
      source: 'medrxiv' as const,
      pmid: `medrxiv-${r.doi?.replace(/[^\w]/g, '_')}`,
      title: r.title || '',
      abstract: r.abstract || '',
      authors: (r.authors || '').split(';').slice(0, 5).map((a: string) => a.trim()).filter(Boolean),
      journal: 'medRxiv (preprint)',
      publication_date: r.date || null,
      doi: r.doi || null,
      url: r.doi ? `https://www.medrxiv.org/content/${r.doi}` : '',
      is_preprint: true,
      keywords: r.category ? [r.category] : [],
      mesh_terms: [],
    })).filter((a: ResearchArticle) => a.pmid && a.title);
  } catch (e) {
    console.error('medRxiv error:', e);
    return [];
  }
}

// ---------- AI summary (VI) ----------
async function generateVietnameseSummary(article: ResearchArticle): Promise<{ summary: string; relevance: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || !article.abstract) return null;
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: `Bạn là chuyên gia y khoa. Trả về JSON: {"summary":"tóm tắt 2-3 câu tiếng Việt","relevance":"ý nghĩa lâm sàng 1 câu"}${article.is_preprint ? ' Lưu ý: đây là PREPRINT chưa peer-review, hãy thêm cảnh báo "(Preprint - chưa thẩm định)" vào đầu summary.' : ''}` },
          { role: 'user', content: `Tiêu đề: ${article.title}\n\nAbstract: ${article.abstract.slice(0, 2000)}` }
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
    const sourceCounts = { pubmed: 0, europepmc: 0, medrxiv: 0 };

    const topics = customQuery
      ? [{ category: customCategory, pubmed: customQuery, europepmc: customQuery, max: 10 }]
      : TOPIC_QUERIES;

    for (const topic of topics) {
      try {
        console.log(`🔍 Multi-source search: ${topic.category}`);

        // Parallel: PubMed + Europe PMC
        const [pmids, europeArticles] = await Promise.all([
          searchPubMed(topic.pubmed, topic.max).catch(e => { errors.push(`pubmed/${topic.category}: ${e.message}`); return []; }),
          fetchEuropePMC(topic.europepmc, Math.ceil(topic.max / 2)).catch(e => { errors.push(`epmc/${topic.category}: ${e.message}`); return []; }),
        ]);

        const pubmedArticles = pmids.length > 0 ? await fetchPubMedDetails(pmids).catch(() => []) : [];
        sourceCounts.pubmed += pubmedArticles.length;
        sourceCounts.europepmc += europeArticles.length;

        // Combine + dedupe by pmid
        const combined = [...pubmedArticles, ...europeArticles];
        const seen = new Set<string>();
        const deduped = combined.filter(a => {
          if (seen.has(a.pmid)) return false;
          seen.add(a.pmid);
          return true;
        });
        totalScanned += deduped.length;

        // Filter out already-stored
        const { data: existing } = await supabase
          .from('medical_research_articles')
          .select('pmid')
          .in('pmid', deduped.map(a => a.pmid));
        const existingSet = new Set((existing || []).map((e: any) => e.pmid));
        const newOnes = deduped.filter(a => !existingSet.has(a.pmid));

        if (newOnes.length === 0) {
          console.log(`✓ No new articles for ${topic.category}`);
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        for (const article of newOnes) {
          const ai = await generateVietnameseSummary(article);
          const { error } = await supabase
            .from('medical_research_articles')
            .upsert({
              pmid: article.pmid,
              title: article.title,
              abstract: article.abstract || null,
              authors: article.authors,
              journal: article.is_preprint ? `${article.journal} (PREPRINT)` : article.journal,
              publication_date: article.publication_date,
              doi: article.doi,
              pubmed_url: article.url,
              topic_category: topic.category,
              keywords: article.keywords,
              mesh_terms: article.mesh_terms,
              ai_summary_vi: ai?.summary || null,
              ai_clinical_relevance: ai?.relevance || null,
            }, { onConflict: 'pmid' });
          if (!error) totalNew++;
          else console.error('Insert error:', error.message);
        }

        await new Promise(r => setTimeout(r, 400));
      } catch (e: any) {
        console.error(`Topic ${topic.category} error:`, e.message);
        errors.push(`${topic.category}: ${e.message}`);
      }
    }

    // Add medRxiv preprints (general pool)
    if (!customQuery) {
      try {
        const preprints = await fetchMedRxiv(8);
        sourceCounts.medrxiv = preprints.length;
        for (const article of preprints) {
          const { data: ex } = await supabase
            .from('medical_research_articles')
            .select('pmid').eq('pmid', article.pmid).maybeSingle();
          if (ex) continue;
          const ai = await generateVietnameseSummary(article);
          const { error } = await supabase.from('medical_research_articles').upsert({
            pmid: article.pmid,
            title: article.title,
            abstract: article.abstract || null,
            authors: article.authors,
            journal: `${article.journal} (PREPRINT)`,
            publication_date: article.publication_date,
            doi: article.doi,
            pubmed_url: article.url,
            topic_category: 'public_health', // bucket preprints into public_health
            keywords: article.keywords,
            mesh_terms: [],
            ai_summary_vi: ai?.summary || null,
            ai_clinical_relevance: ai?.relevance || null,
          }, { onConflict: 'pmid' });
          if (!error) totalNew++;
        }
      } catch (e: any) {
        errors.push(`medrxiv: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scanned: totalScanned,
      new_articles: totalNew,
      sources: sourceCounts,
      errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('❌ Fatal:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
