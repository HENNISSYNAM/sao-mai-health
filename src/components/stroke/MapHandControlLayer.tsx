/**
 * MapHandControlLayer Component
 * 
 * Input layer phụ cho map - điều khiển bằng tay như mouse
 * Có thể mount/unmount mà không ảnh hưởng map gốc
 */

import React, { useState, useCallback, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useMapHandCursor, CursorMapAction, CursorMode, HandType } from '@/hooks/useMapHandCursor';
import { Hand, Camera, CameraOff, Pause, Move, MousePointer, ZoomIn, Loader2, X, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapHandControlLayerProps {
  containerRef: React.RefObject<HTMLElement>;
  onPan?: (deltaX: number, deltaY: number) => void;
  onZoom?: (delta: number) => void;
  onClick?: (x: number, y: number, button: 'left' | 'right') => void;
  onContextMenu?: (x: number, y: number) => void;
  className?: string;
}

// Cursor visual component
const CursorOverlay = memo(({ 
  x, y, mode, hand, isVisible 
}: { 
  x: number; 
  y: number; 
  mode: CursorMode; 
  hand: HandType;
  isVisible: boolean;
}) => {
  if (!isVisible) return null;

  const getCursorColor = () => {
    switch (hand) {
      case 'left': return 'bg-green-500 border-green-300 shadow-green-500/50';
      case 'right': return 'bg-blue-500 border-blue-300 shadow-blue-500/50';
      case 'both': return 'bg-purple-500 border-purple-300 shadow-purple-500/50';
      default: return 'bg-white border-gray-300';
    }
  };

  const getCursorIcon = () => {
    switch (mode) {
      case 'drag': return <Move className="h-4 w-4 text-white" />;
      case 'click': return <MousePointer className="h-4 w-4 text-white" />;
      case 'zoom': return <ZoomIn className="h-4 w-4 text-white" />;
      case 'paused': return <Pause className="h-4 w-4 text-white" />;
      default: return <div className="w-2 h-2 bg-white rounded-full" />;
    }
  };

  const getCursorSize = () => {
    switch (mode) {
      case 'drag': return 'w-10 h-10';
      case 'click': return 'w-8 h-8';
      case 'zoom': return 'w-12 h-12';
      default: return 'w-6 h-6';
    }
  };

  return (
    <div
      className="absolute pointer-events-none z-[100] transition-all duration-50 ease-out"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer glow */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-md opacity-50",
        hand === 'left' ? 'bg-green-400' : 
        hand === 'right' ? 'bg-blue-400' : 
        hand === 'both' ? 'bg-purple-400' : 'bg-white',
      )} style={{ transform: 'scale(1.5)' }} />

      {/* Main cursor */}
      <div className={cn(
        "relative rounded-full border-3 flex items-center justify-center shadow-2xl transition-all duration-100",
        getCursorColor(),
        getCursorSize(),
        mode === 'drag' && 'animate-pulse',
      )}>
        {getCursorIcon()}
      </div>
      
      {/* Ripple effect on click/drag */}
      {(mode === 'click' || mode === 'drag') && (
        <>
          <div className={cn(
            "absolute inset-0 rounded-full border-2 animate-ping opacity-75",
            hand === 'left' ? 'border-green-400' : 'border-blue-400',
          )} />
          <div className={cn(
            "absolute inset-0 rounded-full border animate-pulse",
            hand === 'left' ? 'border-green-300' : 'border-blue-300',
          )} style={{ transform: 'scale(2)' }} />
        </>
      )}

      {/* Hand indicator label */}
      <div className={cn(
        "absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg",
        hand === 'left' ? 'bg-green-600 text-white' : 
        hand === 'right' ? 'bg-blue-600 text-white' : 
        hand === 'both' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white'
      )}>
        {hand === 'left' ? '← Trái' : hand === 'right' ? 'Phải →' : hand === 'both' ? '↔ Zoom' : ''}
      </div>
    </div>
  );
});

CursorOverlay.displayName = 'CursorOverlay';

