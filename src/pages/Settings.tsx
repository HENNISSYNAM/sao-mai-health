import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, Globe, Shield, Moon, Smartphone, 
  Volume2, Vibrate, MapPin, Activity, Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [saved, setSaved] = useState(false);
  
  const [settings, setSettings] = useState({
    language: i18n.language,
    darkMode: true,
    notifications: true,
    soundAlerts: true,
    vibration: true,
    gpsTracking: true,
    autoSync: true,
    dataSharing: false,
    emergencyAlerts: true,
    weeklyReport: true
  });

  const handleSave = () => {
    if (settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
    setSaved(true);
    toast.success(t('settings.saved', 'Cài đặt đã được lưu'));
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.settings', 'Cài đặt')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('settings.subtitle', 'Tùy chỉnh trải nghiệm Digital Twin của bạn')}
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? t('settings.saved', 'Đã lưu') : t('settings.save', 'Lưu cài đặt')}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Language & Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {t('settings.language', 'Ngôn ngữ & Hiển thị')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.selectLanguage', 'Chọn ngôn ngữ')}</Label>
              <Select 
                value={settings.language} 
                onValueChange={(v) => updateSetting('language', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <Label>{t('settings.darkMode', 'Chế độ tối')}</Label>
              </div>
              <Switch 
                checked={settings.darkMode} 
                onCheckedChange={(v) => updateSetting('darkMode', v)} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-warning" />
              {t('settings.notifications', 'Thông báo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label>{t('settings.pushNotifications', 'Thông báo đẩy')}</Label>
              </div>
              <Switch 
                checked={settings.notifications} 
                onCheckedChange={(v) => updateSetting('notifications', v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Label>{t('settings.soundAlerts', 'Cảnh báo âm thanh')}</Label>
              </div>
              <Switch 
                checked={settings.soundAlerts} 
                onCheckedChange={(v) => updateSetting('soundAlerts', v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="h-4 w-4 text-muted-foreground" />
                <Label>{t('settings.vibration', 'Rung')}</Label>
              </div>
              <Switch 
                checked={settings.vibration} 
                onCheckedChange={(v) => updateSetting('vibration', v)} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-success" />
              {t('settings.privacy', 'Quyền riêng tư & Dữ liệu')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>{t('settings.gpsTracking', 'Theo dõi GPS')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.gpsDesc', 'Cần thiết cho cảnh báo theo vị trí')}
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings.gpsTracking} 
                onCheckedChange={(v) => updateSetting('gpsTracking', v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>{t('settings.dataSharing', 'Chia sẻ dữ liệu ẩn danh')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.dataSharingDesc', 'Giúp cải thiện dự báo dịch bệnh')}
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings.dataSharing} 
                onCheckedChange={(v) => updateSetting('dataSharing', v)} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Health Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-info" />
              {t('settings.healthAlerts', 'Cảnh báo sức khỏe')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="destructive" className="text-[10px]">CRITICAL</Badge>
                <Label>{t('settings.emergencyAlerts', 'Cảnh báo khẩn cấp')}</Label>
              </div>
              <Switch 
                checked={settings.emergencyAlerts} 
                onCheckedChange={(v) => updateSetting('emergencyAlerts', v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.weeklyReport', 'Báo cáo sức khỏe hàng tuần')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.weeklyReportDesc', 'Nhận tổng hợp mỗi Chủ nhật')}
                </p>
              </div>
              <Switch 
                checked={settings.weeklyReport} 
                onCheckedChange={(v) => updateSetting('weeklyReport', v)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.autoSync', 'Tự động đồng bộ')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.autoSyncDesc', 'Cập nhật Digital Twin realtime')}
                </p>
              </div>
              <Switch 
                checked={settings.autoSync} 
                onCheckedChange={(v) => updateSetting('autoSync', v)} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
