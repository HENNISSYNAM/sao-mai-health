import { useTranslation } from "react-i18next";
import { Activity, Brain, MapPin, Dna, AlertTriangle, BarChart3, Settings, HelpCircle, Menu, Lock } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
export function AppSidebar() {
  const {
    t
  } = useTranslation();
  const {
    state,
    setOpen
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    prefetchByRoute
  } = usePrefetch();
  const [isHovering, setIsHovering] = useState(false);

  // Auto collapse on mount
  useEffect(() => {
    setOpen(false);
  }, []);

  // Handle hover to expand
  const handleMouseEnter = () => {
    setIsHovering(true);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    setIsHovering(false);
    setOpen(false);
  };
  const menuItems = [{
    titleKey: "nav.dashboard",
    title: t('nav.dashboard'),
    url: "/",
    icon: BarChart3,
    requiresAuth: false
  }, {
    titleKey: "nav.strokeRisk",
    title: t('nav.strokeRisk'),
    url: "/stroke-risk",
    icon: Brain,
    requiresAuth: true
  }, {
    titleKey: "nav.digitalTwin",
    title: t('nav.digitalTwin', 'Song sinh số'),
    url: "/bio-vault",
    icon: Dna,
    requiresAuth: true
  }, {
    titleKey: "nav.maps",
    title: t('nav.maps'),
    url: "/maps",
    icon: MapPin,
    requiresAuth: true
  }, {
    titleKey: "nav.alerts",
    title: t('nav.alerts'),
    url: "/alerts",
    icon: AlertTriangle,
    requiresAuth: true
  }];
  
  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };
  
  const handlePrefetch = (url: string) => {
    prefetchByRoute(url);
  };

  const handleNavClick = (item: typeof menuItems[0], e: React.MouseEvent) => {
    if (item.requiresAuth && !isAuthenticated) {
      e.preventDefault();
      navigate('/auth', { state: { from: { pathname: item.url } } });
    }
  };
  return <Sidebar className="border-r border-border bg-background transition-all duration-300" collapsible="icon" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <SidebarContent className="flex flex-col h-full py-6">
        {/* Logo - Centered, bigger, with heartbeat */}
        <NavLink to="/" className="flex items-center justify-center px-3 mb-10">
          <div className="relative flex items-center justify-center">
            <img src={logoImg} alt="Sao Mai Health" className={cn("object-contain animate-heartbeat transition-all duration-300", collapsed ? "w-9 h-9" : "w-10 h-10")} />
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
          </div>
          {!collapsed && <span className="ml-3 text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden">NOVAHUB</span>}
        </NavLink>

        {/* Main Navigation - Evenly spaced */}
        <SidebarMenu className="flex-1 flex flex-col justify-start gap-2 px-3">
          {menuItems.map(item => <SidebarMenuItem key={item.titleKey}>
              <SidebarMenuButton asChild>
                <NavLink 
                  to={item.url} 
                  end={item.url === '/'} 
                  onClick={(e) => handleNavClick(item, e)}
                  className={cn(
                    "flex items-center gap-4 px-3 py-3.5 rounded-xl text-base transition-all duration-200",
                    collapsed ? "justify-center" : "justify-start",
                    isActive(item.url) 
                      ? "bg-primary text-primary-foreground font-semibold shadow-md" 
                      : "font-normal hover:bg-accent",
                    item.requiresAuth && !isAuthenticated && "opacity-70"
                  )} 
                  onMouseEnter={() => handlePrefetch(item.url)}
                >
                  <div className="relative">
                    <item.icon 
                      className={cn(
                        "h-6 w-6 flex-shrink-0 transition-transform duration-200", 
                        isActive(item.url) && "scale-110"
                      )} 
                      strokeWidth={isActive(item.url) ? 2.5 : 1.5} 
                    />
                    {item.requiresAuth && !isAuthenticated && (
                      <Lock className="absolute -bottom-1 -right-1 h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {!collapsed && (
                    <span className="whitespace-nowrap overflow-hidden flex items-center gap-2">
                      {item.title}
                      {item.requiresAuth && !isAuthenticated && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
        </SidebarMenu>

        {/* Bottom - More menu */}
        <div className="px-3 mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn("flex items-center gap-4 px-3 py-3.5 rounded-xl text-base font-normal hover:bg-accent w-full transition-all duration-200", collapsed ? "justify-center" : "justify-start")}>
                    <Menu className="h-6 w-6 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span className="whitespace-nowrap">{t('common.more', 'Thêm')}</span>}
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
                    <span className="text-destructive font-semibold">Cấp cứu: 115</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>;
}