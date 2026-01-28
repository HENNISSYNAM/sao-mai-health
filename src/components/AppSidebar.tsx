import { useTranslation } from "react-i18next";
import { Activity, Brain, MapPin, Shield, AlertTriangle, BarChart3, Settings, HelpCircle, Menu } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink, useLocation } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { cn } from "@/lib/utils";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  useSidebar 
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { prefetchByRoute } = usePrefetch();

  const menuItems = [
    {
      titleKey: "nav.dashboard",
      title: t('nav.dashboard'),
      url: "/",
      icon: BarChart3,
    },
    {
      titleKey: "nav.strokeRisk",
      title: t('nav.strokeRisk'),
      url: "/stroke-risk",
      icon: Brain,
    },
    {
      titleKey: "nav.bioVault",
      title: t('nav.bioVault', 'Bio-Vault'),
      url: "/bio-vault",
      icon: Shield,
    },
    {
      titleKey: "nav.maps",
      title: t('nav.maps'),
      url: "/maps",
      icon: MapPin,
    },
    {
      titleKey: "nav.alerts",
      title: t('nav.alerts'),
      url: "/alerts",
      icon: AlertTriangle,
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleMouseEnter = (url: string) => {
    prefetchByRoute(url);
  };

  return (
    <Sidebar 
      className="border-r border-border bg-background"
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col h-full px-3 py-6">
        {/* Logo - Instagram style */}
        <NavLink to="/" className="mb-8 px-3">
          {collapsed ? (
            <img 
              src={logoImg} 
              alt="Logo" 
              className="w-7 h-7 object-contain"
            />
          ) : (
            <div className="flex items-center gap-3">
              <img 
                src={logoImg} 
                alt="Logo" 
                className="w-7 h-7 object-contain"
              />
              <span className="text-xl font-bold tracking-tight">Sao Mai</span>
            </div>
          )}
        </NavLink>

        {/* Main Navigation - Instagram style */}
        <SidebarMenu className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.titleKey}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  className={cn(
                    "flex items-center gap-4 px-3 py-3 rounded-lg text-base transition-all duration-200 group",
                    isActive(item.url)
                      ? "font-bold"
                      : "font-normal hover:bg-accent"
                  )}
                  onMouseEnter={() => handleMouseEnter(item.url)}
                >
                  <item.icon 
                    className={cn(
                      "h-6 w-6 flex-shrink-0 transition-all",
                      isActive(item.url) && "scale-105"
                    )} 
                    strokeWidth={isActive(item.url) ? 2.5 : 1.5}
                  />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Bottom Section - More menu like Instagram */}
        <div className="space-y-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-4 px-3 py-3 rounded-lg text-base font-normal hover:bg-accent w-full transition-all">
                    <Menu className="h-6 w-6 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>{t('common.more', 'Thêm')}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
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
                  <DropdownMenuItem className="flex items-center gap-3 cursor-pointer">
                    <Activity className="h-5 w-5 text-destructive" />
                    <div>
                      <span className="text-destructive font-semibold">Cấp cứu: 115</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
