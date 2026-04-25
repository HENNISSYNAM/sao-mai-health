/**
 * DB-First News Feed Hook
 * - Fetches articles from database (single source of truth)
 * - Subscribes to realtime inserts
 * - Records all user actions to user_events before updating UI
 * - No mock data, no local-only state as primary source
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchNewsFromDB,
  subscribeToNewsInserts,
  recordSearch,
  recordFilter,
  recordToggle,
  recordNewsRead,
  recordManualRefresh,
  type NewsArticleFromDB,
} from '@/services/dbService';
import { useDebounce } from '@/hooks/useDebounce';

export interface DBNewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  aiSummary: string | null;
  diseaseType: string | null;
  location: string | null;
  severity: string | null;
  classification: string | null;
  crawledAt: string;
}

function mapDBArticle(row: NewsArticleFromDB): DBNewsArticle {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    publishedAt: row.published_at || row.crawled_at,
    aiSummary: row.content_summary,
    diseaseType: row.disease_type,
    location: row.location,
    severity: row.severity,
    classification: row.classification,
    crawledAt: row.crawled_at,
  };
}

export function useDBNewsFeed(limit: number = 50) {
  const [articles, setArticles] = useState<DBNewsArticle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Search & filter state (DB-first: recorded before applied)
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // ===== FETCH FROM DB (single source of truth) =====
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { articles: rows, count } = await fetchNewsFromDB(limit);
      setArticles(rows.map(mapDBArticle));
      setTotalCount(count);
    } catch (err: any) {
      console.error('Failed to fetch news:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // ===== REALTIME SUBSCRIPTION =====
  useEffect(() => {
    // Initial fetch
    fetchArticles();

    // Subscribe to new inserts
    const unsubscribe = subscribeToNewsInserts((newRow) => {
      const mapped = mapDBArticle(newRow);
      setArticles((prev) => {
        // Deduplicate
        if (prev.some((a) => a.id === mapped.id)) return prev;
        const updated = [mapped, ...prev];
        // Keep within limit
        return updated.slice(0, limit);
      });
      setTotalCount((c) => c + 1);
      toast.success('Tin tức mới', {
        description: mapped.title.substring(0, 60) + '...',
      });
    });

    setIsConnected(true);

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [fetchArticles, limit]);

  // ===== FILTERED ARTICLES (computed from DB data) =====
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (debouncedSearch.length >= 2) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((a) => {
        const text = [a.title, a.aiSummary, a.source, a.location, a.diseaseType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }

    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }

    if (classificationFilter !== 'all') {
      result = result.filter((a) => a.classification === classificationFilter);
    }

    return result;
  }, [articles, debouncedSearch, severityFilter, classificationFilter]);

  // ===== DB-FIRST ACTION HANDLERS =====

  /** Record search to DB, then update local state */
  const handleSearch = useCallback(async (query: string) => {
    try {
      await recordSearch(query);
    } catch {
      // Non-blocking: search still works even if event recording fails
    }
    setSearchQuery(query);
  }, []);

  /** Record filter to DB, then update local state */
  const handleSeverityFilter = useCallback(async (value: string) => {
    try {
      await recordFilter('severity', value);
    } catch {
      // Non-blocking
    }
    setSeverityFilter(value);
  }, []);

  const handleClassificationFilter = useCallback(async (value: string) => {
    try {
      await recordFilter('classification', value);
    } catch {
      // Non-blocking
    }
    setClassificationFilter(value);
  }, []);

  /** Record article read to DB */
  const handleArticleRead = useCallback(async (articleId: string, title: string) => {
    try {
      await recordNewsRead(articleId, title);
    } catch {
      // Non-blocking
    }
  }, []);

  /** Trigger manual search via edge function, record event first */
  const triggerManualSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      await recordManualRefresh('news_feed');
      
      const { data, error } = await supabase.functions.invoke('scheduled-health-search');
      if (error) throw error;

      if (data?.success) {
        toast.success(`Tìm thấy ${data.articlesNew || 0} tin tức mới`);
        // Refresh from DB to get the newly inserted articles
        await fetchArticles();
      }
    } catch (err: any) {
      console.error('Manual search failed:', err);
      toast.error('Lỗi tìm kiếm', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [fetchArticles]);

  /** Toggle expert mode, record to DB first */
  const handleToggle = useCallback(async (name: string, value: boolean) => {
    try {
      await recordToggle(name, value);
    } catch {
      // Non-blocking
    }
  }, []);

  return {
    // Data (from DB)
    articles: filteredArticles,
    allArticles: articles,
    totalCount,
    isLoading,
    error,
    isConnected,

    // Search & filter state
    searchQuery,
    severityFilter,
    classificationFilter,

    // DB-first action handlers
    handleSearch,
    handleSeverityFilter,
    handleClassificationFilter,
    handleArticleRead,
    triggerManualSearch,
    handleToggle,

    // Direct refresh from DB
    refresh: fetchArticles,
  };
}
