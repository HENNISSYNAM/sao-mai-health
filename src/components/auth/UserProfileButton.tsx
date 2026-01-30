import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Shield, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserAlerts } from '@/hooks/useUserAlerts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const UserProfileButton: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, getAvatarUrl, getDisplayName } = useAuth();
  const { unreadCount } = useUserAlerts();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl"
        onClick={() => navigate('/auth')}
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{t('auth.login', 'Đăng nhập')}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
            <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getDisplayName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getDisplayName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/bio-vault')} className="cursor-pointer">
          <Shield className="h-4 w-4 mr-3" />
          <span>{t('nav.bioVault', 'Bio-Vault')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/alerts')} className="cursor-pointer">
          <Bell className="h-4 w-4 mr-3" />
          <span>{t('nav.alerts', 'Cảnh báo')}</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto text-[10px] px-1.5">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <Settings className="h-4 w-4 mr-3" />
          <span>{t('nav.settings', 'Cài đặt')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-3" />
          <span>{t('common.info', 'Trợ giúp')}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span>{t('auth.logout', 'Đăng xuất')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
