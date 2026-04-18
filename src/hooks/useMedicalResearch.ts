import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MedicalResearchArticle {
  id: string;
  pmid: string;
  title: string;
  abstract: string | null;
  authors: string[] | null;
  journal: string | null;
  publication_date: string | null;
  doi: string | null;
  pubmed_url: string;
  topic_category: string;
  keywords: string[] | null;
  mesh_terms: string[] | null;
  ai_summary_vi: string | null;
  ai_clinical_relevance: string | null;
  fetched_at: string;
}

export function useMedicalResearch(category?: string, limit: number = 30) {
  const [articles, setArticles] = useState<MedicalResearchArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('medical_research_articles')
        .select('*')
        .order('publication_date', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (category && category !== 'all') {
        query = query.eq('topic_category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      setArticles((data || []) as MedicalResearchArticle[]);
    } catch (e: any) {
      console.error('Load research error:', e);
      toast.error('Lỗi tải nghiên cứu', { description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  const triggerFetch = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-pubmed-research', {
        body: {},
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`${data.new_articles} nghiên cứu mới từ PubMed`, {
          description: `Đã quét ${data.scanned} bài`,
        });
        await loadArticles();
      }
    } catch (e: any) {
      toast.error('Lỗi cập nhật PubMed', { description: e.message });
    } finally {
      setIsFetching(false);
    }
  }, [loadArticles]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('medical-research-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'medical_research_articles' },
        (payload) => {
          setArticles((prev) =>
            [payload.new as MedicalResearchArticle, ...prev].slice(0, limit)
          );
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [limit]);

  return { articles, isLoading, isFetching, loadArticles, triggerFetch };
}
