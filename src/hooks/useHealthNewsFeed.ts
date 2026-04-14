import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HealthNewsArticle {
  id: string;
  article_hash: string;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  content_summary: string | null;
  disease_type: string | null;
  location: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  classification: 'confirmed' | 'emerging' | 'predictive' | null;
  crawled_at: string;
  created_at: string;
}

interface SchedulerRun {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  articles_found: number;
  articles_new: number;
  error_message: string | null;
}

interface NewsFeedState {
  articles: HealthNewsArticle[];
  latestRun: SchedulerRun | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

export function useHealthNewsFeed(limit: number = 20) {
  const [state, setState] = useState<NewsFeedState>({
    articles: [],
    latestRun: null,
    isLoading: true,
    isConnected: false,
    error: null
  });

  // Fetch initial articles
  const fetchArticles = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch recent articles
      const { data: articles, error: articlesError } = await supabase
        .from('health_news_articles')
        .select('*')
        .order('crawled_at', { ascending: false })
        .limit(limit);

      if (articlesError) throw articlesError;

      // Fetch latest scheduler run
      const { data: runs, error: runsError } = await supabase
        .from('scheduler_runs')
        .select('*')
        .eq('job_name', 'scheduled-health-web-search')
        .order('started_at', { ascending: false })
        .limit(1);

      if (runsError) throw runsError;

      setState(prev => ({
        ...prev,
        articles: (articles || []) as HealthNewsArticle[],
        latestRun: runs?.[0] as SchedulerRun || null,
        isLoading: false
      }));

    } catch (error: any) {
      console.error('Failed to fetch news feed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  }, [limit]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase.channel('health-news-feed');

    channel
      .on('broadcast', { event: 'new-articles' }, (payload) => {
        console.log('📥 New articles received:', payload);
        
        const newArticles = payload.payload?.articles || [];
        if (newArticles.length > 0) {
          // Refresh the feed to get new articles
          fetchArticles();
          
          toast.success(`${newArticles.length} tin tức y tế mới`, {
            description: newArticles[0]?.title?.substring(0, 50) + '...'
          });
        }
      })
      .subscribe((status) => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'SUBSCRIBED'
        }));
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to health news realtime channel');
        }
      });

    // Also subscribe to database changes
    const dbChannel = supabase
      .channel('db-health-news')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_news_articles'
        },
        (payload) => {
          console.log('📰 New article in DB:', payload.new);
          setState(prev => ({
            ...prev,
            articles: [payload.new as HealthNewsArticle, ...prev.articles].slice(0, limit)
          }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      dbChannel.unsubscribe();
    };
  }, [fetchArticles, limit]);

  // Initial fetch
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Trigger manual search
  const triggerSearch = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-health-search');
      
      if (error) throw error;

      if (data.success) {
        toast.success(`Tìm thấy ${data.articlesNew} tin tức mới`, {
          description: `Đã quét ${data.articlesFound} bài, bỏ qua ${data.articlesSkipped} trùng lặp`
        });
        
        // Refresh articles
        await fetchArticles();
      } else {
        throw new Error(data.error || 'Search failed');
      }

    } catch (error: any) {
      console.error('Manual search failed:', error);
      toast.error('Lỗi tìm kiếm tin tức', { description: error.message });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchArticles]);

  return {
    ...state,
    fetchArticles,
    triggerSearch
  };
}

export type { HealthNewsArticle, SchedulerRun, NewsFeedState };
