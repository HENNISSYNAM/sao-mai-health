import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Brain, Shield, MapPin, AlertTriangle, Menu, Settings, HelpCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const currentPath = location.pathname;

  const menuItems = [
    { titleKey: 'nav.dashboard', title: t('nav.dashboard'), url: '/', icon: BarChart3 },
    { titleKey: 'nav.strokeRisk', title: t('nav.strokeRisk'), url: '/stroke-risk', icon: Brain },
    { titleKey: 'nav.bioVault', title: t('nav.bioVault', 'Bio-Vault'), url: '/bio-vault', icon: Shield },
    { titleKey: 'nav.maps', title: t('nav.maps'), url: '/maps', icon: MapPin },
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
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

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-[10px] leading-tight font-normal">
                {t('common.more', 'Thêm')}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
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
            <DropdownMenuItem className="flex items-center gap-3 cursor-pointer text-destructive">
              <Activity className="h-5 w-5" />
              <span className="font-semibold">Cấp cứu: 115</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
