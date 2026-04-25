import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSettings {
  language: "vi" | "en";
  dark_mode: boolean;
  notifications: {
    push: boolean;
    sound: boolean;
    vibrate: boolean;
  };
  gps_tracking: boolean;
  anonymous_sharing: boolean;
  critical_alerts: boolean;
  weekly_report: boolean;
  auto_sync_twin: boolean;
}

interface SettingsInput {
  user_id: string;
  settings: UserSettings;
  context: {
    current_region: string;
    last_update: string;
  };
}

// Disease display name mappings
const diseaseDisplayNames = [
  { code: "ICD10-A90", vi: "Sốt xuất huyết Dengue", en: "Dengue Fever" },
  { code: "ICD10-U07.1", vi: "COVID-19", en: "COVID-19" },
  { code: "ICD10-A01", vi: "Thương hàn", en: "Typhoid Fever" },
  { code: "ICD10-A09", vi: "Tiêu chảy", en: "Diarrhea" },
  { code: "ICD10-J09", vi: "Cúm mùa", en: "Influenza" },
  { code: "ICD10-A37", vi: "Ho gà", en: "Whooping Cough" },
  { code: "ICD10-B05", vi: "Sởi", en: "Measles" },
  { code: "ICD10-I63", vi: "Đột quỵ não", en: "Stroke" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: SettingsInput = await req.json();
    const { user_id, settings, context } = input;

    const timestamp = new Date().toISOString();
    
    // Build action report
    const actionReport: Record<string, any> = {
      user_id,
      applied_settings: settings,
      timestamp,
    };

    // 1) LANGUAGE - include display name changes if language specified
    if (settings.language) {
      actionReport.display_name_changes = diseaseDisplayNames.map(d => ({
        code: d.code,
        vi: d.vi,
        en: d.en,
        current_display: settings.language === "vi" ? d.vi : d.en
      }));
    }

    // 2) DARK MODE - UI change only
    actionReport.ui_updates = {
      dark_mode_set: settings.dark_mode
    };

    // 3) NOTIFICATIONS POLICY
    const allowedSeverities: string[] = [];
    if (settings.notifications.push) {
      allowedSeverities.push("HIGH");
      if (settings.critical_alerts) {
        allowedSeverities.push("CRITICAL");
      }
    }
    
    actionReport.notification_policy = {
      push_enabled: settings.notifications.push,
      allowed_severities: allowedSeverities,
      sound: settings.notifications.sound,
      vibrate: settings.notifications.vibrate,
      in_app_alerts: true // Always keep in-app alerts visible
    };

    // 4) GPS POLICY
    actionReport.gps_policy = settings.gps_tracking ? "precise" : "coarse";

    // 5) SHARING POLICY
    actionReport.sharing_policy = settings.anonymous_sharing ? "anonymous" : "disabled";

    // 6) CRITICAL ALERTS POLICY
    actionReport.critical_alert_policy = settings.critical_alerts ? "enabled" : "disabled";
    
    // Check for open warnings if critical alerts turned off
    if (!settings.critical_alerts) {
      // In production, would check database for open warnings
      // For now, simulate that there might be held warnings
      actionReport.open_warnings_held_for_admin = false;
    }

    // 7) WEEKLY REPORT
    actionReport.weekly_report_scheduled = settings.weekly_report;

    // 8) TWIN SYNC MODE
    actionReport.twin_sync_mode = settings.auto_sync_twin ? "realtime" : "on_demand";

    // Generate user-facing message
    const messages: string[] = [];
    
    // Language
    const langName = settings.language === "vi" ? "Tiếng Việt" : "English";
    messages.push(`Ngôn ngữ: ${langName}`);
    
    // Notifications
    messages.push(`Thông báo đẩy: ${settings.notifications.push ? "Bật" : "Tắt"}`);
    
    // GPS
    if (settings.gps_tracking) {
      messages.push("Vị trí: Chính xác");
    } else {
      messages.push("Vị trí: Tắt định vị chính xác — cảnh báo sẽ ít cá nhân hóa hơn");
    }
    
    // Twin sync
    if (settings.auto_sync_twin) {
      messages.push("Digital Twin: Đồng bộ realtime");
    }

    const userMessage = `✅ Đã lưu cài đặt. ${messages.join(". ")}. Cập nhật có hiệu lực ngay.`;

    return new Response(
      JSON.stringify({
        action_report: actionReport,
        user_message: userMessage
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Settings agent error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        user_message: "❌ Không thể lưu cài đặt. Vui lòng thử lại."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
