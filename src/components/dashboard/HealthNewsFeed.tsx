import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Zap,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealthNewsFeed, type HealthNewsArticle } from '@/hooks/useHealthNewsFeed';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

export function HealthNewsFeed() {
  const { i18n } = useTranslation();
  const { articles, latestRun, isLoading, isConnected, triggerSearch } = useHealthNewsFeed(15);
  const [expanded, setExpanded] = useState<string | null>(null);

  const locale = i18n.language === 'vi' ? vi : enUS;

  const severityColors: Record<string, string> = {
    critical: 'bg-destructive/20 text-destructive border-destructive/30',
    high: 'bg-danger/20 text-danger border-danger/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-success/20 text-success border-success/30'
  };

  const classificationColors: Record<string, string> = {
    confirmed: 'bg-success/20 text-success',
    emerging: 'bg-warning/20 text-warning',
    predictive: 'bg-primary/20 text-primary'
  };

  const classificationIcons: Record<string, React.ReactNode> = {
    confirmed: <CheckCircle2 className="h-3 w-3" />,
    emerging: <AlertTriangle className="h-3 w-3" />,
    predictive: <TrendingUp className="h-3 w-3" />
  };

  const diseaseLabels: Record<string, string> = {
    dengue: 'Sốt xuất huyết',
    covid19: 'COVID-19',
    hfmd: 'Tay chân miệng',
    influenza: 'Cúm',
    ari: 'Hô hấp',
    environmental: 'Môi trường',
    food_safety: 'An toàn thực phẩm',
    other: 'Khác'
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
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Newspaper className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {i18n.language === 'vi' ? 'Tin tức Y tế Real-time' : 'Real-time Health News'}
              </CardTitle>
              <CardDescription className="text-xs">
                {i18n.language === 'vi' 
                  ? 'Tự động cập nhật mỗi 15 phút' 
                  : 'Auto-updates every 15 minutes'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 text-xs",
                isConnected 
                  ? "border-success/50 bg-success/10 text-success" 
                  : "border-muted"
              )}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  LIVE
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Offline
                </>
              )}
            </Badge>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={triggerSearch}
              disabled={isLoading}
              className="gap-1 rounded-lg"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">
                {i18n.language === 'vi' ? 'Quét ngay' : 'Scan Now'}
              </span>
            </Button>
          </div>
        </div>

        {/* Last run info */}
        {latestRun && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(latestRun.completed_at || latestRun.started_at)}
            </span>
            <span className="flex items-center gap-1">
              {latestRun.status === 'completed' ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : latestRun.status === 'failed' ? (
                <XCircle className="h-3 w-3 text-destructive" />
              ) : (
                <RefreshCw className="h-3 w-3 animate-spin" />
              )}
              {latestRun.articles_new} {i18n.language === 'vi' ? 'mới' : 'new'} / {latestRun.articles_found} {i18n.language === 'vi' ? 'tìm thấy' : 'found'}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {i18n.language === 'vi' ? 'Chưa có tin tức' : 'No news yet'}
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={triggerSearch}
                  className="mt-2"
                >
                  {i18n.language === 'vi' ? 'Bắt đầu quét' : 'Start scanning'}
                </Button>
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={cn(
                    "p-3 rounded-xl border bg-card/50 hover:bg-muted/30 transition-colors cursor-pointer",
                    article.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                    article.severity === 'high' && "border-danger/30 bg-danger/5",
                    expanded === article.id && "ring-2 ring-primary/30"
                  )}
                  onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {article.severity && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", severityColors[article.severity])}
                          >
                            {article.severity.toUpperCase()}
                          </Badge>
                        )}
                        {article.classification && (
                          <Badge 
                            variant="secondary" 
                            className={cn("text-[10px] px-1.5 py-0 gap-0.5", classificationColors[article.classification])}
                          >
                            {classificationIcons[article.classification]}
                            {article.classification}
                          </Badge>
                        )}
                        {article.disease_type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {diseaseLabels[article.disease_type] || article.disease_type}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {article.title}
                      </h4>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {article.source}
                        </span>
                        {article.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {article.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(article.crawled_at)}
                        </span>
                      </div>

                      {/* Expanded content */}
                      {expanded === article.id && article.content_summary && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            {article.content_summary}
                          </p>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {i18n.language === 'vi' ? 'Đọc thêm' : 'Read more'}
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
      </CardContent>
    </Card>
  );
}
