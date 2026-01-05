import { useTranslation } from "react-i18next";
import { Activity, Bell, Brain, MapPin, Shield, AlertTriangle, BarChart3, Settings, HelpCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink, useLocation } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { prefetchByRoute } = usePrefetch();

  const menuItems = [
    {
      titleKey: "nav.strokeRisk",
      title: t('nav.strokeRisk'),
      url: "/stroke-risk",
      icon: Brain,
      badge: "LIVE"
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
      badge: "3"
    },
    {
      titleKey: "nav.dashboard",
      title: t('nav.dashboard'),
      url: "/",
      icon: BarChart3,
    },
    {
      titleKey: "nav.surveillance",
      title: t('nav.surveillance'),
      url: "/surveillance",
      icon: Shield,
    }
  ];

  const bottomItems = [
    {
      titleKey: "nav.settings",
      title: t('nav.settings'),
      url: "/settings",
      icon: Settings
    },
    {
      titleKey: "common.info",
      title: t('common.info'),
      url: "/help",
      icon: HelpCircle
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
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col h-full py-6">
        {/* Logo */}
        <div className="px-4 mb-8">
          {collapsed ? (
            <img 
              src={logoImg} 
              alt="Stroke Alert Logo" 
              className="w-12 h-12 rounded-2xl shadow-lg animate-heartbeat object-contain"
            />
          ) : (
            <div className="flex items-center gap-4">
              <img 
                src={logoImg} 
                alt="Stroke Alert Logo" 
                className="w-12 h-12 rounded-2xl shadow-lg animate-heartbeat object-contain"
              />
              <div>
                <h2 className="font-bold text-lg text-sidebar-foreground tracking-tight">Health Hub</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <p className="text-xs text-sidebar-foreground/60">{t('dashboard.live')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              {menuItems.map((item, idx) => (
                <SidebarMenuItem 
                  key={item.titleKey} 
                  className="animate-fade-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                        isActive(item.url)
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                      onMouseEnter={() => handleMouseEnter(item.url)}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-transform",
                        isActive(item.url) && "scale-110"
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              item.badge === "LIVE" 
                                ? "bg-success text-success-foreground animate-pulse" 
                                : "bg-danger text-danger-foreground"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive(item.url)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Emergency Contact - Only when expanded */}
        {!collapsed && (
          <div className="px-4 mt-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary">24/7 Emergency</span>
              </div>
              <p className="text-2xl font-bold text-sidebar-foreground tracking-tight">115</p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
