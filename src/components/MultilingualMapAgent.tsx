import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Loader2, Sparkles, MapPin, Activity, AlertTriangle } from 'lucide-react';

interface MapCommand {
  cmd: string;
  lat?: number;
  lng?: number;
  color?: string;
  label?: string;
  radius_km?: number;
  points?: Array<{ lat: number; lng: number }>;
}

interface MultilingualMapAgentProps {
  onExecuteCommands: (commands: MapCommand[]) => void;
}

export function MultilingualMapAgent({ onExecuteCommands }: MultilingualMapAgentProps) {
  const { t, i18n } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>('');

  const examplePrompts = i18n.language === 'vi' 
    ? [
        "Hiển thị nguy cơ sốt xuất huyết ở Đông Nam Á",
        "Đánh dấu 5 điểm nóng COVID-19 tại TP.HCM",
        "Vẽ heatmap ca bệnh trong 7 ngày qua",
        "Tìm điểm nóng dịch bệnh gần sân bay Tân Sơn Nhất"
      ]
    : [
        "Show dengue risk in Southeast Asia",
        "Mark top 5 COVID-19 hotspots in HCMC",
        "Draw heatmap for cases in last 7 days",
        "Find disease hotspots near Tan Son Nhat airport"
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    setLastResponse('');

    try {
      // Enhance prompt with language context
      const enhancedPrompt = `[Language: ${i18n.language}] ${prompt}`;

      const { data, error } = await supabase.functions.invoke('map-agent', {
        body: { prompt: enhancedPrompt }
      });

      if (error) throw error;

      if (data?.commands && data.commands.length > 0) {
        onExecuteCommands(data.commands);
        setLastResponse(i18n.language === 'vi' 
          ? `✓ Đã thực hiện ${data.commands.length} lệnh bản đồ`
          : `✓ Executed ${data.commands.length} map commands`
        );
        toast({
          title: t('common.success'),
          description: `${data.commands.length} ${i18n.language === 'vi' ? 'thao tác' : 'actions'}`
        });
      } else {
        setLastResponse(i18n.language === 'vi' 
          ? 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
          : 'Could not process request. Please try again.'
        );
      }

      setPrompt('');
    } catch (error: any) {
      console.error('Map agent error:', error);
      setLastResponse(i18n.language === 'vi' 
        ? `Lỗi: ${error.message || 'Không xác định'}`
        : `Error: ${error.message || 'Unknown'}`
      );
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="rounded-2xl border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          {t('maps.aiAgent.title')}
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            Multi-lingual
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('maps.aiAgent.placeholder')}
            className="min-h-[100px] resize-none"
            disabled={isProcessing}
          />

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2">
            {examplePrompts.slice(0, 2).map((example, i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setPrompt(example)}
                disabled={isProcessing}
              >
                {example.slice(0, 40)}...
              </Button>
            ))}
          </div>

          <Button
            type="submit"
            disabled={isProcessing || !prompt.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('maps.aiAgent.processing')}
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                {i18n.language === 'vi' ? 'Thực hiện' : 'Execute'}
              </>
            )}
          </Button>
        </form>

        {/* Response */}
        {lastResponse && (
          <div className={`p-3 rounded-lg text-sm ${
            lastResponse.startsWith('✓') 
              ? 'bg-success/10 text-success border border-success/20' 
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}>
            {lastResponse}
          </div>
        )}

        {/* Capabilities */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {i18n.language === 'vi' ? 'Khả năng:' : 'Capabilities:'}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Đánh dấu điểm' : 'Add markers'}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Vẽ heatmap' : 'Draw heatmaps'}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Phân tích nguy cơ' : 'Risk analysis'}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              {i18n.language === 'vi' ? 'Dự báo dịch bệnh' : 'Disease forecast'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
