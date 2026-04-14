import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Brain, MapPin, User, LogOut, Settings, HelpCircle } from 'lucide-react';
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
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, isAuthenticated, signOut, getAvatarUrl, getDisplayName } = useAuth();
  const isVi = i18n.language === 'vi';

  const menuItems = [
    { label: isVi ? 'Tổng quan' : 'Home', url: '/dashboard', icon: BarChart3 },
    { label: isVi ? 'Dịch tễ' : 'Intel', url: '/stroke-risk', icon: Brain },
    { label: isVi ? 'Bản đồ' : 'Map', url: '/maps', icon: MapPin },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return currentPath === '/dashboard' || currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all duration-200",
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive(item.url) && "scale-110"
              )}
              strokeWidth={isActive(item.url) ? 2.5 : 1.5}
            />
            <span className={cn(
              "text-[10px] leading-tight",
              isActive(item.url) ? "font-semibold" : "font-normal"
            )}>
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* Profile/Login */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Avatar className="h-6 w-6 ring-2 ring-primary/20">
                  <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] leading-tight font-normal truncate max-w-[48px]">
                  {getDisplayName().split(' ')[0]}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-52 mb-2">
              <div className="flex items-center gap-2.5 p-2.5 border-b border-border">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{getDisplayName()}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <Settings className="h-4 w-4" />
                  <span>{isVi ? 'Cài đặt' : 'Settings'}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/help" className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <HelpCircle className="h-4 w-4" />
                  <span>{isVi ? 'Trợ giúp' : 'Help'}</span>
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="flex items-center gap-2.5 cursor-pointer text-destructive text-sm"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>{isVi ? 'Đăng xuất' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavLink
            to="/auth"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all duration-200",
              currentPath === '/auth'
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
              currentPath === '/auth'
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/40"
            )}>
              <User className="h-3.5 w-3.5" strokeWidth={1.5} />
            </div>
            <span className={cn(
              "text-[10px] leading-tight",
              currentPath === '/auth' ? "font-semibold" : "font-normal"
            )}>
              {isVi ? 'Đăng nhập' : 'Login'}
            </span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};