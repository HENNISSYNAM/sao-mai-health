import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HEALTH_SOURCES = [
  { url: 'https://moh.gov.vn', name: 'Bộ Y Tế', paths: ['/tin-tuc'] },
  { url: 'https://vnexpress.net/suc-khoe', name: 'VnExpress', paths: [] },
  { url: 'https://tuoitre.vn/suc-khoe.htm', name: 'Tuổi Trẻ', paths: [] },
  { url: 'https://thanhnien.vn/suc-khoe', name: 'Thanh Niên', paths: [] },
  { url: 'https://baotintuc.vn/suc-khoe', name: 'Báo Tin Tức', paths: [] },
  { url: 'https://nhandan.vn/y-te', name: 'Nhân Dân', paths: [] },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { sources } = await req.json().catch(() => ({ sources: undefined }));
    const targetSources = sources || HEALTH_SOURCES.slice(0, 3);
    
    console.log(`🔍 Crawling ${targetSources.length} health sources...`);

    const crawlResults: any[] = [];

    for (const source of targetSources) {
      try {
        console.log(`📰 Scraping: ${source.url}`);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!response.ok) {
          console.error(`❌ Failed to scrape ${source.url}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const markdown = data?.data?.markdown || data?.markdown || '';
        const links = data?.data?.links || data?.links || [];

        crawlResults.push({
          source: source.name,
          sourceUrl: source.url,
          markdown: markdown.substring(0, 5000),
          links: links.slice(0, 20),
          crawledAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`❌ Error scraping ${source.url}:`, err);
      }
    }

    console.log(`✅ Crawled ${crawlResults.length} sources`);

    // Use AI to extract structured data from crawled content
    if (LOVABLE_API_KEY && crawlResults.length > 0) {
      const combinedContent = crawlResults
        .map(r => `[${r.source}]\n${r.markdown.substring(0, 2000)}`)
        .join('\n\n---\n\n');

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `Bạn là AI phân tích tin tức y tế Việt Nam. Trích xuất thông tin dịch bệnh từ nội dung crawl.
Trả về JSON:
{
  "articles": [
    {
      "title": "tiêu đề bài báo",
      "disease_type": "dengue|covid19|hfmd|measles|rabies|tuberculosis|influenza|other",
      "location": "tỉnh/thành phố",
      "case_count": null hoặc số,
      "severity": "low|medium|high|critical",
      "classification": "confirmed|emerging|predictive",
      "summary": "tóm tắt 1-2 câu",
      "source": "tên nguồn",
      "source_url": "url nguồn",
      "published_at": "YYYY-MM-DD"
    }
  ]
}
Chỉ trích xuất tin TỰC SỰ liên quan đến dịch bệnh/y tế công cộng.`
            },
            {
              role: 'user',
              content: `Phân tích nội dung crawl từ ${crawlResults.length} nguồn y tế:\n\n${combinedContent.substring(0, 8000)}`
            }
          ],
          temperature: 0.2,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';
        
        try {
          const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || [null, aiContent];
          const parsed = JSON.parse(jsonMatch[1] || aiContent);
          
          const articlesToInsert = (parsed.articles || []).map((a: any) => ({
            title: a.title,
            url: a.source_url || '#',
            source: a.source || 'crawl',
            published_at: a.published_at ? new Date(a.published_at).toISOString() : new Date().toISOString(),
            ai_summary: a.summary,
            severity: a.severity || 'medium',
            classification: a.classification || 'confirmed',
            disease_type: a.disease_type,
            location: a.location,
            case_count: a.case_count,
            crawled_at: new Date().toISOString(),
          }));

          if (articlesToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('news_articles')
              .upsert(articlesToInsert, { onConflict: 'title' });
            
            if (insertError) {
              console.error('❌ Insert error:', insertError);
            } else {
              console.log(`✅ Inserted ${articlesToInsert.length} articles`);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            sourcesCrawled: crawlResults.length,
            articlesExtracted: parsed.articles?.length || 0,
            articles: parsed.articles || [],
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseErr) {
          console.error('❌ Parse error:', parseErr);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sourcesCrawled: crawlResults.length,
      articlesExtracted: 0,
      rawResults: crawlResults.map(r => ({ source: r.source, linksFound: r.links.length })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Crawler error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
