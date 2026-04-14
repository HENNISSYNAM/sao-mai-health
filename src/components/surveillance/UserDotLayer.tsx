import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, MapPin, TrendingUp, Activity, 
  RefreshCw, Eye, AlertTriangle, Shield
} from 'lucide-react';
import { useMapPresence, UserPresence, PresenceCluster } from '@/hooks/useMapPresence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserDotLayerProps {
  mapCenter?: { lat: number; lng: number };
  onUserClick?: (user: UserPresence) => void;
  onClusterClick?: (cluster: PresenceCluster) => void;
}

export const UserDotLayer: React.FC<UserDotLayerProps> = ({
  mapCenter,
  onUserClick,
  onClusterClick,
}) => {
  const { user } = useAuth();
  const {
    nearbyUsers,
    clusters,
    myPresence,
    isLoading,
    totalActiveUsers,
    fetchNearbyUsers,
    updateMyPresence,
    fetchTotalActiveUsers,
  } = useMapPresence();

  const [selectedUser, setSelectedUser] = useState<UserPresence | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh nearby users
  useEffect(() => {
    if (!autoRefresh || !mapCenter) return;

    const refresh = () => {
      fetchNearbyUsers(mapCenter.lat, mapCenter.lng, 50);
      fetchTotalActiveUsers();
    };

    refresh();
    refreshIntervalRef.current = setInterval(refresh, 60000); // Every minute

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, mapCenter, fetchNearbyUsers, fetchTotalActiveUsers]);

  // Update my presence when location changes
  useEffect(() => {
    if (!user?.id || !mapCenter) return;

    // Get current location and update presence
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateMyPresence(pos.coords.latitude, pos.coords.longitude, {
            isSharing: true,
          });
        },
        (err) => {
          console.log('Geolocation error:', err);
        }
      );
    }
  }, [user?.id, updateMyPresence]);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'high': return 'bg-danger text-danger-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getClusterColor = (avgRisk: number) => {
    if (avgRisk >= 60) return 'bg-danger/80';
    if (avgRisk >= 40) return 'bg-warning/80';
    return 'bg-primary/80';
  };

  return (
    <Card className="border-2 border-info/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-info" />
            Người dùng trên bản đồ
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1 animate-pulse text-success" />
              {totalActiveUsers} online
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mapCenter && fetchNearbyUsers(mapCenter.lat, mapCenter.lng, 50)}
              disabled={isLoading}
              className="h-7 w-7"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* My presence status */}
        {myPresence && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bạn đang online</p>
                <p className="text-xs text-muted-foreground">
                  {myPresence.isSharing ? 'Đang chia sẻ với cộng đồng' : 'Chế độ ẩn danh'}
                </p>
              </div>
              <Badge className={getRiskColor(myPresence.riskLevel)}>
                {myPresence.riskLevel || 'N/A'}
              </Badge>
            </div>
          </div>
        )}

        {/* Clusters summary */}
        {clusters.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Cụm người dùng ({clusters.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {clusters.slice(0, 4).map((cluster, i) => (
                <button
                  key={i}
                  onClick={() => onClusterClick?.(cluster)}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{cluster.userCount} người</span>
                    <div className={`w-2 h-2 rounded-full ${getClusterColor(cluster.avgRiskLevel)}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Bán kính {cluster.radiusKm}km
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nearby users list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Gần bạn ({nearbyUsers.length})
          </p>
          
          {nearbyUsers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Chưa có người dùng nào chia sẻ vị trí gần bạn</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {nearbyUsers.slice(0, 10).map((u) => (
                <button
                  key={u.userId}
                  onClick={() => {
                    setSelectedUser(u);
                    onUserClick?.(u);
                  }}
                  className={`
                    w-full p-2 rounded-lg flex items-center gap-3 transition-colors text-left
                    ${selectedUser?.userId === u.userId 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'bg-muted/30 hover:bg-muted/50'
                    }
                  `}
                >
                  {/* User dot */}
                  <div className="relative">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      ${getRiskColor(u.riskLevel)}
                    `}>
                      <span className="text-[10px] font-bold">
                        {u.ageGroup?.split('-')[0] || '?'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      Người dùng #{u.userId.slice(-4)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Nhóm tuổi: {u.ageGroup || 'N/A'}
                    </p>
                  </div>

                  {/* Risk indicator */}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {u.riskLevel === 'high' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5 text-danger" />}
                    {u.riskLevel || 'N/A'}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground mb-1.5">Chú thích mức rủi ro:</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px]">Thấp</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-[10px]">TB</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-[10px]">Cao</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
