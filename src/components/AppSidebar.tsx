import { useTranslation } from "react-i18next";
import {
  Activity, Brain, MapPin, AlertTriangle, BarChart3,
  Settings, FlaskConical, ClipboardPlus, Shield,
  Users, Package, CalendarDays, Radio, Building2,
  FileText, ChevronRight,
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

  const isMapRoute = currentPath === "/surveillance";

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

  // TIER 1 — Surveillance core (the reason B2G buys this)
  const coreItems: NavItem[] = [
    { titleKey: "nav.dashboard",    title: t("nav.dashboard", "Dashboard"),         url: "/dashboard",    icon: BarChart3     },
    { titleKey: "nav.surveillance", title: t("nav.surveillance", "Surveillance"),   url: "/surveillance", icon: Radio         },
    { titleKey: "nav.caseIntake",   title: t("nav.caseIntake", "Case Intake"),      url: "/case-intake",  icon: ClipboardPlus },
    { titleKey: "nav.alerts",       title: t("nav.alerts", "Alerts"),               url: "/alerts",       icon: AlertTriangle },
  ];

  // TIER 2 — Operations (supporting workflow)
  const opsItems: NavItem[] = [
    { titleKey: "nav.campaigns",    title: t("nav.campaigns", "Campaigns"),         url: "/campaigns",    icon: Shield        },
    { titleKey: "nav.facilities",   title: t("nav.facilities", "Facilities"),       url: "/facilities",   icon: Building2     },
    { titleKey: "nav.stocks",       title: t("nav.stocks", "Inventory"),            url: "/stocks",       icon: Package       },
    { titleKey: "nav.patients",     title: t("nav.patients", "Patients"),           url: "/patients",     icon: Users         },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return currentPath === "/dashboard" || currentPath === "/";
    return currentPath.startsWith(path);
  };

  const NavBtn = ({ item }: { item: NavItem }) => (
    <SidebarMenuItem key={item.titleKey}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
            collapsed ? "justify-center" : "justify-start",
            isActive(item.url)
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground font-normal hover:text-foreground hover:bg-accent"
          )}
          onMouseEnter={() => prefetchByRoute(item.url)}
        >
          <item.icon
            className={cn("h-[18px] w-[18px] flex-shrink-0 transition-transform duration-150",
              isActive(item.url) && "scale-110")}
            strokeWidth={isActive(item.url) ? 2.5 : 1.75}
          />
          {!collapsed && <span className="whitespace-nowrap overflow-hidden text-[13px]">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const SectionLabel = ({ label }: { label: string }) =>
    !collapsed ? (
      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
        {label}
      </p>
    ) : <div className="my-1 mx-3 border-t border-border/40" />;

  return (
    <Sidebar className="border-r border-border bg-background transition-all duration-300" collapsible="icon">
      <SidebarContent className="flex flex-col h-full py-4">

        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center justify-center px-3 mb-5">
          <div className="relative flex items-center justify-center flex-shrink-0">
            <img src={logoImg} alt="Sao Mai" className={cn("object-contain transition-all duration-300", collapsed ? "w-7 h-7" : "w-8 h-8")} />
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping opacity-20" />
          </div>
          {!collapsed && <span className="ml-2.5 text-[15px] font-bold tracking-tight whitespace-nowrap">Sao Mai Health</span>}
        </NavLink>

        {/* Surveillance */}
        <SectionLabel label="Surveillance" />
        <SidebarMenu className="flex flex-col gap-0.5 px-2">
          {coreItems.map(item => <NavBtn key={item.titleKey} item={item} />)}
        </SidebarMenu>

        {/* Operations */}
        <SectionLabel label="Operations" />
        <SidebarMenu className="flex flex-col gap-0.5 px-2">
          {opsItems.map(item => <NavBtn key={item.titleKey} item={item} />)}
        </SidebarMenu>

        {/* Tools — bottom dropdown */}
        <div className="px-2 mt-auto">
          <div className={cn("mb-1", !collapsed && "border-t border-border/40 pt-2")} />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-all duration-200",
                    collapsed ? "justify-center" : "justify-start"
                  )}>
                    <ChevronRight className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="whitespace-nowrap">More</span>}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-52 mb-2">
                  <DropdownMenuItem asChild>
                    <NavLink to="/research" className="flex items-center gap-3 cursor-pointer">
                      <FlaskConical className="h-4 w-4" /><span>{t("nav.research", "Research")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/lab-import" className="flex items-center gap-3 cursor-pointer">
                      <FileText className="h-4 w-4" /><span>{t("nav.labImport", "Lab Import")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/appointments" className="flex items-center gap-3 cursor-pointer">
                      <CalendarDays className="h-4 w-4" /><span>{t("nav.appointments", "Appointments")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/stroke-risk" className="flex items-center gap-3 cursor-pointer">
                      <Brain className="h-4 w-4" /><span>{t("nav.strokeRisk", "Stroke Risk")}</span>
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings" className="flex items-center gap-3 cursor-pointer">
                      <Settings className="h-4 w-4" /><span>{t("nav.settings", "Settings")}</span>
                    </NavLink>
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
