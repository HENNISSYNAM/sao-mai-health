import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Phone, 
  Activity, 
  Thermometer, 
  Droplets, 
  Wind,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Bell,
  Brain,
  Heart,
  Navigation,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RiskData {
  success: boolean;
  has_risk_data: boolean;
  phone: string;
  risk_level: string;
  risk_level_vi: string;
  risk_score: number;
  nearest_district: string;
  distance_km: number;
  environmental_data: {
    aqi: number;
    pm25: number;
    pm10: number;
    temperature: number;
    humidity: number;
    pressure: number;
    weather: string;
  };
  ai_analysis: string;
  risk_factors: string[];
  recommendations: string[];
  alert_message: string;
  predicted_at: string;
  subscribed: boolean;
}

interface StrokeRiskPrediction {
  id: string;
  district_id: string;
  risk_level: string;
  risk_score: number;
  aqi: number;
  pm25: number;
  temperature: number;
  humidity: number;
  ai_analysis: string;
  predicted_at: string;
}

const StrokeRiskChecker: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [subscribe, setSubscribe] = useState(true);
  const [predictions, setPredictions] = useState<StrokeRiskPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    fetchLatestPredictions();
  }, []);

  const fetchLatestPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const { data, error } = await supabase
        .from('stroke_risk_predictions')
        .select('*')
        .gte('valid_until', new Date().toISOString())
        .order('risk_score', { ascending: false })
        .limit(12);

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const getLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        toast.success('Đã lấy vị trí GPS');
        setGettingLocation(false);
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error('Không thể lấy vị trí. Vui lòng cho phép truy cập GPS.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const checkRisk = async () => {
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }

    if (!location) {
      toast.error('Vui lòng lấy vị trí GPS trước');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-stroke-risk', {
        body: {
          phone: phone.trim(),
          lat: location.lat,
          lon: location.lon,
          subscribe
        }
      });

      if (error) throw error;

      if (data.success) {
        setRiskData(data);
        if (data.subscribed) {
          toast.success('Đã đăng ký nhận cảnh báo');
        }
      } else {
        toast.error(data.error || 'Không thể kiểm tra nguy cơ');
      }
    } catch (error) {
      console.error('Check risk error:', error);
      toast.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    setLoading(true);
    toast.info('Đang tạo dự báo mới...');
    try {
      const { data, error } = await supabase.functions.invoke('stroke-risk-agent', {});
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Đã tạo ${data.predictions?.length || 0} dự báo mới`);
        fetchLatestPredictions();
      } else {
        toast.error(data.error || 'Không thể tạo dự báo');
      }
    } catch (error) {
      console.error('Generate predictions error:', error);
      toast.error('Lỗi khi tạo dự báo');
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyles = (level: string) => {
    switch (level) {
      case 'LOW': return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' };
      case 'MEDIUM': return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
      case 'HIGH': return { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger' };
      case 'CRITICAL': return { bg: 'bg-danger', border: 'border-danger', text: 'text-danger-foreground' };
      default: return { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="rounded-2xl border-border/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-info/5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Kiểm tra nguy cơ cá nhân</CardTitle>
              <CardDescription>Nhập thông tin để nhận đánh giá nguy cơ đột quỵ tại vị trí của bạn</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Số điện thoại
              </Label>
              <Input
                id="phone"
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="h-11 rounded-xl"
              />
            </div>

            {/* GPS Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Vị trí GPS
              </Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="flex-1 h-11 rounded-xl gap-2"
                >
                  {gettingLocation ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  {location ? 'Cập nhật vị trí' : 'Lấy vị trí GPS'}
                </Button>
                {location && (
                  <Badge variant="secondary" className="flex items-center h-11 px-3 rounded-xl font-mono text-xs">
                    {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Subscribe Option */}
          <div className="flex items-center gap-3 mt-6 p-4 rounded-xl bg-muted/30">
            <Switch 
              id="subscribe" 
              checked={subscribe} 
              onCheckedChange={setSubscribe}
            />
            <Label htmlFor="subscribe" className="flex items-center gap-2 cursor-pointer">
              <Bell className="h-4 w-4 text-warning" />
              <span className="text-sm">Đăng ký nhận cảnh báo qua SMS khi vào vùng nguy cơ cao</span>
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={checkRisk} 
              disabled={loading || !location}
              className="flex-1 h-12 rounded-xl gap-2 text-base"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              Kiểm tra nguy cơ
            </Button>
            <Button 
              variant="outline"
              onClick={generatePredictions}
              disabled={loading}
              className="h-12 rounded-xl gap-2"
            >
              <Activity className="h-5 w-5" />
              Cập nhật dữ liệu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Result */}
      {riskData && riskData.has_risk_data && (
        <Card className={cn(
          "rounded-2xl overflow-hidden animate-fade-up",
          riskData.risk_level === 'CRITICAL' || riskData.risk_level === 'HIGH' 
            ? 'border-danger/50' 
            : 'border-border/50'
        )}>
          <CardHeader className={cn(
            "border-b",
            getRiskStyles(riskData.risk_level).bg,
            getRiskStyles(riskData.risk_level).border
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {riskData.risk_level === 'LOW' || riskData.risk_level === 'MEDIUM' ? (
                  <div className="p-2.5 rounded-xl bg-success/20">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-danger/20 animate-pulse">
                    <AlertTriangle className="h-6 w-6 text-danger" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">Kết quả đánh giá</CardTitle>
                  <CardDescription>Dựa trên dữ liệu môi trường real-time</CardDescription>
                </div>
              </div>
              <Badge className={cn(
                "text-base px-4 py-1.5 rounded-xl font-semibold",
                getRiskStyles(riskData.risk_level).bg,
                getRiskStyles(riskData.risk_level).text,
                getRiskStyles(riskData.risk_level).border,
                "border"
              )}>
                {riskData.risk_level_vi}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Risk Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Điểm nguy cơ</span>
                <span className="text-2xl font-bold">{riskData.risk_score}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
              <Progress 
                value={riskData.risk_score} 
                className={cn("h-3 rounded-full", getRiskStyles(riskData.risk_level).bg)}
              />
            </div>

            {/* Location Info */}
            <Alert className="rounded-xl border-info/30 bg-info/5">
              <MapPin className="h-4 w-4 text-info" />
              <AlertTitle className="text-info">Khu vực: {riskData.nearest_district}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Cách vị trí của bạn {riskData.distance_km} km
              </AlertDescription>
            </Alert>

            {/* Environmental Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="metric-card">
                <Wind className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{riskData.environmental_data.aqi}</div>
                <div className="text-xs text-muted-foreground">AQI</div>
              </div>
              <div className="metric-card">
                <Thermometer className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{riskData.environmental_data.temperature}°</div>
                <div className="text-xs text-muted-foreground">Nhiệt độ</div>
              </div>
              <div className="metric-card">
                <Droplets className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{riskData.environmental_data.humidity}%</div>
                <div className="text-xs text-muted-foreground">Độ ẩm</div>
              </div>
              <div className="metric-card">
                <Activity className="h-5 w-5 text-muted-foreground mb-2" />
                <div className="text-2xl font-bold">{riskData.environmental_data.pm25}</div>
                <div className="text-xs text-muted-foreground">PM2.5</div>
              </div>
            </div>

            {/* AI Analysis */}
            <Alert className={cn(
              "rounded-xl",
              riskData.risk_level === 'CRITICAL' || riskData.risk_level === 'HIGH' 
                ? 'border-danger/30 bg-danger/5' 
                : 'border-primary/30 bg-primary/5'
            )}>
              <Brain className={cn(
                "h-4 w-4",
                riskData.risk_level === 'CRITICAL' || riskData.risk_level === 'HIGH' 
                  ? 'text-danger' 
                  : 'text-primary'
              )} />
              <AlertTitle>Phân tích AI</AlertTitle>
              <AlertDescription className="text-muted-foreground">{riskData.ai_analysis}</AlertDescription>
            </Alert>

            {/* Risk Factors & Recommendations */}
            <div className="grid md:grid-cols-2 gap-4">
              {riskData.risk_factors && riskData.risk_factors.length > 0 && (
                <div className="p-4 rounded-xl bg-danger/5 border border-danger/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" />
                    Yếu tố nguy cơ
                  </h4>
                  <ul className="space-y-2">
                    {riskData.risk_factors.map((factor, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {riskData.recommendations && riskData.recommendations.length > 0 && (
                <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    Khuyến nghị
                  </h4>
                  <ul className="space-y-2">
                    {riskData.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-right">
              Cập nhật: {new Date(riskData.predicted_at).toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Predictions Overview */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-info/10">
                <Activity className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-lg">Dự báo theo khu vực</CardTitle>
                <CardDescription>Nguy cơ đột quỵ các quận tại TP.HCM</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLatestPredictions} className="rounded-xl gap-2">
              <RefreshCw className={cn("h-4 w-4", loadingPredictions && "animate-spin")} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPredictions ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-2">Chưa có dữ liệu dự báo</p>
              <p className="text-sm mb-4">Nhấn nút dưới để tạo dự báo mới từ dữ liệu môi trường</p>
              <Button onClick={generatePredictions} disabled={loading} className="rounded-xl gap-2">
                <Sparkles className="h-4 w-4" />
                Tạo dự báo mới
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {predictions.map((pred, idx) => {
                const styles = getRiskStyles(pred.risk_level);
                return (
                  <div
                    key={pred.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer animate-fade-up",
                      styles.bg,
                      styles.border
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm capitalize truncate">
                        {pred.district_id?.replace(/-/g, ' ')}
                      </span>
                      <Badge className={cn("text-xs font-bold", styles.bg, styles.text, styles.border, "border")}>
                        {pred.risk_score}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>AQI: {pred.aqi}</span>
                      <span>{pred.temperature}°C</span>
                      <span>PM2.5: {pred.pm25}</span>
                      <span>{pred.humidity}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StrokeRiskChecker;