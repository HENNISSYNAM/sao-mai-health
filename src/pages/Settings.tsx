import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, Globe, Shield, Moon, 
  Volume2, Vibrate, MapPin, Activity, Save,
  CheckCircle2, Loader2, Zap, Brain, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SETTINGS_KEY = 'health_hub_settings';

interface UserSettings {
  language: "vi" | "en";
  darkMode: boolean;
  notifications: boolean;
  soundAlerts: boolean;
  vibration: boolean;
  gpsTracking: boolean;
  autoSync: boolean;
  dataSharing: boolean;
  emergencyAlerts: boolean;
  weeklyReport: boolean;
}

interface ActionReport {
  user_id: string;
  applied_settings: any;
  display_name_changes?: Array<{ code: string; vi: string; en: string; current_display: string }>;
  notification_policy: {
    push_enabled: boolean;
    allowed_severities: string[];
    sound: boolean;
    vibrate: boolean;
  };
  gps_policy: "precise" | "coarse";
  sharing_policy: "anonymous" | "disabled";
  critical_alert_policy: "enabled" | "disabled";
  weekly_report_scheduled: boolean;
  twin_sync_mode: "realtime" | "on_demand";
  ui_updates: { dark_mode_set: boolean };
  timestamp: string;
}

const defaultSettings: UserSettings = {
  language: "vi",
  darkMode: true,
  notifications: true,
  soundAlerts: true,
  vibration: true,
  gpsTracking: true,
  autoSync: true,
  dataSharing: false,
  emergencyAlerts: true,
  weeklyReport: true
};

const loadSettings = (): UserSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return defaultSettings;
};