// Camera preview component
const CameraPreview = memo(({ 
  videoRef, 
  canvasRef, 
  isActive,
  onClose,
  handCount,
}: { 
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  onClose: () => void;
  handCount: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      "absolute bottom-20 right-4 z-40 transition-all duration-300 ease-out",
      isExpanded ? "w-72 h-52" : "w-36 h-28",
    )}>
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-black">
        {/* Video feed (hidden, used for processing) */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
          autoPlay
        />
        
        {/* Canvas preview with hand tracking overlay */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {/* Top bar with status and controls */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              isActive ? "bg-green-500 animate-pulse shadow-green-500/50 shadow-lg" : "bg-red-500"
            )} />
            <span className="text-[10px] text-white/90 font-medium">
              {isActive ? `${handCount} tay` : 'Đang tìm...'}
            </span>
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3 text-white" />
              ) : (
                <Maximize2 className="h-3 w-3 text-white" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 bg-white/10 rounded-lg hover:bg-red-500/50 transition-colors"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>

        {/* Bottom legend */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center gap-3 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-white/80">Trái: Kéo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-white/80">Phải: Menu</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-white/80">2 tay: Zoom</span>
            </div>
          </div>
        </div>

        {/* No hand detected overlay */}
        {handCount === 0 && isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <Hand className="h-8 w-8 text-white/60 mx-auto mb-1 animate-bounce" />
              <span className="text-[10px] text-white/80">Đưa tay vào camera</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CameraPreview.displayName = 'CameraPreview';

// Gesture guide overlay
const GestureGuide = memo(({ isVisible, onDismiss }: { isVisible: boolean; onDismiss: () => void }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-fade-in max-w-[95vw]">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl px-5 py-3 text-white shadow-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Hand className="h-4 w-4 text-green-400" />
          <span className="text-sm font-semibold">Điều khiển bằng tay</span>
          <button onClick={onDismiss} className="ml-auto p-1 hover:bg-white/10 rounded">
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex flex-col items-center gap-1 p-2 bg-green-500/20 rounded-lg">
            <span className="text-lg">✋</span>
            <span className="text-green-400 font-medium">Tay trái</span>
            <span className="text-white/60">Pinch + kéo = Pan</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-blue-500/20 rounded-lg">
            <span className="text-lg">✋</span>
            <span className="text-blue-400 font-medium">Tay phải</span>
            <span className="text-white/60">Pinch = Menu</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-purple-500/20 rounded-lg">
            <span className="text-lg">👐</span>
            <span className="text-purple-400 font-medium">2 tay</span>
            <span className="text-white/60">Xa/gần = Zoom</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 bg-orange-500/20 rounded-lg">
            <span className="text-lg">✊</span>
            <span className="text-orange-400 font-medium">Nắm tay</span>
            <span className="text-white/60">= Tạm dừng</span>
          </div>
        </div>
      </div>
    </div>
  );
});

GestureGuide.displayName = 'GestureGuide';

// Permission request overlay
const PermissionRequest = memo(({ onRequest, onCancel }: { onRequest: () => void; onCancel: () => void }) => {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
      <div className="bg-card rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bật Camera</h3>
            <p className="text-sm text-muted-foreground">Để điều khiển map bằng tay</p>
          </div>
        </div>
        
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
            <span>Xử lý hoàn toàn trên thiết bị</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
            <span>Không lưu ảnh hoặc video</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5" />
            <span>Không nhận diện khuôn mặt</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Hủy
          </Button>
          <Button onClick={onRequest} className="flex-1 gap-2">
            <Camera className="h-4 w-4" />
            Cho phép
          </Button>
        </div>
      </div>
    </div>
  );
});

PermissionRequest.displayName = 'PermissionRequest';

// Main component
export const MapHandControlLayer: React.FC<MapHandControlLayerProps> = ({
  containerRef,
  onPan,
  onZoom,
  onClick,
  onContextMenu,
  className,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Handle map actions from cursor
  const handleMapAction = useCallback((action: CursorMapAction) => {
    switch (action.type) {
      case 'pan':
        onPan?.(action.deltaX, action.deltaY);
        break;
      case 'zoom':
        onZoom?.(action.delta);
        break;
      case 'click':
        onClick?.(action.x, action.y, action.button);
        break;
      case 'context_menu':
        onContextMenu?.(action.x, action.y);
        break;
    }
  }, [onPan, onZoom, onClick, onContextMenu]);

  const {
    cursor,
    status,
    error,
    videoRef,
    canvasRef,
    start,
    stop,
  } = useMapHandCursor({
    containerRef,
    onMapAction: handleMapAction,
    smoothingFactor: 0.3,
  });

  // Handle toggle with permission dialog
  const handleToggle = useCallback(async () => {
    if (status === 'active' || status === 'paused') {
      stop();
      toast.success('Đã tắt Hand Control');
    } else if (status === 'inactive' || status === 'error') {
      setShowPermissionDialog(true);
    }
  }, [status, stop]);

  // Handle permission granted
  const handlePermissionGranted = useCallback(async () => {
    setShowPermissionDialog(false);
    setHasInteracted(true);
    try {
      await start();
      setShowGuide(true);
      toast.success('Hand Control đã bật!', {
        description: 'Đưa tay vào camera để điều khiển map'
      });
    } catch (err) {
      toast.error('Không thể bật camera', {
        description: err instanceof Error ? err.message : 'Vui lòng thử lại'
      });
    }
  }, [start]);

  // Hide guide after delay
  useEffect(() => {
    if (showGuide && status === 'active') {
      const timer = setTimeout(() => setShowGuide(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showGuide, status]);

  // Show error toast
  useEffect(() => {
    if (error && hasInteracted) {
      toast.error('Hand Control lỗi', { description: error });
    }
  }, [error, hasInteracted]);

  const isActive = status === 'active' || status === 'paused';
  const isInitializing = status === 'initializing';

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Toggle button - always visible */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <Button
          onClick={handleToggle}
          variant={isActive ? "default" : "secondary"}
          size="sm"
          className={cn(
            "gap-2 shadow-xl transition-all duration-200",
            isActive && "bg-green-600 hover:bg-green-700 text-white shadow-green-500/30",
            isInitializing && "animate-pulse",
            !isActive && !isInitializing && "hover:bg-primary hover:text-primary-foreground",
          )}
          disabled={isInitializing}
        >
          {isInitializing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Đang bật camera...</span>
            </>
          ) : isActive ? (
            <>
              <Hand className="h-4 w-4" />
              <span className="hidden sm:inline">Hand Control</span>
              <div className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <Hand className="h-4 w-4" />
              <span className="hidden sm:inline">Hand Control</span>
              <CameraOff className="h-3 w-3 opacity-50" />
            </>
          )}
        </Button>
      </div>

      {/* Permission dialog */}
      {showPermissionDialog && (
        <PermissionRequest
          onRequest={handlePermissionGranted}
          onCancel={() => setShowPermissionDialog(false)}
        />
      )}

      {/* Active state components */}
      {isActive && (
        <>
          {/* Cursor overlay */}
          <CursorOverlay
            x={cursor.x}
            y={cursor.y}
            mode={cursor.mode}
            hand={cursor.hand}
            isVisible={cursor.isVisible}
          />

          {/* Camera preview */}
          <div className="pointer-events-auto">
            <CameraPreview
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={status === 'active'}
              onClose={stop}
              handCount={cursor.hand === 'both' ? 2 : cursor.hand === 'none' ? 0 : 1}
            />
          </div>

          {/* Gesture guide */}
          <GestureGuide 
            isVisible={showGuide} 
            onDismiss={() => setShowGuide(false)} 
          />

          {/* Pause indicator */}
          {status === 'paused' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className="bg-orange-600/90 backdrop-blur-xl rounded-2xl px-8 py-5 text-white flex items-center gap-4 shadow-2xl">
                <div className="p-3 bg-white/20 rounded-full">
                  <Pause className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-xl font-bold">Tạm dừng</div>
                  <div className="text-sm text-white/80">Mở tay để tiếp tục điều khiển</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error indicator (subtle) */}
      {error && !isActive && (
        <div className="absolute top-16 right-4 z-40 pointer-events-auto">
          <div className="bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-xs flex items-center gap-2 max-w-[200px]">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapHandControlLayer;
