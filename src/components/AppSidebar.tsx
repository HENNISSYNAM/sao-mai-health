import { Activity, Bell, Brain, Calendar, CalendarCheck, Hospital, MapPin, Microscope, Package, Target, TrendingUp, UserCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
const menuItems = [{
  title: "Điều hành",
  items: [{
    title: "Tổng quan",
    url: "/",
    icon: TrendingUp
  }, {
    title: "Giám sát bệnh",
    url: "/surveillance",
    icon: Microscope
  }, {
    title: "Cảnh báo",
    url: "/alerts",
    icon: Bell
  }, {
    title: "Bản đồ",
    url: "/maps",
    icon: MapPin
  }, {
    title: "Dự báo đột quỵ",
    url: "/stroke-risk",
    icon: Brain
  }]
}, {
  title: "Quản lý",
  items: [{
    title: "Bệnh nhân",
    url: "/patients",
    icon: UserCheck
  }, {
    title: "Lịch hẹn",
    url: "/appointments",
    icon: CalendarCheck
  }, {
    title: "Chiến dịch",
    url: "/campaigns",
    icon: Target
  }]
}, {
  title: "Cơ sở vật chất",
  items: [{
    title: "Cơ sở y tế",
    url: "/facilities",
    icon: Hospital
  }, {
    title: "Kho tồn",
    url: "/stocks",
    icon: Package
  }]
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const {
    prefetchByRoute
  } = usePrefetch();
  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };
  const handleMouseEnter = (url: string) => {
    prefetchByRoute(url);
  };
  return <Sidebar className={cn("border-r border-border/50 bg-card/95 backdrop-blur-sm transition-all duration-300", collapsed ? "w-16" : "w-64")} collapsible="icon">
      <SidebarContent className="px-2 py-4">
        {/* Logo */}
        <div className="mb-6 px-3">
          {collapsed ? <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <span className="text-primary-foreground font-bold text-lg">H</span>
            </div> : <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-secondary">
                <span className="text-primary-foreground font-bold text-lg">H</span>
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">HCMC Health</h2>
                <p className="text-xs text-muted-foreground">Giám sát y tế</p>
              </div>
            </div>}
        </div>

        {menuItems.map((group, groupIdx) => <SidebarGroup key={group.title} className="mb-2">
            {!collapsed && <SidebarGroupLabel className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-3 mb-1">
                {group.title}
              </SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item, idx) => <SidebarMenuItem key={item.title} className="animate-fade-up" style={{
              animationDelay: `${(groupIdx * 3 + idx) * 50}ms`
            }}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === '/'} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200", isActive(item.url) ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-accent")} onMouseEnter={() => handleMouseEnter(item.url)}>
                        <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0 transition-transform", isActive(item.url) && "scale-110")} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>)}
      </SidebarContent>
    </Sidebar>;
}