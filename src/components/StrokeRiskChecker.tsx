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
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Fetch latest predictions on mount
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'outline';
      case 'HIGH': return 'destructive';
      case 'CRITICAL': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Dự Báo Nguy Cơ Đột Quỵ
          </CardTitle>
          <CardDescription>
            Hệ thống phân tích dữ liệu ô nhiễm và thời tiết để dự báo nguy cơ đột quỵ theo khu vực
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Số điện thoại
              </Label>
              <Input
                id="phone"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
            </div>

            {/* GPS Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Vị trí GPS
              </Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={getLocation}
                  disabled={gettingLocation}
                  className="flex-1"
                >
                  {gettingLocation ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {location ? 'Cập nhật vị trí' : 'Lấy vị trí GPS'}
                </Button>
                {location && (
                  <Badge variant="secondary" className="flex items-center">
                    {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Subscribe Option */}
          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="subscribe" 
              checked={subscribe} 
              onCheckedChange={setSubscribe}
            />
            <Label htmlFor="subscribe" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Đăng ký nhận cảnh báo qua SMS
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={checkRisk} 
              disabled={loading || !location}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              Kiểm tra nguy cơ
            </Button>
            <Button 
              variant="outline"
              onClick={generatePredictions}
              disabled={loading}
            >
              <Activity className="h-4 w-4 mr-2" />
              Cập nhật dữ liệu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Result */}
      {riskData && riskData.has_risk_data && (
        <Card className={`border-2 ${riskData.risk_level === 'CRITICAL' || riskData.risk_level === 'HIGH' ? 'border-destructive' : 'border-primary/20'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {riskData.risk_level === 'LOW' || riskData.risk_level === 'MEDIUM' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                )}
                Kết quả đánh giá nguy cơ
              </CardTitle>
              <Badge variant={getRiskBadgeVariant(riskData.risk_level)} className="text-lg px-4 py-1">
                {riskData.risk_level_vi}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Score */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Điểm nguy cơ</span>
                <span className="font-bold">{riskData.risk_score}/100</span>
              </div>
              <Progress value={riskData.risk_score} className={getRiskColor(riskData.risk_level)} />
            </div>

            {/* Location Info */}
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertTitle>Khu vực: {riskData.nearest_district}</AlertTitle>
              <AlertDescription>
                Cách vị trí của bạn {riskData.distance_km} km
              </AlertDescription>
            </Alert>

            {/* Environmental Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Wind className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{riskData.environmental_data.aqi}</div>
                <div className="text-xs text-muted-foreground">AQI</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Thermometer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{riskData.environmental_data.temperature}°C</div>
                <div className="text-xs text-muted-foreground">Nhiệt độ</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Droplets className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{riskData.environmental_data.humidity}%</div>
                <div className="text-xs text-muted-foreground">Độ ẩm</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-2xl font-bold">{riskData.environmental_data.pm25}</div>
                <div className="text-xs text-muted-foreground">PM2.5</div>
              </div>
            </div>

            {/* AI Analysis */}
            <Alert variant={riskData.risk_level === 'CRITICAL' || riskData.risk_level === 'HIGH' ? 'destructive' : 'default'}>
              <Brain className="h-4 w-4" />
              <AlertTitle>Phân tích AI</AlertTitle>
              <AlertDescription>{riskData.ai_analysis}</AlertDescription>
            </Alert>

            {/* Risk Factors */}
            {riskData.risk_factors && riskData.risk_factors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Yếu tố nguy cơ
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {riskData.risk_factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {riskData.recommendations && riskData.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Khuyến nghị
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {riskData.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground text-right">
              Dữ liệu cập nhật: {new Date(riskData.predicted_at).toLocaleString('vi-VN')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dự báo theo khu vực
          </CardTitle>
          <CardDescription>
            Tổng quan nguy cơ đột quỵ các quận tại TP.HCM
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPredictions ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chưa có dữ liệu dự báo</p>
              <Button variant="outline" className="mt-2" onClick={generatePredictions} disabled={loading}>
                Tạo dự báo mới
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  className={`p-3 rounded-lg border ${
                    pred.risk_level === 'CRITICAL' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                    pred.risk_level === 'HIGH' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                    pred.risk_level === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                    'border-green-500 bg-green-50 dark:bg-green-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm capitalize">
                      {pred.district_id?.replace(/-/g, ' ')}
                    </span>
                    <Badge variant={getRiskBadgeVariant(pred.risk_level)} className="text-xs">
                      {pred.risk_score}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>AQI: {pred.aqi}</span>
                    <span>{pred.temperature}°C</span>
                    <span>PM2.5: {pred.pm25}</span>
                    <span>{pred.humidity}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StrokeRiskChecker;