const saveSettings = (settings: UserSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [actionReport, setActionReport] = useState<ActionReport | null>(null);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [initialized, setInitialized] = useState(false);

  // Apply theme to document
  const applyTheme = (isDark: boolean) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // Load settings on mount and sync language + theme
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    
    // Sync language with i18n
    if (loaded.language !== i18n.language) {
      i18n.changeLanguage(loaded.language);
    }
    
    // Apply theme
    applyTheme(loaded.darkMode);
    
    setInitialized(true);
  }, []);

  // Auto-save to localStorage when settings change (after initialization)
  useEffect(() => {
    if (initialized) {
      saveSettings(settings);
      // Apply theme when darkMode changes
      applyTheme(settings.darkMode);
    }
  }, [settings, initialized]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Build settings payload for the agent
      const payload = {
        user_id: "anonymous_user",
        settings: {
          language: settings.language,
          dark_mode: settings.darkMode,
          notifications: {
            push: settings.notifications,
            sound: settings.soundAlerts,
            vibrate: settings.vibration
          },
          gps_tracking: settings.gpsTracking,
          anonymous_sharing: settings.dataSharing,
          critical_alerts: settings.emergencyAlerts,
          weekly_report: settings.weeklyReport,
          auto_sync_twin: settings.autoSync
        },
        context: {
          current_region: "Ho Chi Minh",
          last_update: new Date().toISOString()
        }
      };

      // Call the settings agent
      const { data, error } = await supabase.functions.invoke('settings-agent', {
        body: payload
      });

      if (error) throw error;

      // Apply language change
      if (settings.language !== i18n.language) {
        await i18n.changeLanguage(settings.language);
      }

      setActionReport(data.action_report);
      toast.success(data.user_message);

    } catch (err) {
      console.error('Settings save error:', err);
      toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setActionReport(null); // Clear previous report when settings change
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.settings', 'Cài đặt')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('settings.subtitle', 'Tùy chỉnh trải nghiệm Digital Twin của bạn')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : actionReport ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Đang xử lý...' : actionReport ? 'Đã lưu' : t('settings.save', 'Lưu cài đặt')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Cards - 2 columns */}
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          {/* Language & Display */}
          <Card>
            <CardHeader className="pb-3">
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
                  onValueChange={(v: "vi" | "en") => updateSetting('language', v)}
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
            <CardHeader className="pb-3">
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
                  <Label>{t('settings.soundAlerts', 'Âm thanh')}</Label>
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-success" />
                {t('settings.privacy', 'Quyền riêng tư')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label>{t('settings.gpsTracking', 'Định vị GPS')}</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cần thiết cho cảnh báo theo vị trí
                  </p>
                </div>
                <Switch 
                  checked={settings.gpsTracking} 
                  onCheckedChange={(v) => updateSetting('gpsTracking', v)} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <Label>Chia sẻ ẩn danh</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Giúp cải thiện dự báo dịch bệnh
                  </p>
                </div>
                <Switch 
                  checked={settings.dataSharing} 
                  onCheckedChange={(v) => updateSetting('dataSharing', v)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Health Alerts & Twin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-info" />
                Digital Twin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="destructive" className="text-[10px]">CRITICAL</Badge>
                  <Label>Cảnh báo khẩn cấp</Label>
                </div>
                <Switch 
                  checked={settings.emergencyAlerts} 
                  onCheckedChange={(v) => updateSetting('emergencyAlerts', v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label>Báo cáo tuần</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Mỗi Chủ nhật</p>
                </div>
                <Switch 
                  checked={settings.weeklyReport} 
                  onCheckedChange={(v) => updateSetting('weeklyReport', v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <Label>Đồng bộ realtime</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Cập nhật Digital Twin liên tục</p>
                </div>
                <Switch 
                  checked={settings.autoSync} 
                  onCheckedChange={(v) => updateSetting('autoSync', v)} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Report Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Agent Report
              </CardTitle>
              <CardDescription className="text-xs">
                Kết quả xử lý từ Settings Agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionReport ? (
                <ScrollArea className="h-[400px] pr-3">
                  <div className="space-y-3 text-xs">
                    {/* Policies Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">GPS Policy</span>
                        <Badge variant={actionReport.gps_policy === "precise" ? "default" : "secondary"}>
                          {actionReport.gps_policy}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sharing Policy</span>
                        <Badge variant={actionReport.sharing_policy === "anonymous" ? "outline" : "secondary"}>
                          {actionReport.sharing_policy}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Critical Alerts</span>
                        <Badge variant={actionReport.critical_alert_policy === "enabled" ? "destructive" : "secondary"}>
                          {actionReport.critical_alert_policy}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Twin Sync</span>
                        <Badge variant={actionReport.twin_sync_mode === "realtime" ? "default" : "secondary"}>
                          {actionReport.twin_sync_mode}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Weekly Report</span>
                        <Badge variant={actionReport.weekly_report_scheduled ? "default" : "secondary"}>
                          {actionReport.weekly_report_scheduled ? "scheduled" : "off"}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Policy */}
                    <div>
                      <p className="font-medium mb-1">Notification Policy</p>
                      <div className="bg-muted/50 rounded p-2 space-y-1">
                        <p>Push: {actionReport.notification_policy.push_enabled ? "✅" : "❌"}</p>
                        <p>Sound: {actionReport.notification_policy.sound ? "✅" : "❌"}</p>
                        <p>Vibrate: {actionReport.notification_policy.vibrate ? "✅" : "❌"}</p>
                        <p>Severities: {actionReport.notification_policy.allowed_severities.join(", ") || "None"}</p>
                      </div>
                    </div>

                    {/* Display Names if changed */}
                    {actionReport.display_name_changes && (
                      <>
                        <Separator />
                        <div>
                          <p className="font-medium mb-1">Disease Display Names</p>
                          <div className="bg-muted/50 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                            {actionReport.display_name_changes.slice(0, 5).map((d, i) => (
                              <p key={i} className="truncate">
                                <span className="text-muted-foreground">{d.code}:</span> {d.current_display}
                              </p>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Timestamp */}
                    <p className="text-muted-foreground">
                      Updated: {new Date(actionReport.timestamp).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
                  <Zap className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm text-center">
                    Nhấn "Lưu cài đặt" để xem báo cáo từ AI Agent
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
