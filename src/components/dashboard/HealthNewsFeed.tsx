import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  MapPin,
  Zap,
  CheckCircle2,
  Brain,
  Tag,
  GraduationCap,
  Globe,
  Loader2,
  Search,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useDebounce } from '@/hooks/useDebounce';

interface WebSearchArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  aiSummary: string;
  keywords: string[];
  classification: 'confirmed' | 'emerging' | 'predictive';
  disease?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isAcademic?: boolean;
}

interface SearchResult {
  success: boolean;
  articles: WebSearchArticle[];
  overallRisk: string;
  lastUpdated: string;
  expertMode: boolean;
  citations: string[];
  metadata: {
    sourcesChecked: string[];
    searchDate: string;
    searchTime: string;
    articlesProcessed: number;
    mode: string;
  };
}

// Cache for both modes to enable instant switching
interface CacheEntry {
  articles: WebSearchArticle[];
  lastUpdated: string;
  metadata: SearchResult['metadata'];
  fetchedAt: number;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
const AUTO_REFRESH_INTERVAL = 90 * 1000; // 90 seconds auto-refresh

// Vietnamese-aware text normalization for search
const normalizeText = (text: string): string => {
  if (!text) return '';
  const accents: Record<string, string> = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d'
  };
  let normalized = text.toLowerCase().trim();
  for (const [accented, plain] of Object.entries(accents)) {
    normalized = normalized.replace(new RegExp(accented, 'g'), plain);
  }
  return normalized;
};

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ClassificationFilter = 'all' | 'confirmed' | 'emerging' | 'predictive';

