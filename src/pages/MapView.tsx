import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, ZoomIn, ZoomOut } from "lucide-react";
import { useRealtimeHealth } from "@/hooks/useRealtimeHealth";

// Dynamic import for map components (client-side only)
const MapContainer = ({ children, center, zoom, className }: any) => {
  return (
    <div className={`${className} bg-muted/30 rounded-lg flex items-center justify-center`}>
      <div className="text-center">
        <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-text-700 font-medium">Interactive Map</p>
        <p className="text-text-500 text-sm">
          Map will be loaded with Leaflet integration
        </p>
        <div className="mt-4 space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};

interface CaseGeo {
  id: string;
  lat: number;
  lng: number;
  disease_code: string;
  cases_count: number;
  rt_estimate?: number;
  ward_name: string;
  facility_name: string;
}

interface Outbreak {
  id: string;
  center_lat: number;
  center_lng: number;
  radius: number;
  cases_count: number;
  disease_code: string;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
}

export default function MapView() {
  const [selectedLayer, setSelectedLayer] = useState<'cases' | 'outbreaks' | 'heatmap'>('cases');
  const [selectedCase, setSelectedCase] = useState<CaseGeo | null>(null);
  
  const { data: casesGeo, isConnected } = useRealtimeHealth<CaseGeo>({
    table: 'cases',
    event: '*'
  });

  // Mock outbreaks data (would come from real API)
  const outbreaks: Outbreak[] = [
    {
      id: '1',
      center_lat: 10.7769,
      center_lng: 106.7009,
      radius: 500,
      cases_count: 15,
      disease_code: 'dengue',
      severity: 'high',
      detected_at: new Date().toISOString()
    }
  ];

  const getDiseaseColor = (disease: string) => {
    const colors = {
      dengue: 'bg-danger',
      covid19: 'bg-warning',
      influenza: 'bg-info',
      tcm: 'bg-primary'
    };
    return colors[disease as keyof typeof colors] || 'bg-muted';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'border-success text-success',
      medium: 'border-warning text-warning',
      high: 'border-danger text-danger'
    };
    return colors[severity as keyof typeof colors] || 'border-muted text-muted';
  };

  const LayerControl = () => (
    <Card className="absolute top-4 left-4 z-10 w-64">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4" />
          Lớp bản đồ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant={selectedLayer === 'cases' ? 'default' : 'outline'}
          size="sm"
          className="w-full justify-start focus-ring"
          onClick={() => setSelectedLayer('cases')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Ca bệnh
        </Button>
        <Button
          variant={selectedLayer === 'outbreaks' ? 'default' : 'outline'}
          size="sm"
          className="w-full justify-start focus-ring"
          onClick={() => setSelectedLayer('outbreaks')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Ổ dịch
        </Button>
        <Button
          variant={selectedLayer === 'heatmap' ? 'default' : 'outline'}
          size="sm"
          className="w-full justify-start focus-ring"
          onClick={() => setSelectedLayer('heatmap')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Bản đồ nhiệt
        </Button>
      </CardContent>
    </Card>
  );

  const MapLegend = () => (
    <Card className="absolute bottom-4 left-4 z-10 w-64">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Chú thích</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-text-700 mb-2">Loại bệnh</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger rounded-full"></div>
                <span className="text-xs text-text-700">Sốt xuất huyết</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-warning rounded-full"></div>
                <span className="text-xs text-text-700">COVID-19</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-info rounded-full"></div>
                <span className="text-xs text-text-700">Cúm</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-xs text-text-700">Tay chân miệng</span>
              </div>
            </div>
          </div>
          
          {selectedLayer === 'outbreaks' && (
            <div>
              <p className="text-sm font-medium text-text-700 mb-2">Mức độ ổ dịch</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-success rounded-full"></div>
                  <span className="text-xs text-text-700">Thấp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-warning rounded-full"></div>
                  <span className="text-xs text-text-700">Trung bình</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-danger rounded-full"></div>
                  <span className="text-xs text-text-700">Cao</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const MapTooltip = ({ case_ }: { case_: CaseGeo }) => (
    <Card className="absolute top-4 right-4 z-10 w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Thông tin ca bệnh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-text-500">Phường:</span>
          <span className="text-text-700">{case_.ward_name}</span>
          
          <span className="text-text-500">Cơ sở:</span>
          <span className="text-text-700">{case_.facility_name}</span>
          
          <span className="text-text-500">Loại bệnh:</span>
          <Badge variant="outline">{case_.disease_code}</Badge>
          
          <span className="text-text-500">Số ca:</span>
          <span className="text-text-700 font-medium">{case_.cases_count}</span>
          
          {case_.rt_estimate && (
            <>
              <span className="text-text-500">Rt ước tính:</span>
              <span className={`font-medium ${case_.rt_estimate > 1 ? 'text-danger' : 'text-success'}`}>
                {case_.rt_estimate.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900">Bản đồ dịch bệnh</h1>
          <p className="text-text-500 mt-1">
            Theo dõi phân bố địa lý và ổ dịch
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-sm text-text-500">
            {isConnected ? 'Realtime' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        <MapContainer
          center={[10.8231, 106.6297]} // Ho Chi Minh City
          zoom={11}
          className="h-[calc(100vh-200px)] w-full rounded-lg border border-border"
        >
          {/* Mock map markers based on selected layer */}
          {selectedLayer === 'cases' && casesGeo.map((case_) => (
            <div key={case_.id} className="text-xs">
              <Badge className={getDiseaseColor(case_.disease_code)}>
                {case_.cases_count} ca
              </Badge>
            </div>
          ))}
          
          {selectedLayer === 'outbreaks' && outbreaks.map((outbreak) => (
            <div key={outbreak.id} className="text-xs">
              <Badge 
                variant="outline" 
                className={`border-2 ${getSeverityColor(outbreak.severity)}`}
              >
                Ổ dịch: {outbreak.cases_count} ca
              </Badge>
            </div>
          ))}
        </MapContainer>

        {/* Map Controls */}
        <LayerControl />
        <MapLegend />
        
        {selectedCase && <MapTooltip case_={selectedCase} />}

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button size="icon" variant="outline" className="focus-ring">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="focus-ring">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Map Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-900">{casesGeo.length}</p>
              <p className="text-sm text-text-500">Điểm ca bệnh</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-900">{outbreaks.length}</p>
              <p className="text-sm text-text-500">Ổ dịch đang hoạt động</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-900">
                {casesGeo.reduce((sum, c) => sum + c.cases_count, 0)}
              </p>
              <p className="text-sm text-text-500">Tổng số ca</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-danger">
                {outbreaks.filter(o => o.severity === 'high').length}
              </p>
              <p className="text-sm text-text-500">Ổ dịch nghiêm trọng</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}