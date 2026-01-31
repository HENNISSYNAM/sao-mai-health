import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Brain, Dna, MapPin, AlertTriangle, Menu, Settings, HelpCircle, Activity, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, isAuthenticated, signOut, getAvatarUrl, getDisplayName } = useAuth();

  const menuItems = [
    { titleKey: 'nav.dashboard', title: t('nav.dashboard'), url: '/', icon: BarChart3 },
    { titleKey: 'nav.strokeRisk', title: t('nav.strokeRisk'), url: '/stroke-risk', icon: Brain },
    { titleKey: 'nav.digitalTwin', title: t('nav.digitalTwin', 'Song sinh số'), url: '/bio-vault', icon: Dna },
    { titleKey: 'nav.maps', title: t('nav.maps'), url: '/maps', icon: MapPin },
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.titleKey}
            to={item.url}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon
              className={cn(
                "h-6 w-6 transition-transform duration-200",
                isActive(item.url) && "scale-110"
              )}
              strokeWidth={isActive(item.url) ? 2.5 : 1.5}
            />
            <span className={cn(
              "text-[10px] leading-tight",
              isActive(item.url) ? "font-semibold" : "font-normal"
            )}>
              {item.title}
            </span>
          </NavLink>
        ))}

        {/* Profile/Login - Instagram style */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] leading-tight font-normal truncate max-w-[50px]">
                  {getDisplayName().split(' ')[0]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
              <div className="flex items-center gap-3 p-3 border-b border-border">
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
              <DropdownMenuItem asChild>
                <NavLink to="/bio-vault" className="flex items-center gap-3 cursor-pointer">
                  <Dna className="h-5 w-5" />
                  <span>{t('nav.digitalTwin', 'Song sinh số')}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/alerts" className="flex items-center gap-3 cursor-pointer">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{t('nav.alerts')}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-3 cursor-pointer">
                  <Settings className="h-5 w-5" />
                  <span>{t('nav.settings')}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/help" className="flex items-center gap-3 cursor-pointer">
                  <HelpCircle className="h-5 w-5" />
                  <span>{t('common.info')}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center gap-3 cursor-pointer text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                <span>{t('auth.logout', 'Đăng xuất')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavLink
            to="/auth"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all duration-200",
              currentPath === '/auth'
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all",
              currentPath === '/auth'
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/50"
            )}>
              <User className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <span className={cn(
              "text-[10px] leading-tight",
              currentPath === '/auth' ? "font-semibold" : "font-normal"
            )}>
              {t('auth.login', 'Đăng nhập')}
            </span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};
