/**
 * MapHandControlLayer Component
 * 
 * Input layer phụ cho map - điều khiển bằng tay như mouse
 * Có thể mount/unmount mà không ảnh hưởng map gốc
 * 
 * Features:
 * - Cursor overlay trên map
 * - Camera preview nhỏ
 * - Toggle button
 * - Visual feedback
 */

import React, { useState, useRef, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { useMapHandCursor, CursorMapAction, CursorMode, HandType } from '@/hooks/useMapHandCursor';
import { Hand, Camera, CameraOff, Pause, Move, MousePointer, ZoomIn, Loader2, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      case 'left': return 'bg-green-500 border-green-300';
      case 'right': return 'bg-blue-500 border-blue-300';
      case 'both': return 'bg-purple-500 border-purple-300';
      default: return 'bg-white border-gray-300';
    }
  };

  const getCursorIcon = () => {
    switch (mode) {
      case 'drag': return <Move className="h-3 w-3 text-white" />;
      case 'click': return <MousePointer className="h-3 w-3 text-white" />;
      case 'zoom': return <ZoomIn className="h-3 w-3 text-white" />;
      case 'paused': return <Pause className="h-3 w-3 text-white" />;
      default: return null;
    }
  };

  const getCursorSize = () => {
    switch (mode) {
      case 'drag': return 'w-8 h-8';
      case 'click': return 'w-6 h-6';
      case 'zoom': return 'w-10 h-10';
      default: return 'w-5 h-5';
    }
  };

  return (
    <div
      className="absolute pointer-events-none z-50 transition-transform duration-75"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Main cursor */}
      <div className={cn(
        "rounded-full border-2 flex items-center justify-center shadow-lg transition-all duration-100",
        getCursorColor(),
        getCursorSize(),
        mode === 'drag' && 'animate-pulse',
      )}>
        {getCursorIcon()}
      </div>
      
      {/* Ripple effect on click/drag */}
      {(mode === 'click' || mode === 'drag') && (
        <div className={cn(
          "absolute inset-0 rounded-full border-2 animate-ping",
          hand === 'left' ? 'border-green-400' : 'border-blue-400',
        )} style={{ transform: 'scale(1.5)' }} />
      )}

      {/* Hand indicator label */}
      <div className={cn(
        "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
        hand === 'left' ? 'bg-green-500/80 text-white' : 
        hand === 'right' ? 'bg-blue-500/80 text-white' : 
        hand === 'both' ? 'bg-purple-500/80 text-white' : 'bg-gray-500/80 text-white'
      )}>
        {hand === 'left' ? 'L' : hand === 'right' ? 'R' : hand === 'both' ? 'Zoom' : ''}
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
}: { 
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  onClose: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      "absolute bottom-4 right-4 z-40 transition-all duration-300",
      isExpanded ? "w-64 h-48" : "w-32 h-24",
    )}>
      <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
        {/* Video feed (hidden, used for processing) */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />
        
        {/* Canvas preview with hand tracking overlay */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {/* Status indicator */}
        <div className={cn(
          "absolute top-1 left-1 w-2 h-2 rounded-full",
          isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
        )} />

        {/* Controls */}
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-white" />
            ) : (
              <ChevronUp className="h-3 w-3 text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 bg-black/50 rounded hover:bg-red-500/70 transition-colors"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>

        {/* Hand legend */}
        <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-2 text-[8px]">
          <span className="bg-green-500/80 text-white px-1 rounded">L: Pan</span>
          <span className="bg-blue-500/80 text-white px-1 rounded">R: Menu</span>
        </div>
      </div>
    </div>
  );
});

CameraPreview.displayName = 'CameraPreview';

// Gesture guide overlay
const GestureGuide = memo(({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 text-white text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-green-400">✋ Trái</span>
            <span className="text-muted-foreground">= Kéo map</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-400">✋ Phải</span>
            <span className="text-muted-foreground">= Menu</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400">👐 2 tay</span>
            <span className="text-muted-foreground">= Zoom</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✊</span>
            <span className="text-muted-foreground">= Tạm dừng</span>
          </div>
        </div>
      </div>
    </div>
  );
});

GestureGuide.displayName = 'GestureGuide';

// Main component
export const MapHandControlLayer: React.FC<MapHandControlLayerProps> = ({
  containerRef,
  onPan,
  onZoom,
  onClick,
  onContextMenu,
  className,
}) => {
  const [showGuide, setShowGuide] = useState(true);

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
    toggle,
  } = useMapHandCursor({
    containerRef,
    onMapAction: handleMapAction,
    smoothingFactor: 0.35,
  });

  // Hide guide after 5 seconds when active
  React.useEffect(() => {
    if (status === 'active' && showGuide) {
      const timer = setTimeout(() => setShowGuide(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, showGuide]);

  const isActive = status === 'active' || status === 'paused';

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Toggle button - always interactive */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <Button
          onClick={toggle}
          variant={isActive ? "default" : "secondary"}
          size="sm"
          className={cn(
            "gap-2 shadow-lg",
            isActive && "bg-green-600 hover:bg-green-700 text-white",
            status === 'initializing' && "animate-pulse",
          )}
          disabled={status === 'initializing'}
        >
          {status === 'initializing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Đang khởi tạo...</span>
            </>
          ) : isActive ? (
            <>
              <Hand className="h-4 w-4" />
              <span className="hidden sm:inline">Hand Control</span>
              <Camera className="h-3 w-3 text-green-200" />
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

      {/* Error display */}
      {error && (
        <div className="absolute top-16 right-4 z-50 pointer-events-auto">
          <div className="bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg text-sm max-w-xs">
            {error}
          </div>
        </div>
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
            />
          </div>

          {/* Gesture guide */}
          <GestureGuide isVisible={showGuide} />

          {/* Pause indicator */}
          {status === 'paused' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-4 text-white flex items-center gap-3">
                <Pause className="h-6 w-6" />
                <span className="text-lg font-medium">Tạm dừng</span>
                <span className="text-sm text-muted-foreground">(Mở tay để tiếp tục)</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapHandControlLayer;
