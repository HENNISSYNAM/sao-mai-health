import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import { useStrokeRiskEngine } from '@/hooks/useStrokeRiskEngine';
import FullScreenMap from '@/components/stroke/FullScreenMap';
import RiskOverlay from '@/components/stroke/RiskOverlay';
import MLAnalyticsDashboard from '@/components/stroke/MLAnalyticsDashboard';

import { BarChart3, Navigation, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import healthLogo from '@/assets/health-logo.png';
import type { MapAction } from '@/hooks/useHandGestureController';

type ViewMode = 'tracking' | 'statistics';

const StrokeRisk: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('tracking');
  const [showRiskOverlay, setShowRiskOverlay] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [mapCommand, setMapCommand] = useState<{ action: MapAction; timestamp: number } | null>(null);
  const initRef = useRef(false);
  
  const {
    userData,
    environment,
    riskAssessment,
    barometer,
    isLoading,
    gpsLoading,
    isTracking,
    startMonitoring,
    setAgeGroup
  } = useStrokeRiskEngine();

  // Handle gesture-based map actions
  const handleMapAction = useCallback((action: MapAction, data?: { deltaX?: number; deltaY?: number }) => {
    // Dispatch custom event for map control
    setMapCommand({ action, timestamp: Date.now() });
  }, []);

  // Stable view mode toggle to prevent re-renders
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Initialize monitoring on mount - only run once
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const init = async () => {
      await startMonitoring();
      setIsInitialized(true);
    };
    init();
  }, [startMonitoring]);

  // Listen for outdoor time warning events
  useEffect(() => {
    const handleOutdoorWarning = (event: CustomEvent<{
      minutes: number;
      safeMinutes: number;
      warning: string;
    }>) => {
      const {
        minutes,
        safeMinutes,
        warning
      } = event.detail;
      toast.warning('⚠️ Cảnh báo thời gian ngoài trời', {
        description: `${warning}. Bạn đã ở ngoài trời ${minutes} phút (giới hạn an toàn: ${safeMinutes} phút)`,
        duration: 10000
      });
    };
    window.addEventListener('outdoor-time-warning', handleOutdoorWarning as EventListener);
    return () => {
      window.removeEventListener('outdoor-time-warning', handleOutdoorWarning as EventListener);
    };
  }, []);

  // Show risk overlay when initialized
  useEffect(() => {
    if (isInitialized && viewMode === 'tracking') {
      setShowRiskOverlay(true);
    } else {
      setShowRiskOverlay(false);
    }
  }, [isInitialized, viewMode]);

  // Statistics view - pass tracking data for tight integration
  if (viewMode === 'statistics') {
    return <div className="relative">
        {/* Navigation Buttons */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
            className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background shadow-lg"
          >
            <Home className="h-4 w-4 mr-2" />
            Trang chủ
          </Button>
          <Button onClick={() => setViewMode('tracking')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <Navigation className="h-4 w-4 mr-2" />
            Theo dõi
          </Button>
        </div>
        <MLAnalyticsDashboard gps={userData.gps} environment={environment} riskAssessment={riskAssessment} ageGroup={userData.ageGroup} isTracking={isTracking} outdoorMinutes={userData.outdoorMinutes} locationConfidence={userData.locationConfidence} pressureChange1h={barometer.pressureChange1h} pressureChange24h={barometer.pressureChange24h} />
      </div>;
  }

  // Tracking view
  return <div className="fixed inset-0 overflow-hidden" style={{
    background: 'linear-gradient(135deg, hsl(210 40% 8%) 0%, hsl(210 50% 12%) 50%, hsl(199 40% 15%) 100%)'
  }}>
      {/* Home Button - Fixed top right to avoid overlapping left panel */}
      <div className="fixed top-3 right-4 z-50">
        <Button 
          onClick={() => navigate('/')} 
          variant="outline"
          size="icon"
          className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background shadow-lg rounded-full w-9 h-9"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>
      {/* Full Screen Map Background */}
      <FullScreenMap 
        gps={userData.gps} 
        gpsHistory={userData.gpsHistory} 
        gpsAccuracy={userData.gpsAccuracy} 
        environment={environment} 
        riskAssessment={riskAssessment} 
        isBlurred={false} 
        isTracking={isTracking} 
        devicePressure={userData.devicePressure} 
        outdoorMinutes={userData.outdoorMinutes} 
        isOutdoor={userData.isOutdoor} 
        locationConfidence={userData.locationConfidence} 
        safeOutdoorMinutes={userData.safeOutdoorMinutes} 
        mapCommand={mapCommand}
        onViewStatistics={() => setViewMode('statistics')}
        showStatisticsButton={isInitialized && !isLoading && !gpsLoading}
      />


      {/* Loading Overlay */}
      {(isLoading || gpsLoading && !userData.gps) && <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-40">
          <div className="text-center space-y-4">
            <div className="relative">
              <img src={healthLogo} alt="Loading" className="w-24 h-24 mx-auto animate-heartbeat drop-shadow-lg" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Đang khởi tạo...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {gpsLoading ? 'Đang lấy vị trí GPS...' : 'Đang tải dữ liệu môi trường...'}
              </p>
            </div>
          </div>
        </div>}

      {/* Risk Overlay - Stats panel at bottom right */}
      <RiskOverlay riskAssessment={riskAssessment} environment={environment} pressureChange1h={barometer.pressureChange1h} pressureChange24h={barometer.pressureChange24h} isVisible={showRiskOverlay} ageGroup={userData.ageGroup} gps={userData.gps} devicePressure={userData.devicePressure} gpsAccuracy={userData.gpsAccuracy} />
    </div>;
};
export default StrokeRisk;