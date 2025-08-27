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
          const { lat, lng } = e.target.getLatLng();
          onDragEnd([lat, lng]);
        }
      }}
    />
  );
};

export const MapOverlayCalibrator: React.FC = () => {
  const [overlay, setOverlay] = useState<MapOverlay | null>(null);
  const [tempBounds, setTempBounds] = useState<{
    sw_lat: number;
    sw_lng: number;
    ne_lat: number;
    ne_lng: number;
  } | null>(null);
  const [opacity, setOpacity] = useState(0.55);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For demo purposes, assuming all authenticated users can edit
        // In production, check actual role from JWT or database
        setIsAdmin(true);
      }
    };
    checkAdminStatus();
  }, []);

  // Load overlay data
  useEffect(() => {
    const loadOverlay = async () => {
      try {
        const { data, error } = await supabase
          .from('map_overlays')
          .select('*')
          .eq('id', 'hcmc_admin')
          .single();

        if (error) throw error;
        if (data) {
          setOverlay(data);
          setTempBounds({
            sw_lat: data.sw_lat,
            sw_lng: data.sw_lng,
            ne_lat: data.ne_lat,
            ne_lng: data.ne_lng
          });
          setOpacity(data.opacity);
        }
      } catch (error) {
        console.error('Error loading overlay:', error);
        toast.error('Failed to load overlay configuration');
      }
    };

    loadOverlay();
  }, []);

  // Subscribe to real-time updates
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
          console.log('Realtime update:', payload);
          if (payload.new && (payload.new as MapOverlay).id === 'hcmc_admin') {
            const newOverlay = payload.new as MapOverlay;
            setOverlay(newOverlay);
            setTempBounds({
              sw_lat: newOverlay.sw_lat,
              sw_lng: newOverlay.sw_lng,
              ne_lat: newOverlay.ne_lat,
              ne_lng: newOverlay.ne_lng
            });
            setOpacity(newOverlay.opacity);
            toast.success('Overlay updated by another user');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCornerDrag = (corner: 'sw' | 'se' | 'nw' | 'ne', newPosition: [number, number]) => {
    if (!tempBounds) return;

    const [lat, lng] = newPosition;
    const newBounds = { ...tempBounds };

    switch (corner) {
      case 'sw':
        newBounds.sw_lat = lat;
        newBounds.sw_lng = lng;
        break;
      case 'se':
        newBounds.sw_lat = lat;
        newBounds.ne_lng = lng;
        break;
      case 'nw':
        newBounds.ne_lat = lat;
        newBounds.sw_lng = lng;
        break;
      case 'ne':
        newBounds.ne_lat = lat;
        newBounds.ne_lng = lng;
        break;
    }

    setTempBounds(newBounds);
  };

  const handleSave = async () => {
    if (!tempBounds || !isAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('map_overlays')
        .update({
          sw_lat: tempBounds.sw_lat,
          sw_lng: tempBounds.sw_lng,
          ne_lat: tempBounds.ne_lat,
          ne_lng: tempBounds.ne_lng,
          opacity,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'hcmc_admin');

      if (error) throw error;
      toast.success('Overlay configuration saved successfully');
    } catch (error) {
      console.error('Error saving overlay:', error);
      toast.error('Failed to save overlay configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!overlay) return;
    
    setTempBounds({
      sw_lat: overlay.sw_lat,
      sw_lng: overlay.sw_lng,
      ne_lat: overlay.ne_lat,
      ne_lng: overlay.ne_lng
    });
    setOpacity(overlay.opacity);
    toast.info('Configuration reset to last saved state');
  };

  if (!overlay || !tempBounds) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading overlay configuration...</div>
      </div>
    );
  }

  const bounds: [[number, number], [number, number]] = [
    [tempBounds.sw_lat, tempBounds.sw_lng],
    [tempBounds.ne_lat, tempBounds.ne_lng]
  ];

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Map Overlay Calibrator
            {!isAdmin && (
              <span className="text-sm text-muted-foreground">
                (View Only - Admin access required to edit)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Opacity: {opacity.toFixed(2)}</label>
              <Slider
                value={[opacity]}
                onValueChange={(value) => setOpacity(value[0])}
                min={0}
                max={1}
                step={0.05}
                disabled={!isAdmin}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                disabled={!isAdmin}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isAdmin || loading}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <MapContainer
              center={[10.7769, 106.7009]} // Ho Chi Minh City center
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Image Overlay */}
              <ImageOverlay
                url="/lovable-uploads/40ee6f0b-d623-4956-b009-5badea595eaf.png"
                bounds={bounds}
                opacity={opacity}
              />

              {/* Corner Markers for Calibration */}
              {isAdmin && (
                <>
                  {/* Southwest Corner */}
                  <DraggableCornerMarker
                    position={[tempBounds.sw_lat, tempBounds.sw_lng]}
                    icon={createCornerIcon('sw')}
                    onDragEnd={(pos) => handleCornerDrag('sw', pos)}
                    canEdit={isAdmin}
                  />
                  
                  {/* Southeast Corner */}
                  <DraggableCornerMarker
                    position={[tempBounds.sw_lat, tempBounds.ne_lng]}
                    icon={createCornerIcon('se')}
                    onDragEnd={(pos) => handleCornerDrag('se', pos)}
                    canEdit={isAdmin}
                  />
                  
                  {/* Northwest Corner */}
                  <DraggableCornerMarker
                    position={[tempBounds.ne_lat, tempBounds.sw_lng]}
                    icon={createCornerIcon('nw')}
                    onDragEnd={(pos) => handleCornerDrag('nw', pos)}
                    canEdit={isAdmin}
                  />
                  
                  {/* Northeast Corner */}
                  <DraggableCornerMarker
                    position={[tempBounds.ne_lat, tempBounds.ne_lng]}
                    icon={createCornerIcon('ne')}
                    onDragEnd={(pos) => handleCornerDrag('ne', pos)}
                    canEdit={isAdmin}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            {isAdmin ? (
              <>
                <strong>Instructions:</strong> Drag the red corner markers to adjust the overlay position. 
                Use the opacity slider to adjust transparency. Click Save to persist changes.
                Changes will sync in real-time across all connected clients.
              </>
            ) : (
              <>
                <strong>View Mode:</strong> You can view the current overlay configuration but cannot make changes. 
                Admin access is required to calibrate the overlay.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};