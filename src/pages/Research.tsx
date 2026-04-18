import { useState } from 'react';
import { useMedicalResearch } from '@/hooks/useMedicalResearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, RefreshCw, BookOpen, FlaskConical, Brain, Activity, Globe2, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: BookOpen },
  { id: 'infectious_diseases', label: 'Truyền nhiễm', icon: Activity },
  { id: 'chronic_diseases', label: 'Mãn tính', icon: FlaskConical },
  { id: 'ai_medicine', label: 'AI Y tế', icon: Brain },
  { id: 'public_health', label: 'YT Cộng đồng', icon: Globe2 },
];

export default function Research() {
  const [category, setCategory] = useState<string>('all');
  const { articles, isLoading, isFetching, triggerFetch } = useMedicalResearch(category, 50);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-primary" />
            Nghiên cứu Y học
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cập nhật từ <span className="font-semibold text-foreground">PubMed (NIH/NCBI)</span> · Tự động mỗi ngày 6:00 ICT
          </p>
        </div>
        <Button
          onClick={triggerFetch}
          disabled={isFetching}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Đang quét…' : 'Cập nhật ngay'}
        </Button>
      </div>

      {/* Trust indicator */}
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 mt-2 animate-pulse flex-shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Nguồn xác thực cao:</span>{' '}
            <span className="text-muted-foreground">
              PubMed là cơ sở dữ liệu y sinh hàng đầu thế giới do Thư viện Y khoa Quốc gia Hoa Kỳ (NLM/NIH) duy trì,
              chứa hơn 36 triệu bài báo bình duyệt từ MEDLINE và các tạp chí khoa học sự sống.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={setCategory} className="mb-4">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5 text-xs sm:text-sm">
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>
      </Tabs>

      {/* Articles list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : articles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có nghiên cứu nào trong danh mục này.</p>
              <Button onClick={triggerFetch} variant="link" className="mt-2">
                Quét PubMed ngay
              </Button>
            </CardContent>
          </Card>
        ) : (
          articles.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base sm:text-lg leading-snug">
                    {a.title}
                  </CardTitle>
                  <a
                    href={a.pubmed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-muted-foreground hover:text-primary"
                    title="Mở trên PubMed"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                  {a.journal && (
                    <span className="font-medium italic">{a.journal}</span>
                  )}
                  {a.publication_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {a.publication_date}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    PMID: {a.pmid}
                  </Badge>
                </div>
                {a.authors && a.authors.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {a.authors.slice(0, 3).join(', ')}
                    {a.authors.length > 3 && ` và ${a.authors.length - 3} đồng tác giả`}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {a.ai_summary_vi && (
                  <div className="rounded-md bg-accent/40 p-3 text-sm">
                    <span className="font-semibold text-primary text-xs uppercase tracking-wide">
                      Tóm tắt VI
                    </span>
                    <p className="mt-1">{a.ai_summary_vi}</p>
                    {a.ai_clinical_relevance && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        💡 {a.ai_clinical_relevance}
                      </p>
                    )}
                  </div>
                )}
                {a.abstract && !a.ai_summary_vi && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{a.abstract}</p>
                )}
                {a.mesh_terms && a.mesh_terms.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {a.mesh_terms.slice(0, 5).map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>
                    Cập nhật {formatDistanceToNow(new Date(a.fetched_at), { addSuffix: true, locale: vi })}
                  </span>
                  {a.doi && (
                    <a
                      href={`https://doi.org/${a.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                    >
                      DOI: {a.doi}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
