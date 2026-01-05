import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Download, Crown, Calendar, 
  BarChart3, Activity, Shield, Sparkles, 
  CheckCircle2, Loader2, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserHealthProfile } from '@/pages/BioVault';

interface HealthAuditReportProps {
  profile: UserHealthProfile | null;
}

export const HealthAuditReport: React.FC<HealthAuditReportProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate report generation
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 300));
      setGenerationProgress(i);
    }

    setIsGenerating(false);
    toast.success(t('biovault.audit.reportReady', 'Báo cáo đã sẵn sàng để tải xuống'), {
      description: t('biovault.audit.reportDesc', 'Health-Weather Audit Report - Tháng 12/2024')
    });
  };

  const reportSections = [
    {
      icon: Activity,
      title: t('biovault.audit.healthSummary', 'Tóm tắt sức khỏe'),
      description: t('biovault.audit.healthSummaryDesc', 'Tổng hợp các chỉ số từ hồ sơ y tế')
    },
    {
      icon: BarChart3,
      title: t('biovault.audit.environmentCorrelation', 'Tương quan môi trường'),
      description: t('biovault.audit.environmentCorrelationDesc', 'Phân tích ảnh hưởng thời tiết lên sức khỏe')
    },
    {
      icon: Shield,
      title: t('biovault.audit.riskAssessment', 'Đánh giá rủi ro'),
      description: t('biovault.audit.riskAssessmentDesc', 'Dự báo và phòng ngừa trong tháng tới')
    },
    {
      icon: Sparkles,
      title: t('biovault.audit.aiRecommendations', 'Khuyến nghị AI'),
      description: t('biovault.audit.aiRecommendationsDesc', 'Lời khuyên cá nhân hóa từ Hidden Pattern Engine')
    }
  ];

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          {t('biovault.audit.title', 'Health-Weather Audit Report')}
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 ml-2">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </CardTitle>
        <CardDescription>
          {t('biovault.audit.description', 'Báo cáo PDF chuyên nghiệp phân tích tương quan sức khỏe và môi trường')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Report Preview */}
        <div className="p-4 rounded-xl border-2 border-dashed border-amber-500/30 bg-background/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <FileText className="h-8 w-8 text-amber-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">
                Personal Health-Weather Audit
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('biovault.audit.period', 'Kỳ báo cáo')}: {new Date().toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">PDF</Badge>
                <Badge variant="outline" className="text-xs">~15 {t('biovault.audit.pages', 'trang')}</Badge>
                <Badge variant="outline" className="text-xs">ICD-11</Badge>
              </div>
            </div>
          </div>

          {/* Report Sections */}
          <div className="space-y-2">
            {reportSections.map((section, i) => (
              <div 
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
              >
                <section.icon className="h-4 w-4 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{section.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{section.description}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            ))}
          </div>
        </div>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('biovault.audit.generating', 'Đang tạo báo cáo...')}
              </span>
              <span className="font-medium">{generationProgress}%</span>
            </div>
            <Progress value={generationProgress} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || !profile}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {t('biovault.audit.generate', 'Tạo báo cáo')}
          </Button>
          
          <Button variant="outline" disabled={isGenerating}>
            <FileDown className="h-4 w-4 mr-2" />
            {t('biovault.audit.download', 'Tải xuống')}
          </Button>
        </div>

        {/* Subscription Info */}
        <div className="p-3 rounded-lg bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            {t('biovault.audit.subscriptionInfo', 'Báo cáo tự động tạo vào ngày 1 hàng tháng cho người dùng Premium')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
