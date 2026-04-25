import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Marker } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom draggable marker icons
const createCornerIcon = (corner: string) => {
  return L.divIcon({
    html: `<div style="background-color: #ff4444; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: `corner-marker corner-${corner}`
  });
};

interface MapOverlay {
  id: string;
  image_url: string;
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
  opacity: number;
}

interface DraggableCornerMarkerProps {
  position: [number, number];
  icon: L.DivIcon;
  onDragEnd: (newPosition: [number, number]) => void;
  canEdit: boolean;
}

const DraggableCornerMarker: React.FC<DraggableCornerMarkerProps> = ({ 
  position, 
  icon, 
  onDragEnd, 
  canEdit 
}) => {
  return (
    <Marker
      position={position}
      icon={icon}
      draggable={canEdit}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onDragEnd([position.lat, position.lng]);
        },
      }}
    />
  );
};

export default function MapOverlayCalibrator() {
  const [overlay, setOverlay] = useState<MapOverlay | null>(null);
  const [tempBounds, setTempBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch overlay data and check admin status
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if user is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminData } = await supabase
            .rpc('is_admin', { user_id: user.id });
          setIsAdmin(adminData || false);
        }

        // Fetch overlay data
        const { data: overlayData, error: overlayError } = await supabase
          .from('map_overlays')
          .select('*')
          .eq('id', 'hcmc_admin')
          .single();

        if (overlayError) {
          console.error('Error fetching overlay:', overlayError);
          setError('Không thể tải dữ liệu bản đồ');
          return;
        }

        if (overlayData) {
          setOverlay(overlayData);
          setOpacity(overlayData.opacity);
          setTempBounds([
            [overlayData.sw_lat, overlayData.sw_lng],
            [overlayData.ne_lat, overlayData.ne_lng]
          ]);
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('Lỗi kết nối máy chủ');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('map_overlays_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_overlays'
        },
        (payload) => {
          if (payload.new && (payload.new as any).id === 'hcmc_admin') {
            const newData = payload.new as MapOverlay;
            setOverlay(newData);
            setOpacity(newData.opacity);
            setTempBounds([
              [newData.sw_lat, newData.sw_lng],
              [newData.ne_lat, newData.ne_lng]
            ]);
            toast.info('Cấu hình bản đồ đã được cập nhật');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCornerDrag = (corner: string, newPosition: [number, number]) => {
    if (!tempBounds) return;

    let newBounds = [...tempBounds] as [[number, number], [number, number]];

    switch (corner) {
      case 'sw':
        newBounds[0] = newPosition;
        break;
      case 'se':
        newBounds[0][0] = newPosition[0];
        newBounds[1][1] = newPosition[1];
        break;
      case 'nw':
        newBounds[1][0] = newPosition[0];
        newBounds[0][1] = newPosition[1];
        break;
      case 'ne':
        newBounds[1] = newPosition;
        break;
    }

    setTempBounds(newBounds);
  };

  const handleSave = async () => {
    if (!overlay || !tempBounds || !isAdmin) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('map_overlays')
        .update({
          sw_lat: tempBounds[0][0],
          sw_lng: tempBounds[0][1],
          ne_lat: tempBounds[1][0],
          ne_lng: tempBounds[1][1],
          opacity,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'hcmc_admin');

      if (error) {
        console.error('Error saving overlay:', error);
        toast.error('Lỗi khi lưu cấu hình');
        return;
      }

      setOverlay(prev => prev ? {
        ...prev,
        sw_lat: tempBounds[0][0],
        sw_lng: tempBounds[0][1],
        ne_lat: tempBounds[1][0],
        ne_lng: tempBounds[1][1],
        opacity
      } : null);

      toast.success('Đã lưu cấu hình thành công');
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!overlay) return;
    
    setTempBounds([
      [overlay.sw_lat, overlay.sw_lng],
      [overlay.ne_lat, overlay.ne_lng]
    ]);
    setOpacity(overlay.opacity);
    toast.info('Đã khôi phục về cấu hình đã lưu');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Đang tải bản đồ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Control Panel */}
      <Card className="w-80 m-4 flex flex-col">
        <CardHeader>
          <CardTitle>Hiệu chỉnh Bản đồ</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div>
            <label className="text-sm font-medium">Độ trong suốt</label>
            <Slider
              value={[opacity]}
              onValueChange={([value]) => setOpacity(value)}
              min={0}
              max={1}
              step={0.1}
              className="mt-2"
            />
            <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Button 
                onClick={handleSave}
                className="w-full"
                disabled={!tempBounds || isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleReset}
                className="w-full"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Khôi phục
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {isAdmin ? (
              <p>Bạn có quyền chỉnh sửa. Kéo các góc để điều chỉnh vị trí bản đồ.</p>
            ) : (
              <p>Bạn chỉ có quyền xem. Liên hệ quản trị viên để chỉnh sửa.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <div className="flex-1 m-4">
        {overlay && tempBounds && (
          <MapContainer
            center={[10.775, 106.7]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <ImageOverlay
              url={overlay.image_url}
              bounds={tempBounds}
              opacity={opacity}
            />

            {/* Corner Markers - Only show if admin */}
            {isAdmin && (
              <>
                <DraggableCornerMarker
                  position={tempBounds[0]}
                  icon={createCornerIcon('sw')}
                  onDragEnd={(newPos) => handleCornerDrag('sw', newPos)}
                  canEdit={isAdmin}
                />
                
                <DraggableCornerMarker
                  position={[tempBounds[0][0], tempBounds[1][1]]}
                  icon={createCornerIcon('se')}
                  onDragEnd={(newPos) => handleCornerDrag('se', newPos)}
                  canEdit={isAdmin}
                />
                
                <DraggableCornerMarker
                  position={[tempBounds[1][0], tempBounds[0][1]]}
                  icon={createCornerIcon('nw')}
                  onDragEnd={(newPos) => handleCornerDrag('nw', newPos)}
                  canEdit={isAdmin}
                />
                
                <DraggableCornerMarker
                  position={tempBounds[1]}
                  icon={createCornerIcon('ne')}
                  onDragEnd={(newPos) => handleCornerDrag('ne', newPos)}
                  canEdit={isAdmin}
                />
              </>
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}