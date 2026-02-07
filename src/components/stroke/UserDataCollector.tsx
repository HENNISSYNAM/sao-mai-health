import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Gauge, Cloud, CheckCircle2, AlertCircle, Loader2, RefreshCw, Save } from "lucide-react";
import { useBarometer } from "@/hooks/useBarometer";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnvironmentData {
  weather?: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    uvIndex: number;
  } | null;
  airQuality?: {
    aqi: number;
    mainPollutant: string;
    pm25: number;
  } | null;
}

interface CollectedData {
  phone: string;
  gps: { lat: number; lon: number } | null;
  barometer: number | null;
  environment: EnvironmentData | null;
}

interface UserDataCollectorProps {
  onDataCollected?: (data: CollectedData) => void;
}

export function UserDataCollector({ onDataCollected }: UserDataCollectorProps) {
  const [phone, setPhone] = useState("");
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentData | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { currentPressure, isSupported: barometerSupported, error: barometerError } = useBarometer();
  const { profile, updateProfile, isAuthenticated } = useUserProfile();

  // Load saved data from profile on mount
  useEffect(() => {
    if (profile) {
      if (profile.phone && !phone) {
        setPhone(profile.phone);
      }
      if (profile.last_gps_coords && !gps) {
        const coords = profile.last_gps_coords as { lat: number; lon: number };
        if (coords.lat && coords.lon) {
          setGps(coords);
        }
      }
    }
  }, [profile]);

  // Auto-fetch GPS on mount only if no saved GPS
  useEffect(() => {
    if (!profile?.last_gps_coords) {
      fetchGPS();
    }
  }, [profile]);

  // Auto-fetch environment data when GPS is available
  useEffect(() => {
    if (gps) {
      fetchEnvironmentData();
    }
  }, [gps]);

  // Notify parent when data changes
  useEffect(() => {
    if (onDataCollected) {
      onDataCollected({
        phone,
        gps,
        barometer: currentPressure,
        environment
      });
    }
  }, [phone, gps, currentPressure, environment, onDataCollected]);

  // Track unsaved changes
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (isAuthenticated && value !== profile?.phone) {
      setHasUnsavedChanges(true);
    }
  };

  // Save profile data
  const saveToProfile = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để lưu thông tin");
      return;
    }

    const updates: Record<string, any> = {};
    if (phone) updates.phone = phone;
    if (gps) updates.last_gps_coords = gps;
    if (profile?.gps_consent === undefined) updates.gps_consent = true;

    const { error } = await updateProfile(updates);
    if (!error) {
      setHasUnsavedChanges(false);
      toast.success("Đã lưu thông tin cá nhân");
    }
  }, [isAuthenticated, phone, gps, profile, updateProfile]);

  const fetchGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ GPS");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setGpsLoading(false);
        toast.success("Đã lấy vị trí GPS thành công");
      },
      (error) => {
        let errorMessage = "Không thể lấy vị trí";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Bạn đã từ chối quyền truy cập vị trí";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Không thể xác định vị trí";
            break;
          case error.TIMEOUT:
            errorMessage = "Hết thời gian chờ lấy vị trí";
            break;
        }
        setGpsError(errorMessage);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchEnvironmentData = async () => {
    if (!gps) return;
    
    setEnvLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-environment-data', {
        body: { lat: gps.lat, lon: gps.lon }
      });
      
      if (error) throw error;
      
      setEnvironment({
        weather: data.weather,
        airQuality: data.airQuality
      });
      toast.success("Đã cập nhật dữ liệu môi trường");
    } catch (error) {
      console.error('Error fetching environment data:', error);
      toast.error("Không thể lấy dữ liệu môi trường");
    } finally {
      setEnvLoading(false);
    }
  };

  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return { label: "Tốt", color: "bg-success text-success-foreground" };
    if (aqi <= 100) return { label: "Trung bình", color: "bg-warning text-warning-foreground" };
    if (aqi <= 150) return { label: "Không tốt cho nhóm nhạy cảm", color: "bg-orange-500 text-white" };
    if (aqi <= 200) return { label: "Không tốt", color: "bg-danger text-danger-foreground" };
    return { label: "Nguy hiểm", color: "bg-purple-600 text-white" };
  };

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Gauge className="h-5 w-5" />
          Thu thập dữ liệu theo dõi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" />
            Số điện thoại
          </Label>
          <Input
            type="tel"
            placeholder="Nhập số điện thoại của bạn"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="bg-background border-border"
          />
          {phone && (
            <Badge variant="outline" className="text-success border-success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {profile?.phone === phone ? "Đã lưu" : "Đã nhập"}
            </Badge>
          )}
        </div>

        {/* GPS Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Vị trí GPS
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGPS}
              disabled={gpsLoading}
              className="flex-shrink-0"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {gps ? "Cập nhật" : "Lấy vị trí"}
            </Button>
            {gps && (
              <Badge variant="outline" className="text-success border-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}
              </Badge>
            )}
            {gpsError && (
              <Badge variant="outline" className="text-danger border-danger">
                <AlertCircle className="h-3 w-3 mr-1" />
                {gpsError}
              </Badge>
            )}
          </div>
        </div>

        {/* Barometer */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4 text-primary" />
            Áp suất khí quyển (Barometer)
          </Label>
          <div className="flex items-center gap-2">
            {barometerSupported && currentPressure ? (
              <Badge variant="outline" className="text-success border-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {currentPressure.toFixed(1)} hPa
              </Badge>
            ) : barometerError ? (
              <Badge variant="outline" className="text-warning border-warning">
                <AlertCircle className="h-3 w-3 mr-1" />
                Sử dụng dữ liệu từ API thời tiết
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-muted">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Đang đo...
              </Badge>
            )}
          </div>
        </div>

        {/* Environment Data */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Cloud className="h-4 w-4 text-primary" />
            Dữ liệu môi trường
          </Label>
          
          {envLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Đang tải dữ liệu...</span>
            </div>
          ) : environment ? (
            <div className="grid grid-cols-2 gap-2">
              {environment.weather && (
                <>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Nhiệt độ</div>
                    <div className="font-semibold text-foreground">{environment.weather.temperature}°C</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Độ ẩm</div>
                    <div className="font-semibold text-foreground">{environment.weather.humidity}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Áp suất</div>
                    <div className="font-semibold text-foreground">{environment.weather.pressure?.toFixed(0)} hPa</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">UV Index</div>
                    <div className="font-semibold text-foreground">{environment.weather.uvIndex}</div>
                  </div>
                </>
              )}
              {environment.airQuality && (
                <div className="col-span-2 p-2 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Chất lượng không khí (AQI)</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-lg">{environment.airQuality.aqi}</span>
                    <Badge className={getAQILevel(environment.airQuality.aqi).color}>
                      {getAQILevel(environment.airQuality.aqi).label}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          ) : gps ? (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEnvironmentData}
              className="w-full"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Tải dữ liệu môi trường
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cần lấy vị trí GPS trước
            </p>
          )}
        </div>

        {/* Save Button - Only show when authenticated and has changes */}
        {isAuthenticated && hasUnsavedChanges && (
          <Button
            onClick={saveToProfile}
            className="w-full bg-success hover:bg-success/90"
          >
            <Save className="h-4 w-4 mr-2" />
            Lưu thông tin cá nhân
          </Button>
        )}

        {/* Refresh All Button */}
        <Button
          onClick={() => {
            fetchGPS();
          }}
          variant={hasUnsavedChanges ? "outline" : "default"}
          className={hasUnsavedChanges ? "w-full" : "w-full bg-primary hover:bg-primary/90"}
          disabled={gpsLoading || envLoading}
        >
          {(gpsLoading || envLoading) ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Cập nhật tất cả dữ liệu
        </Button>

        {/* Login hint for non-authenticated users */}
        {!isAuthenticated && phone && (
          <p className="text-xs text-muted-foreground text-center">
            💡 Đăng nhập để lưu thông tin và không phải nhập lại
          </p>
        )}
      </CardContent>
    </Card>
  );
}
