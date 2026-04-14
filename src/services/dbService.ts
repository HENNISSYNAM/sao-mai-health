/**
 * DB-First Service Layer
 * All user actions must be persisted to database BEFORE updating UI.
 * This service provides typed methods for recording user events
 * and performing DB-first operations.
 */

import { supabase } from '@/integrations/supabase/client';

// ============ Types ============

export type ActionType =
  | 'search'
  | 'filter'
  | 'toggle'
  | 'news_confirm'
  | 'alert_mark'
  | 'news_fetch'
  | 'news_read'
  | 'mode_switch'
  | 'manual_refresh'
  | string;

export interface UserEvent {
  id: string;
  user_id: string;
  action_type: ActionType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface RecordEventOptions {
  actionType: ActionType;
  payload?: Record<string, unknown>;
}

// ============ Core: Record User Event ============

/**
 * Records a user event to the database.
 * Returns the inserted event on success, or throws on failure.
 * UI should ONLY update after this resolves successfully.
 */
export async function recordUserEvent(
  options: RecordEventOptions
): Promise<UserEvent> {
  const { actionType, payload = {} } = options;

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // For non-authenticated users, we still want to track but skip DB insert
    console.warn('⚠️ No authenticated user — skipping DB event recording');
    // Return a synthetic event so UI can still proceed
    return {
      id: crypto.randomUUID(),
      user_id: 'anonymous',
      action_type: actionType,
      payload,
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('user_events')
    .insert([{
      user_id: user.id,
      action_type: actionType,
      payload: payload as any,
    }])
    .select()
    .single();

  if (error) {
    console.error(`❌ Failed to record event [${actionType}]:`, error);
    throw new Error(`DB write failed: ${error.message}`);
  }

  console.log(`✅ Event recorded [${actionType}]`, data);
  return data as UserEvent;
}

// ============ News Feed: DB-First Operations ============

export interface NewsArticleFromDB {
  id: string;
  article_hash: string;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  content_summary: string | null;
  disease_type: string | null;
  location: string | null;
  severity: string | null;
  classification: string | null;
  crawled_at: string;
  created_at: string;
}

/**
 * Fetches news articles directly from the database.
 * This is the SINGLE SOURCE OF TRUTH for the news feed.
 */
export async function fetchNewsFromDB(
  limit: number = 50,
  offset: number = 0
): Promise<{ articles: NewsArticleFromDB[]; count: number }> {
  const { data, error, count } = await supabase
    .from('health_news_articles')
    .select('*', { count: 'exact' })
    .order('crawled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('❌ Failed to fetch news from DB:', error);
    throw new Error(`DB read failed: ${error.message}`);
  }

  return {
    articles: (data || []) as NewsArticleFromDB[],
    count: count || 0,
  };
}

/**
 * Records a search action and returns the event.
 * UI search state should only update after this succeeds.
 */
export async function recordSearch(query: string): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'search',
    payload: { query, timestamp: Date.now() },
  });
}

/**
 * Records a filter change action.
 */
export async function recordFilter(
  filterType: string,
  filterValue: string
): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'filter',
    payload: { filterType, filterValue },
  });
}

/**
 * Records a toggle action (e.g., expert mode, live mode).
 */
export async function recordToggle(
  toggleName: string,
  newValue: boolean
): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'toggle',
    payload: { toggleName, newValue },
  });
}

/**
 * Records when user reads/expands a news article.
 */
export async function recordNewsRead(articleId: string, articleTitle: string): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'news_read',
    payload: { articleId, articleTitle },
  });
}

/**
 * Records a manual refresh action.
 */
export async function recordManualRefresh(source: string): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'manual_refresh',
    payload: { source },
  });
}

/**
 * Records alert acknowledgement.
 */
export async function recordAlertMark(
  alertId: string,
  action: 'acknowledge' | 'dismiss' | 'close'
): Promise<UserEvent> {
  return recordUserEvent({
    actionType: 'alert_mark',
    payload: { alertId, action },
  });
}

/**
 * Subscribe to realtime inserts on health_news_articles.
 * Returns an unsubscribe function.
 */
export function subscribeToNewsInserts(
  onNewArticle: (article: NewsArticleFromDB) => void
): () => void {
  const channel = supabase
    .channel('db-news-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'health_news_articles',
      },
      (payload) => {
        console.log('📰 Realtime new article:', payload.new);
        onNewArticle(payload.new as NewsArticleFromDB);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to health_news_articles realtime');
      }
    });

  return () => {
    channel.unsubscribe();
  };
}

/**
 * Subscribe to realtime user_events for the current user.
 * Useful for multi-tab sync.
 */
export function subscribeToUserEvents(
  onEvent: (event: UserEvent) => void
): () => void {
  const channel = supabase
    .channel('user-events-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_events',
      },
      (payload) => {
        onEvent(payload.new as UserEvent);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
