import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Newspaper, RefreshCw, ExternalLink, Clock, MapPin,
  Zap, CheckCircle2, Brain, Tag,
  Loader2, Search, Filter, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PersonalReportDownloader } from '@/components/reports/PersonalReportDownloader';
import { vi, enUS } from 'date-fns/locale';
import { useDBNewsFeed, type DBNewsArticle } from '@/hooks/useDBNewsFeed';

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ClassificationFilter = 'all' | 'confirmed' | 'emerging' | 'predictive';

export function HealthNewsFeed() {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    articles,
    allArticles,
    totalCount,
    isLoading,
    error,
    isConnected,
    searchQuery,
    severityFilter,
    classificationFilter,
    handleSearch,
    handleSeverityFilter,
    handleClassificationFilter,
    handleArticleRead,
    triggerManualSearch,
    refresh,
  } = useDBNewsFeed(50);

  const locale = i18n.language === 'vi' ? vi : enUS;
  const isVi = i18n.language === 'vi';

  const hasActiveFilters = searchQuery.length > 0 || severityFilter !== 'all' || classificationFilter !== 'all';

  const clearAllFilters = useCallback(() => {
    handleSearch('');
    handleSeverityFilter('all');
    handleClassificationFilter('all');
  }, [handleSearch, handleSeverityFilter, handleClassificationFilter]);

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
      critical: isVi ? 'Nghiêm trọng' : 'Critical',
      high: isVi ? 'Cao' : 'High',
      medium: isVi ? 'Trung bình' : 'Medium',
      low: isVi ? 'Thấp' : 'Low'
    };
    return labels[severity] || severity;
  };

  const getClassificationLabel = (cls: string) => {
    const labels: Record<string, string> = {
      confirmed: isVi ? 'Xác nhận' : 'Confirmed',
      emerging: isVi ? 'Đang nổi' : 'Emerging',
      predictive: isVi ? 'Dự báo' : 'Predictive'
    };
    return labels[cls] || cls;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  const handleExpand = (article: DBNewsArticle) => {
    const newId = expanded === article.id ? null : article.id;
    setExpanded(newId);
    if (newId) {
      handleArticleRead(article.id, article.title);
    }
  };

  if (isLoading && articles.length === 0) {
    return (
      <Card className="rounded-xl sm:rounded-2xl border-border/50 h-full">
        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {isVi ? 'Đang tải tin tức từ database...' : 'Loading news from database...'}
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
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 bg-primary/10">
              <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm sm:text-base truncate">
                  {isVi ? 'Tin tức y tế' : 'Health News'}
                </CardTitle>
                {isConnected && (
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
                {isVi ? `${totalCount} bài viết trong database` : `${totalCount} articles in database`}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PersonalReportDownloader reportType="news" size="sm" variant="ghost" className="hidden sm:inline-flex" />
            <Button 
              size="sm" variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={cn("gap-1 rounded-lg h-7 sm:h-8 px-2", showFilters && "bg-primary/10 text-primary")}
            >
              <Filter className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" variant="ghost"
              onClick={() => triggerManualSearch()}
              disabled={isLoading}
              className="gap-1 rounded-lg h-7 sm:h-8 px-2 sm:px-3"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={isVi ? 'Tìm kiếm tin tức, bệnh, địa điểm...' : 'Search news, disease, location...'}
            className="h-8 pl-8 pr-8 text-xs rounded-lg bg-muted/50 border-border/50"
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        {/* Filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {(['all', 'critical', 'high', 'medium', 'low'] as SeverityFilter[]).map(sev => (
              <button
                key={sev}
                onClick={() => handleSeverityFilter(sev)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  severityFilter === sev 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                )}
              >
                {sev === 'all' ? (isVi ? 'Tất cả' : 'All') : getSeverityLabel(sev)}
              </button>
            ))}
            <span className="text-[10px] text-muted-foreground self-center">|</span>
            {(['all', 'confirmed', 'emerging', 'predictive'] as ClassificationFilter[]).map(cls => (
              <button
                key={cls}
                onClick={() => handleClassificationFilter(cls)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  classificationFilter === cls
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                )}
              >
                {cls === 'all' ? (isVi ? 'Tất cả' : 'All') : getClassificationLabel(cls)}
              </button>
            ))}
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20">
                <X className="h-2.5 w-2.5 inline mr-0.5" />
                {isVi ? 'Xóa lọc' : 'Clear'}
              </button>
            )}
          </div>
        )}
        
        {/* Result count */}
        {hasActiveFilters && (
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-muted-foreground">
              {articles.length}/{allArticles.length} {isVi ? 'kết quả' : 'results'}
            </span>
          </div>
        )}

        {error && (
          <div className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        <ScrollArea className="h-[280px] sm:h-[340px] lg:h-[380px] pr-2 sm:pr-4">
          <div className="space-y-2 sm:space-y-3">
            {articles.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <Newspaper className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">
                  {hasActiveFilters
                    ? (isVi ? 'Không tìm thấy kết quả phù hợp' : 'No matching results')
                    : (isVi ? 'Chưa có tin tức trong database' : 'No news in database yet')
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                    {isVi ? 'Xóa bộ lọc' : 'Clear filters'}
                  </Button>
                )}
              </div>
            ) : (
              articles.map((article) => (
                <div
                  key={article.id}
                  className={cn(
                    "p-2.5 sm:p-3 rounded-lg sm:rounded-xl border bg-card/50 hover:bg-muted/30 transition-all cursor-pointer",
                    article.severity === 'critical' && "border-destructive/30 bg-destructive/5",
                    article.severity === 'high' && "border-orange-500/30 bg-orange-500/5",
                    expanded === article.id && "ring-2 ring-primary/30"
                  )}
                  onClick={() => handleExpand(article)}
                >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                        {article.severity && (
                          <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", severityColors[article.severity])}>
                            {getSeverityLabel(article.severity)}
                          </Badge>
                        )}
                        {article.classification && (
                          <Badge variant="outline" className={cn("text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0", classificationColors[article.classification])}>
                            {getClassificationLabel(article.classification)}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1">
                        {article.title}
                      </h4>

                      {/* Disease tag */}
                      {article.diseaseType && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <Tag className="h-2.5 w-2.5 text-primary" />
                          <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 py-0 bg-primary/10 text-primary font-normal">
                            {article.diseaseType}
                          </Badge>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" />
                          {article.source}
                        </span>
                        {article.location && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {article.location}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(article.publishedAt)}
                        </span>
                      </div>

                      {/* Expanded */}
                      {expanded === article.id && (
                        <div className="mt-2 pt-2 border-t">
                          {article.aiSummary && (
                            <>
                              <div className="flex items-center gap-1 mb-1">
                                <Brain className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-medium text-primary">
                                  {isVi ? 'Tóm tắt AI' : 'AI Summary'}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground">{article.aiSummary}</p>
                            </>
                          )}
                          {article.url && article.url !== '#' && article.url.startsWith('http') ? (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-xs font-medium text-primary hover:underline bg-primary/10 px-2 py-1 rounded-md"
                            >
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              {isVi ? 'Nguồn xác thực' : 'Verified source'}
                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                              <span className="text-[9px] text-muted-foreground font-normal ml-1 truncate max-w-[180px]">
                                {article.url.replace('https://', '').split('/').slice(0, 2).join('/')}
                              </span>
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-2 text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              <Brain className="h-3 w-3" />
                              {isVi ? 'Tóm tắt AI — chưa có link nguồn' : 'AI summary — no verified source link'}
                            </span>
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

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-dashed">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span>{isVi ? 'Dữ liệu từ Supabase Database — Realtime' : 'Data from Supabase Database — Realtime'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
