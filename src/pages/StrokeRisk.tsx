import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useStrokeRiskEngine } from '@/hooks/useStrokeRiskEngine';
import FullScreenMap from '@/components/stroke/FullScreenMap';
import GrokChatPanel from '@/components/stroke/GrokChatPanel';
import RiskOverlay from '@/components/stroke/RiskOverlay';
import ChatToggleButton from '@/components/stroke/ChatToggleButton';
import { Loader2, Radio, MapPin } from 'lucide-react';

const StrokeRisk: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(true); // Start with chat open
  const [showRiskOverlay, setShowRiskOverlay] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    userData,
    environment,
    riskAssessment,
    barometer,
    isLoading,
    gpsLoading,
    envLoading,
    startMonitoring,
    setAgeGroup,
    refreshData
  } = useStrokeRiskEngine();

  // Initialize monitoring on mount
  useEffect(() => {
    const init = async () => {
      await startMonitoring();
      setIsInitialized(true);
    };
    init();
  }, [startMonitoring]);

  // Show risk overlay when chat closes and risk is medium+
  useEffect(() => {
    if (!isChatOpen && isInitialized) {
      setShowRiskOverlay(true);
    }
  }, [isChatOpen, isInitialized]);

  // Handle chat close - transition to monitoring mode
  const handleChatClose = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // Handle chat open
  const handleChatOpen = useCallback(() => {
    setIsChatOpen(true);
    setShowRiskOverlay(false);
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Full Screen Map Background */}
      <FullScreenMap
        gps={userData.gps}
        environment={environment}
        riskAssessment={riskAssessment}
        isBlurred={isChatOpen}
      />

      {/* Loading Overlay */}
      {(isLoading || (gpsLoading && !userData.gps)) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-40">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Đang khởi tạo...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {gpsLoading ? 'Đang lấy vị trí GPS...' : 'Đang tải dữ liệu môi trường...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Status Badge */}
      {isInitialized && !isChatOpen && (
        <div className="absolute top-4 right-4 z-20 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-md rounded-full border border-border/50 shadow-lg">
            <Radio className="h-4 w-4 text-success animate-pulse" />
            <span className="text-sm font-medium text-foreground">Đang theo dõi</span>
            {envLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
            )}
          </div>
        </div>
      )}

      {/* Grok-style Chat Panel */}
      <GrokChatPanel
        isOpen={isChatOpen}
        onClose={handleChatClose}
        ageGroup={userData.ageGroup}
        environment={environment}
        riskAssessment={riskAssessment}
        onAgeGroupChange={setAgeGroup}
        gps={userData.gps}
      />

      {/* Risk Overlay (shown when chat is closed) */}
      <RiskOverlay
        riskAssessment={riskAssessment}
        environment={environment}
        pressureChange1h={barometer.pressureChange1h}
        isVisible={showRiskOverlay && !isChatOpen}
      />

      {/* Chat Toggle Button (shown when chat is closed) */}
      {!isChatOpen && isInitialized && (
        <ChatToggleButton onClick={handleChatOpen} />
      )}
    </div>
  );
};

export default StrokeRisk;
