/**
 * GestureCameraController Component
 * 
 * Camera overlay với hand gesture recognition để điều khiển bản đồ.
 * Hiển thị camera preview nhỏ ở góc màn hình và trạng thái gesture.
 * 
 * Features:
 * - Camera preview (corner overlay)
 * - Hand landmark visualization
 * - Gesture status display
 * - Action feedback
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useHandGestureController, MapAction, GestureStatus } from '@/hooks/useHandGestureController';
import { getGestureInfo, getActionDetails } from '@/lib/gestureToMapAction';
import { Button } from '@/components/ui/button';
import { 
  Hand, 
  Video, 
  VideoOff, 
  Loader2, 
  AlertCircle, 
  ZoomIn, 
  ZoomOut,
  MoveHorizontal,
  Pause,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GestureCameraControllerProps {
  onMapAction?: (action: MapAction, data?: { deltaX?: number; deltaY?: number }) => void;
  className?: string;
}

const GestureCameraController: React.FC<GestureCameraControllerProps> = ({
  onMapAction,
  className
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const [lastAction, setLastAction] = useState<MapAction>('idle');

  // Handle gesture actions
  const handleAction = useCallback((action: MapAction, data?: { deltaX?: number; deltaY?: number }) => {
    setLastAction(action);
    onMapAction?.(action, data);
    
    // Reset action display after delay
    setTimeout(() => setLastAction('idle'), 500);
  }, [onMapAction]);

  const {
    status,
    gestureState,
    error,
    isEnabled,
    videoRef,
    canvasRef,
    start,
    stop,
    toggle,
  } = useHandGestureController({
    onAction: handleAction,
    minConfidence: 0.7,
    debounceMs: 150,
  });

  // Show toast on start/stop
  useEffect(() => {
    if (status === 'detecting') {
      toast.success('Điều khiển bằng cử chỉ đã bật', {
        description: '✌️ Zoom • ✋ Di chuyển • ✊ Tạm dừng',
        duration: 3000,
      });
    }
  }, [status]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error('Không thể khởi động camera', {
        description: error,
      });
    }
  }, [error]);

  const gestureInfo = getGestureInfo(gestureState.gesture);
  const actionDetails = getActionDetails(lastAction);

  // Status indicator color
  const getStatusColor = (s: GestureStatus) => {
    switch (s) {
      case 'active': return 'bg-green-500';
      case 'detecting': return 'bg-yellow-500';
      case 'paused': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      case 'initializing': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (s: GestureStatus) => {
    switch (s) {
      case 'active': return 'Đang hoạt động';
      case 'detecting': return 'Đang tìm tay...';
      case 'paused': return 'Tạm dừng';
      case 'error': return 'Lỗi';
      case 'initializing': return 'Đang khởi tạo...';
      default: return 'Tắt';
    }
  };

  return (
    <div className={cn("fixed z-50", className)}>
      {/* Toggle Button - Always visible */}
      <div className="fixed bottom-36 right-4 z-50">
        <Button
          onClick={toggle}
          variant={isEnabled ? "default" : "outline"}
          size="lg"
          className={cn(
            "rounded-full shadow-xl backdrop-blur-sm transition-all",
            isEnabled 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "bg-card/90 hover:bg-card text-foreground border-border/50"
          )}
        >
          {status === 'initializing' ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : isEnabled ? (
            <Video className="h-5 w-5 mr-2" />
          ) : (
            <Hand className="h-5 w-5 mr-2" />
          )}
          {isEnabled ? 'Tắt cử chỉ' : 'Cử chỉ'}
        </Button>
      </div>

      {/* Camera Preview - Corner overlay when enabled */}
      {isEnabled && (
        <div className={cn(
          "fixed bottom-52 right-4 z-40 animate-fade-in",
          !showPreview && "opacity-0 pointer-events-none"
        )}>
          <div className="relative">
            {/* Video/Canvas container */}
            <div className="relative w-48 h-36 md:w-56 md:h-42 rounded-xl overflow-hidden shadow-2xl border-2 border-border/50 bg-black">
              {/* Hidden video element for camera input */}
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-0"
                playsInline
                muted
              />
              
              {/* Canvas for drawing hand landmarks */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
              />

              {/* Loading overlay */}
              {status === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin mx-auto" />
                    <p className="text-xs text-white/70 mt-2">Đang khởi động...</p>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <div className="text-center p-2">
                    <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Hand not detected overlay */}
              {status === 'detecting' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-2 bg-black/50 rounded-lg backdrop-blur-sm">
                    <Hand className="h-8 w-8 text-yellow-400 mx-auto animate-pulse" />
                    <p className="text-[10px] text-white/80 mt-1">Đưa tay vào camera</p>
                  </div>
                </div>
              )}

              {/* Close preview button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>

            {/* Status bar below preview */}
            <div className="mt-2 px-2 py-1.5 bg-card/95 backdrop-blur-xl rounded-lg border border-border/30 shadow-lg">
              <div className="flex items-center justify-between">
                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(status))} />
                  <span className="text-[10px] text-muted-foreground">{getStatusLabel(status)}</span>
                </div>

                {/* Current gesture */}
                {gestureState.gesture !== 'none' && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{gestureInfo.icon}</span>
                    <span className="text-[10px] text-foreground font-medium">
                      {gestureInfo.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Action feedback */}
              {lastAction !== 'idle' && lastAction !== 'pause' && (
                <div className={cn(
                  "mt-1 flex items-center justify-center gap-1 py-0.5 rounded",
                  "bg-blue-500/20 animate-pulse"
                )}>
                  <span className="text-xs">{actionDetails.icon}</span>
                  <span className={cn("text-[10px] font-medium", actionDetails.color)}>
                    {actionDetails.label}
                  </span>
                </div>
              )}

              {/* Hands detected count */}
              {gestureState.handCount > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">
                    {gestureState.handCount} tay • {(gestureState.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show preview button when hidden */}
      {isEnabled && !showPreview && (
        <button
          onClick={() => setShowPreview(true)}
          className="fixed bottom-52 right-4 z-40 p-2 rounded-full bg-card/90 backdrop-blur-sm shadow-lg border border-border/50 hover:bg-card transition-colors"
        >
          <Video className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Gesture guide - Bottom sheet style on first use */}
      {isEnabled && status === 'detecting' && (
        <div className="fixed bottom-72 right-4 z-30 w-48 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl p-3 shadow-xl border border-border/30">
            <h4 className="text-xs font-semibold text-foreground mb-2">Hướng dẫn cử chỉ</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-5 text-center">✌️</span>
                <span>Zoom bản đồ</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-5 text-center">✋</span>
                <span>Di chuyển bản đồ</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-5 text-center">✊</span>
                <span>Tạm dừng</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestureCameraController;
