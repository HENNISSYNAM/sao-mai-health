import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Send, Bell, FileText, CheckCircle, 
  Clock, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Alert {
  id: string;
  disease_code: string;
  day: string;
  cases: number;
  status: string;
  district_id?: string;
  level: 'critical' | 'high' | 'medium' | 'low';
}

interface CommandControlPanelProps {
  alert: Alert;
  onActionComplete?: () => void;
}

export function CommandControlPanel({ alert, onActionComplete }: CommandControlPanelProps) {
  const { t, i18n } = useTranslation();
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [isNotifying, setIsNotifying] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDispatchTeam = async () => {
    setIsDispatching(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: t('alerts.actions.dispatchTeam'),
        description: i18n.language === 'vi' 
          ? `Đội phản ứng nhanh đã được điều phối đến ${alert.district_id || 'khu vực'}`
          : `Rapid response team dispatched to ${alert.district_id || 'area'}`
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        variant: 'destructive'
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleNotifyAuthorities = async () => {
    setIsNotifying(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: t('alerts.actions.notifyAuthorities'),
        description: i18n.language === 'vi' 
          ? 'Đã gửi thông báo đến Sở Y tế và CDC địa phương'
          : 'Notification sent to Department of Health and local CDC'
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        variant: 'destructive'
      });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      // Generate report content
      const reportContent = {
        alertId: alert.id,
        disease: alert.disease_code,
        date: alert.day,
        cases: alert.cases,
        level: alert.level,
        location: alert.district_id,
        generatedAt: new Date().toISOString(),
        format: 'WHO-IHR-2005'
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alert-report-${alert.id}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: t('alerts.actions.exportReport'),
        description: i18n.language === 'vi' 
          ? 'Báo cáo tuân thủ IHR-2005 đã được tải xuống'
          : 'IHR-2005 compliant report downloaded'
      });
      onActionComplete?.();
    } catch (error) {
      toast({
        title: t('common.error'),
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const levelConfig = {
    critical: { color: 'bg-danger text-danger-foreground', icon: AlertTriangle },
    high: { color: 'bg-warning text-warning-foreground', icon: AlertTriangle },
    medium: { color: 'bg-primary text-primary-foreground', icon: Clock },
    low: { color: 'bg-success text-success-foreground', icon: CheckCircle }
  };

  const config = levelConfig[alert.level] || levelConfig.medium;
  const Icon = config.icon;

  return (
    <Card className="rounded-2xl border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {i18n.language === 'vi' ? 'Trung tâm điều hành' : 'Command & Control'}
          </CardTitle>
          <Badge className={config.color}>
            {t(`alerts.level.${alert.level}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Alert summary */}
        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{i18n.language === 'vi' ? 'Bệnh:' : 'Disease:'}</span>
            <span className="font-semibold">{alert.disease_code.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{i18n.language === 'vi' ? 'Số ca:' : 'Cases:'}</span>
            <span className="font-semibold">{alert.cases}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{i18n.language === 'vi' ? 'Khu vực:' : 'Location:'}</span>
            <span className="font-semibold">{alert.district_id || 'N/A'}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid gap-2">
          <Button
            onClick={handleDispatchTeam}
            disabled={isDispatching || isNotifying || isExporting}
            className="w-full justify-start gap-2"
            variant={alert.level === 'critical' ? 'destructive' : 'default'}
          >
            {isDispatching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            {t('alerts.actions.dispatchTeam')}
          </Button>

          <Button
            onClick={handleNotifyAuthorities}
            disabled={isDispatching || isNotifying || isExporting}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            {isNotifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {t('alerts.actions.notifyAuthorities')}
          </Button>

          <Button
            onClick={handleExportReport}
            disabled={isDispatching || isNotifying || isExporting}
            className="w-full justify-start gap-2"
            variant="secondary"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {t('alerts.actions.exportReport')}
          </Button>
        </div>

        {/* Compliance badges */}
        <div className="pt-3 border-t border-border flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {t('compliance.gdpr')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t('compliance.hipaa')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t('compliance.anonymized')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
