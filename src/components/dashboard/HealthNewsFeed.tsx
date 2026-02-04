import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  MapPin,
  Zap,
  CheckCircle2,
  Brain,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

interface HealthNewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  content_summary: string | null;
  disease_type: string | null;
  location: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  crawled_at: string;
}

// Extract keywords from summary
const extractKeywords = (summary: string | null): string[] => {
  if (!summary) return [];
  
  // Common health-related keywords to highlight
  const healthKeywords = [
    'dengue', 'sốt xuất huyết', 'covid', 'cúm', 'flu', 'influenza',
    'dịch bệnh', 'outbreak', 'ca nhiễm', 'cases', 'tử vong', 'death',
    'vaccine', 'vắc-xin', 'tiêm chủng', 'vaccination', 'bệnh viện', 'hospital',
    'triệu chứng', 'symptoms', 'phòng ngừa', 'prevention', 'điều trị', 'treatment',
    'lây lan', 'spread', 'cảnh báo', 'warning', 'khẩn cấp', 'emergency',
    'WHO', 'CDC', 'Bộ Y tế', 'Ministry of Health'
  ];
  
  const words = summary.toLowerCase().split(/[\s,.\-()]+/);
  const foundKeywords: string[] = [];
  
  healthKeywords.forEach(keyword => {
    if (summary.toLowerCase().includes(keyword.toLowerCase()) && !foundKeywords.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  });
  
  // Also extract numbers with context (e.g., "150 ca", "23 deaths")
  const numberPatterns = summary.match(/\d+\s*(ca|cases|người|deaths|tử vong|%)/gi);
  if (numberPatterns) {
    numberPatterns.slice(0, 2).forEach(pattern => {
      if (!foundKeywords.includes(pattern)) {
        foundKeywords.push(pattern);
      }
    });
  }
  
  return foundKeywords.slice(0, 5); // Limit to 5 keywords
};

export function HealthNewsFeed() {
  const { i18n, t } = useTranslation();
  const [articles, setArticles] = useState<HealthNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const locale = i18n.language === 'vi' ? vi : enUS;

  // Fetch articles on mount
  useEffect(() => {
    fetchArticles();
    
    // Subscribe to realtime updates (silent)
    const channel = supabase
      .channel('db-health-news-silent')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_news_articles'
        },
        (payload) => {
          setArticles(prev => [payload.new as HealthNewsArticle, ...prev].slice(0, 15));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_news_articles')
        .select('id, title, source, url, published_at, content_summary, disease_type, location, severity, crawled_at')
        .order('crawled_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setArticles(data as HealthNewsArticle[]);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-danger/20 text-danger border-danger/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30'
  };

  const getDiseaseLabel = (diseaseType: string | null) => {
    if (!diseaseType) return '';
    return t(`newsFeed.diseaseTypes.${diseaseType}`, t(`diseases.${diseaseType}`, diseaseType));
  };

  const getSeverityLabel = (severity: string | null) => {
    if (!severity) return '';
    return t(`newsFeed.severity.${severity}`, severity.toUpperCase());
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
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-5 sm:h-6 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 sm:h-20 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 bg-primary/10">
              <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">
                {t('newsFeed.title')}
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {t('newsFeed.autoUpdates')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2",
                isConnected 
                  ? "border-success/50 bg-success/10 text-success" 
                  : "border-muted"
              )}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-success"></span>
                  </span>
                  <span className="hidden sm:inline">LIVE</span>
                </>
              ) : (
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-muted-foreground" />
              )}
            </Badge>
            
            <Button 
              size="sm" 
              variant="ghost"
              onClick={fetchArticles}
              disabled={isLoading}
              className="gap-1 rounded-lg h-7 sm:h-8 px-2 sm:px-3"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        <ScrollArea className="h-[280px] sm:h-[340px] lg:h-[380px] pr-2 sm:pr-4">
          <div className="space-y-2 sm:space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Newspaper className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">
                  {t('newsFeed.noNews')}
                </p>
              </div>
            ) : (
              articles.map((article) => {
                const keywords = extractKeywords(article.content_summary);
                
                return (
                  <div
                    key={article.id}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-card/50 hover:bg-muted/30 transition-colors cursor-pointer",
                      article.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                      article.severity === 'high' && "border-danger/30 bg-danger/5",
                      expanded === article.id && "ring-2 ring-primary/30"
                    )}
                    onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                          {article.severity && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", severityColors[article.severity])}
                            >
                              {getSeverityLabel(article.severity)}
                            </Badge>
                          )}
                          {article.disease_type && (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                              {getDiseaseLabel(article.disease_type)}
                            </Badge>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1">
                          {article.title}
                        </h4>

                        {/* AI Keywords Summary - Always visible */}
                        {keywords.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mb-1.5">
                            <Brain className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary shrink-0" />
                            {keywords.map((keyword, idx) => (
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
                            {formatTime(article.crawled_at)}
                          </span>
                        </div>

                        {/* Expanded content */}
                        {expanded === article.id && article.content_summary && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {article.content_summary}
                            </p>
                            {article.url && (
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {t('newsFeed.readMore')}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Verified Sources & Disclaimer Footer */}
        <div className="mt-3 pt-3 border-t border-dashed space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 justify-center">
            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('newsFeed.verifiedSources')}:
            </span>
            {(i18n.language === 'vi' 
              ? ['Bộ Y tế VN', 'WHO', 'CDC']
              : ['Vietnam MOH', 'WHO', 'CDC']
            ).map((source) => (
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
            <span>{t('newsFeed.disclaimer')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
