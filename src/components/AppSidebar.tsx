import { useTranslation } from "react-i18next";
import {
  Activity, Brain, MapPin, AlertTriangle, BarChart3,
  Settings, HelpCircle, Menu, FlaskConical, ClipboardPlus,
  Users, Package, CalendarDays, Radio, Shield, Boxes,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { NavLink, useLocation } from "react-router-dom";
import { usePrefetch } from "@/hooks/usePrefetch";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";

interface NavItem {
  titleKey: string;
  title: string;
  url: string;
  icon: React.ElementType;
}

export function AppSidebar() {
  const { t } = useTranslation();
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { prefetchByRoute } = usePrefetch();
  const [isHovering, setIsHovering] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpen(false);
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  }, []);

  const isMapRoute = currentPath === "/maps" || currentPath === "/surveillance";

  useEffect(() => {
    if (isMapRoute) { setOpen(false); setIsHovering(false); return; }

    const handlePointerMove = (e: PointerEvent) => {
      const threshold = isHovering ? 272 : 64;
      const inZone = e.clientX <= threshold && e.clientY > 0;
      if (inZone && !isHovering) {
        if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
        setIsHovering(true); setOpen(true);
      } else if (!inZone && isHovering) {
        if (!leaveTimer.current) {
          leaveTimer.current = setTimeout(() => {
            setIsHovering(false); setOpen(false); leaveTimer.current = null;
          }, 300);
        }
      }
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [isHovering, setOpen, isMapRoute]);

  // --- PRIMARY nav: core B2G workflow ---
  const primaryItems: NavItem[] = [
    { titleKey: "nav.dashboard",    title: t("nav.dashboard"),              url: "/dashboard",    icon: BarChart3     },
    { titleKey: "nav.surveillance", title: t("nav.surveillance", "Giám sát dịch"), url: "/surveillance", icon: Radio       },
    { titleKey: "nav.caseIntake",   title: t("nav.caseIntake", "Nhập ca bệnh"),    url: "/case-intake",  icon: ClipboardPlus },
    { titleKey: "nav.alerts",       title: t("nav.alerts", "Cảnh báo"),            url: "/alerts",       icon: AlertTriangle },
  ];

  // --- SECONDARY nav: clinical / tools ---
  const secondaryItems: NavItem[] = [
    { titleKey: "nav.patients",     title: t("nav.patients", "Bệnh nhân"),    url: "/patients",     icon: Users         },
    { titleKey: "nav.appointments", title: t("nav.appointments", "Lịch hẹn"), url: "/appointments", icon: CalendarDays  },
    { titleKey: "nav.strokeRisk",   title: t("nav.strokeRisk"),               url: "/stroke-risk",  icon: Brain         },
    { titleKey: "nav.maps",         title: t("nav.maps"),                     url: "/maps",         icon: MapPin        },
    { titleKey: "nav.stocks",       title: t("nav.stocks", "Kho vật tư"),      url: "/stocks",       icon: Package       },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard" || currentPath === "/";
    return currentPath.startsWith(path);
  };

  const NavItemButton = ({ item }: { item: NavItem }) => (
    <SidebarMenuItem key={item.titleKey}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center gap-4 px-3 py-3 rounded-xl text-sm transition-all duration-200",
            collapsed ? "justify-center" : "justify-start",
            isActive(item.url)
              ? "bg-primary text-primary-foreground font-semibold shadow-md"
              : "font-normal hover:bg-accent"
          )}
          onMouseEnter={() => prefetchByRoute(item.url)}
        >
          <item.icon
            className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200", isActive(item.url) && "scale-110")}
            strokeWidth={isActive(item.url) ? 2.5 : 1.5}
          />
          {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-border bg-background transition-all duration-300" collapsible="icon">
      <SidebarContent className="flex flex-col h-full py-4">
        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center justify-center px-3 mb-6">
          <div className="relative flex items-center justify-center">
            <img
              src={logoImg}
              alt="Sao Mai Health"
              className={cn("object-contain animate-heartbeat transition-all duration-300", collapsed ? "w-8 h-8" : "w-9 h-9")}
            />
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
          </div>
          {!collapsed && <span className="ml-3 text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden">SAO MAI HEALTH</span>}
        </NavLink>

        {/* Primary nav */}
        <SidebarMenu className="flex flex-col gap-1 px-2">
          {primaryItems.map(item => <NavItemButton key={item.titleKey} item={item} />)}
        </SidebarMenu>

        {/* Divider + secondary nav */}
        {!collapsed && (
          <div className="mx-3 my-2 border-t border-border/50" />
        )}
        <SidebarMenu className="flex flex-col gap-1 px-2">
          {secondaryItems.map(item => <NavItemButton key={item.titleKey} item={item} />)}
        </SidebarMenu>

        {/* Bottom: more menu */}
        <div className="px-2 mt-auto">
          {!collapsed && <div className="border-t border-border/50 mb-2" />}
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-4 px-3 py-3 rounded-xl text-sm font-normal hover:bg-accent w-full transition-all duration-200",
                    collapsed ? "justify-center" : "justify-start"
                  )}>
                    <Menu className="h-5 w-5 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span className="whitespace-nowrap">{t("common.more", "Thêm")}</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                  <DropdownMenuItem asChild>
                    <NavLink to="/research" className="flex items-center gap-3 cursor-pointer">
                      <FlaskConical className="h-4 w-4" />
                      <span>{t("nav.research", "Nghiên cứu")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/campaigns" className="flex items-center gap-3 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      <span>{t("nav.campaigns", "Chiến dịch")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings" className="flex items-center gap-3 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      <span>{t("nav.settings")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/help" className="flex items-center gap-3 cursor-pointer">
                      <HelpCircle className="h-4 w-4" />
                      <span>{t("common.info", "Thông tin")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-3 cursor-pointer">
                    <Activity className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-semibold">Cấp cứu: 115</span>
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