export function HealthNewsFeed() {
  const { i18n, t } = useTranslation();
  const [articles, setArticles] = useState<WebSearchArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<SearchResult['metadata'] | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [countdown, setCountdown] = useState(90);
  
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 200);
  
  // Cache for both modes - persists across mode switches
  const [cache, setCache] = useState<{
    general: CacheEntry | null;
    expert: CacheEntry | null;
  }>({ general: null, expert: null });

  const locale = i18n.language === 'vi' ? vi : enUS;
  
  // Filtered articles based on search + filters
  const filteredArticles = useMemo(() => {
    let result = articles;
    
    // Text search across title, summary, keywords, source, location
    if (debouncedSearch.length >= 2) {
      const normalizedQuery = normalizeText(debouncedSearch);
      const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);
      
      result = result.filter(article => {
        const searchableText = normalizeText(
          [article.title, article.aiSummary, article.source, article.location, article.disease, ...(article.keywords || [])].filter(Boolean).join(' ')
        );
        // All terms must match (AND logic)
        return queryTerms.every(term => searchableText.includes(term));
      });
    }
    
    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(a => a.severity === severityFilter);
    }
    
    // Classification filter
    if (classificationFilter !== 'all') {
      result = result.filter(a => a.classification === classificationFilter);
    }
    
    return result;
  }, [articles, debouncedSearch, severityFilter, classificationFilter]);
  
  const hasActiveFilters = searchQuery.length > 0 || severityFilter !== 'all' || classificationFilter !== 'all';
  
  const clearAllFilters = () => {
    setSearchQuery('');
    setSeverityFilter('all');
    setClassificationFilter('all');
  };

  // Check if cache is valid
  const isCacheValid = useCallback((entry: CacheEntry | null): boolean => {
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < CACHE_TTL;
  }, []);

  // Get cache key based on mode
  const getCacheKey = useCallback((mode: boolean): 'general' | 'expert' => {
    return mode ? 'expert' : 'general';
  }, []);

  // Fetch news with caching
  const fetchNews = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey(expertMode);
    const cachedData = cache[cacheKey];

    // Use cache if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(cachedData)) {
      console.log(`⚡ Using cached ${cacheKey} data`);
      setArticles(cachedData!.articles);
      setLastUpdated(cachedData!.lastUpdated);
      setMetadata(cachedData!.metadata);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔍 Fetching fresh ${cacheKey} news...`);
      
      const { data, error } = await supabase.functions.invoke('health-news-intelligence', {
        body: { 
          expertMode, 
          language: i18n.language 
        }
      });

      if (error) {
        console.error('News fetch error:', error);
        return;
      }

      if (data?.success && data.articles) {
        // Detect new articles by comparing IDs
        const oldIds = new Set(articles.map(a => a.id));
        const incoming = data.articles as WebSearchArticle[];
        const freshIds = new Set<string>();
        incoming.forEach(a => {
          if (!oldIds.has(a.id)) freshIds.add(a.id);
        });
        
        if (freshIds.size > 0 && articles.length > 0) {
          setNewArticleIds(freshIds);
          // Clear highlight after 5s
          setTimeout(() => setNewArticleIds(new Set()), 5000);
        }

        // Update cache
        const newCacheEntry: CacheEntry = {
          articles: incoming,
          lastUpdated: data.lastUpdated,
          metadata: data.metadata,
          fetchedAt: Date.now()
        };
        
        setCache(prev => ({
          ...prev,
          [cacheKey]: newCacheEntry
        }));

        setArticles(incoming);
        setLastUpdated(data.lastUpdated);
        setMetadata(data.metadata);
        setLastRefreshTime(Date.now());
        setCountdown(90);
        console.log(`✅ Cached ${incoming.length} ${cacheKey} articles (${freshIds.size} new)`);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [expertMode, i18n.language, cache, getCacheKey, isCacheValid, articles]);

  // Auto-refresh interval (like Google News)
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing news feed...');
      fetchNews(true);
    }, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [isLive, fetchNews]);

  // Countdown timer
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        const elapsed = Math.floor((Date.now() - lastRefreshTime) / 1000);
        const remaining = Math.max(0, 90 - elapsed);
        return remaining;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive, lastRefreshTime]);

  // Handle mode switch - instant if cached
  useEffect(() => {
    const cacheKey = getCacheKey(expertMode);
    const cachedData = cache[cacheKey];

    if (isCacheValid(cachedData)) {
      // Instant switch using cache
      setArticles(cachedData!.articles);
      setLastUpdated(cachedData!.lastUpdated);
      setMetadata(cachedData!.metadata);
      setIsLoading(false);
    } else {
      // Fetch new data
      fetchNews();
    }
  }, [expertMode]);

  // Initial fetch on mount
  useEffect(() => {
    fetchNews();
  }, []);

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30'
  };

  const classificationColors: Record<string, string> = {
    confirmed: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    emerging: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    predictive: 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: i18n.language === 'vi' ? 'Nghiêm trọng' : 'Critical',
      high: i18n.language === 'vi' ? 'Cao' : 'High',
      medium: i18n.language === 'vi' ? 'Trung bình' : 'Medium',
      low: i18n.language === 'vi' ? 'Thấp' : 'Low'
    };
    return labels[severity] || severity;
  };

  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      confirmed: i18n.language === 'vi' ? 'Xác nhận' : 'Confirmed',
      emerging: i18n.language === 'vi' ? 'Đang nổi' : 'Emerging',
      predictive: i18n.language === 'vi' ? 'Dự báo' : 'Predictive'
    };
    return labels[classification] || classification;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  if (isLoading && articles.length === 0) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {expertMode 
              ? (i18n.language === 'vi' ? 'Đang tìm kiếm học thuật...' : 'Searching academic sources...')
              : (i18n.language === 'vi' ? 'Đang tìm tin tức mới nhất...' : 'Searching latest news...')
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0",
              expertMode ? "bg-purple-500/10" : "bg-primary/10"
            )}>
              {expertMode ? (
                <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
              ) : (
                <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm sm:text-base truncate">
                  {expertMode 
                    ? (i18n.language === 'vi' ? 'Nghiên cứu học thuật' : 'Academic Research')
                    : (i18n.language === 'vi' ? 'Tin tức y tế' : 'Health News')
                  }
                </CardTitle>
                {isLive && (
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-destructive">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                    </span>
                    LIVE
                  </span>
                )}
              </div>
              <CardDescription className="text-[10px] sm:text-xs">
                {isLive 
                  ? (i18n.language === 'vi' ? `Cập nhật sau ${countdown}s` : `Refreshing in ${countdown}s`)
                  : (metadata?.mode || (i18n.language === 'vi' ? 'Đã tạm dừng' : 'Paused'))
                }
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <Switch
                checked={expertMode}
                onCheckedChange={setExpertMode}
                className="data-[state=checked]:bg-purple-500"
              />
              <GraduationCap className={cn(
                "h-3 w-3",
                expertMode ? "text-purple-500" : "text-muted-foreground"
              )} />
            </div>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("gap-1 rounded-lg h-7 sm:h-8 px-2", showFilters && "bg-primary/10 text-primary")}
            >
              <Filter className="h-3 w-3" />
            </Button>

            <Button
              size="sm"
              variant={isLive ? "default" : "ghost"}
              onClick={() => setIsLive(!isLive)}
              className={cn(
                "gap-1 rounded-lg h-7 sm:h-8 px-2 text-[10px] sm:text-xs",
                isLive && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              )}
            >
              {isLive ? 'LIVE' : 'OFF'}
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => fetchNews(true)}
              disabled={isLoading}
              className="gap-1 rounded-lg h-7 sm:h-8 px-2 sm:px-3"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Search bar - always visible */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={i18n.language === 'vi' ? 'Tìm kiếm tin tức, bệnh, địa điểm...' : 'Search news, disease, location...'}
            className="h-8 pl-8 pr-8 text-xs rounded-lg bg-muted/50 border-border/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        {/* Filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {/* Severity filters */}
            {(['all', 'critical', 'high', 'medium', 'low'] as SeverityFilter[]).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  severityFilter === sev 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                )}
              >
                {sev === 'all' 
                  ? (i18n.language === 'vi' ? 'Tất cả' : 'All')
                  : getSeverityLabel(sev)
                }
              </button>
            ))}
            <span className="text-[10px] text-muted-foreground self-center">|</span>
            {(['all', 'confirmed', 'emerging', 'predictive'] as ClassificationFilter[]).map(cls => (
              <button
                key={cls}
                onClick={() => setClassificationFilter(cls)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  classificationFilter === cls
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                )}
              >
                {cls === 'all'
                  ? (i18n.language === 'vi' ? 'Tất cả' : 'All')
                  : getClassificationLabel(cls)
                }
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20">
                <X className="h-2.5 w-2.5 inline mr-0.5" />
                {i18n.language === 'vi' ? 'Xóa lọc' : 'Clear'}
              </button>
            )}
          </div>
        )}
        
        {/* Last updated + result count */}
        <div className="flex items-center justify-between">
          {lastUpdated && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatTime(lastUpdated)}</span>
            </div>
          )}
          {hasActiveFilters && (
            <span className="text-[10px] text-muted-foreground">
              {filteredArticles.length}/{articles.length} {i18n.language === 'vi' ? 'kết quả' : 'results'}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        <ScrollArea className="h-[280px] sm:h-[340px] lg:h-[380px] pr-2 sm:pr-4">
          <div className="space-y-2 sm:space-y-3">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Newspaper className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">
                  {hasActiveFilters
                    ? (i18n.language === 'vi' ? 'Không tìm thấy kết quả phù hợp' : 'No matching results')
                    : (i18n.language === 'vi' ? 'Không tìm thấy tin tức' : 'No news found')
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                    {i18n.language === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
                  </Button>
                )}
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-card/50 hover:bg-muted/30 transition-all duration-500 cursor-pointer",
                    article.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                    article.severity === 'high' && "border-orange-500/30 bg-orange-500/5",
                    article.isAcademic && "border-purple-500/20 bg-purple-500/5",
                    expanded === article.id && "ring-2 ring-primary/30",
                    newArticleIds.has(article.id) && "ring-2 ring-primary animate-pulse border-primary/50 bg-primary/5"
                  )}
                  onClick={() => {
                    if (article.url && article.url !== '#') {
                      window.open(article.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                        {article.isAcademic && (
                          <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                            <GraduationCap className="h-2 w-2 mr-0.5" />
                            {i18n.language === 'vi' ? 'Học thuật' : 'Academic'}
                          </Badge>
                        )}
                        {article.severity && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", severityColors[article.severity])}
                          >
                            {getSeverityLabel(article.severity)}
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", classificationColors[article.classification])}
                        >
                          {getClassificationLabel(article.classification)}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1">
                        {article.title}
                      </h4>

                      {/* AI Keywords - Always visible */}
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mb-1.5">
                          <Brain className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary shrink-0" />
                          {article.keywords.slice(0, 5).map((keyword, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary" 
                              className="text-[8px] sm:text-[9px] px-1 py-0 bg-primary/10 text-primary font-normal"
                            >
                              <Tag className="h-2 w-2 mr-0.5" />
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {article.source}
                        </span>
                        {article.location && (
                          <span className="flex items-center gap-0.5 sm:gap-1">
                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            {article.location}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 sm:gap-1">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {formatTime(article.publishedAt)}
                        </span>
                      </div>

                      {/* Expanded content - AI Summary */}
                      {expanded === article.id && article.aiSummary && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-medium text-primary">
                              {i18n.language === 'vi' ? 'Tóm tắt AI' : 'AI Summary'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {article.aiSummary}
                          </p>
                          {article.url && article.url !== '#' && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {article.isAcademic 
                                ? (i18n.language === 'vi' ? 'Xem nghiên cứu' : 'View Research')
                                : (i18n.language === 'vi' ? 'Đọc thêm' : 'Read More')
                              }
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Verified Sources Footer */}
        <div className="mt-3 pt-3 border-t border-dashed space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 justify-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Nguồn:' : 'Sources:'}
            </span>
            {(metadata?.sourcesChecked || []).slice(0, 4).map((source) => (
              <Badge 
                key={source}
                variant="outline" 
                className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-muted/50 font-normal"
              >
                {source}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>
              {expertMode 
                ? (i18n.language === 'vi' ? 'Tìm kiếm học thuật qua Perplexity' : 'Academic search via Perplexity')
                : (i18n.language === 'vi' ? 'Tìm kiếm real-time qua Perplexity' : 'Real-time search via Perplexity')
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
