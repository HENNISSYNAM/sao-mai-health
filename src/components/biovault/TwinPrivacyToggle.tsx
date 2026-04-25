import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Globe, Users, Lock, Eye, EyeOff, 
  MapPin, Shield, Heart, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharingMode {
  mode: 'anonymous' | 'community' | 'family';
  isSharing: boolean;
}

interface TwinPrivacyToggleProps {
  currentMode?: SharingMode;
  onModeChange?: (mode: SharingMode) => void;
}

export const TwinPrivacyToggle: React.FC<TwinPrivacyToggleProps> = ({
  currentMode = { mode: 'anonymous', isSharing: false },
  onModeChange
}) => {
  const { user } = useAuth();
  const [mode, setMode] = React.useState(currentMode);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggleSharing = async (isSharing: boolean) => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập');
      return;
    }

    setIsUpdating(true);
    try {
      // Update user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          sharing_mode: isSharing ? mode.mode : 'anonymous' 
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update map presence
      const { error: presenceError } = await supabase
        .from('user_map_presence')
        .update({ is_sharing: isSharing })
        .eq('user_id', user.id);

      // It's ok if presence doesn't exist yet
      if (presenceError && !presenceError.message.includes('no rows')) {
        console.error('Presence update error:', presenceError);
      }

      const newMode = { ...mode, isSharing };
      setMode(newMode);
      onModeChange?.(newMode);

      toast.success(isSharing 
        ? 'Đã bật chia sẻ với cộng đồng' 
        : 'Đã chuyển về chế độ ẩn danh'
      );
    } catch (err) {
      console.error('Toggle sharing error:', err);
      toast.error('Không thể cập nhật cài đặt');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleModeChange = async (newMode: 'anonymous' | 'community' | 'family') => {
    if (!user?.id) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ sharing_mode: newMode })
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedMode = { mode: newMode, isSharing: newMode !== 'anonymous' };
      setMode(updatedMode);
      onModeChange?.(updatedMode);

      toast.success(`Đã chuyển sang chế độ ${getModeLabel(newMode)}`);
    } catch (err) {
      console.error('Mode change error:', err);
      toast.error('Không thể cập nhật chế độ');
    } finally {
      setIsUpdating(false);
    }
  };

  const getModeLabel = (m: string) => {
    switch (m) {
      case 'community': return 'Cộng đồng';
      case 'family': return 'Gia đình';
      default: return 'Ẩn danh';
    }
  };

  const getModeIcon = (m: string) => {
    switch (m) {
      case 'community': return <Globe className="h-4 w-4" />;
      case 'family': return <Users className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-primary" />
              Chế độ chia sẻ
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Kiểm soát ai có thể thấy dữ liệu Song sinh số của bạn
            </CardDescription>
          </div>
          
          <Badge 
            variant={mode.isSharing ? 'default' : 'secondary'}
            className={mode.isSharing ? 'bg-success text-success-foreground' : ''}
          >
            {mode.isSharing ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            {getModeLabel(mode.mode)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main sharing toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${mode.isSharing ? 'bg-success/20' : 'bg-muted'}`}>
              <MapPin className={`h-4 w-4 ${mode.isSharing ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <Label htmlFor="sharing-toggle" className="font-medium">
                Hiển thị trên bản đồ cộng đồng
              </Label>
              <p className="text-xs text-muted-foreground">
                Vị trí của bạn sẽ {mode.isSharing ? 'hiển thị' : 'ẩn'} trên bản đồ Theo dõi bệnh
              </p>
            </div>
          </div>
          <Switch
            id="sharing-toggle"
            checked={mode.isSharing}
            onCheckedChange={handleToggleSharing}
            disabled={isUpdating}
          />
        </div>

        {/* Mode selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Chế độ hiển thị:</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['anonymous', 'community', 'family'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                disabled={isUpdating}
                className={`
                  p-3 rounded-lg border-2 transition-all text-center
                  ${mode.mode === m 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className={`mx-auto mb-1 ${mode.mode === m ? 'text-primary' : 'text-muted-foreground'}`}>
                  {getModeIcon(m)}
                </div>
                <p className={`text-xs font-medium ${mode.mode === m ? 'text-primary' : ''}`}>
                  {getModeLabel(m)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy info */}
        <div className="p-3 rounded-lg bg-info/10 border border-info/20">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              {mode.mode === 'anonymous' && (
                <p>Chế độ ẩn danh: Bạn sẽ không xuất hiện trên bản đồ cộng đồng. Dữ liệu chỉ dùng cho AI cá nhân.</p>
              )}
              {mode.mode === 'community' && (
                <p>Chế độ cộng đồng: Vị trí và mức rủi ro (ẩn danh) sẽ hiển thị. Không chia sẻ thông tin cá nhân.</p>
              )}
              {mode.mode === 'family' && (
                <p>Chế độ gia đình: Chỉ những người bạn cho phép mới thấy vị trí và sức khỏe của bạn.</p>
              )}
            </div>
          </div>
        </div>

        {/* Health sharing summary */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            <Heart className={`h-3 w-3 ${mode.isSharing ? 'text-danger' : 'text-muted-foreground'}`} />
            <span className="text-muted-foreground">
              Sức khỏe: {mode.isSharing ? 'Chia sẻ mức rủi ro' : 'Riêng tư'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <MapPin className={`h-3 w-3 ${mode.isSharing ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-muted-foreground">
              Vị trí: {mode.isSharing ? 'Hiển thị (ẩn danh)' : 'Ẩn'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
