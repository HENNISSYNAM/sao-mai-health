import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle,
  Bell,
  Activity,
  ChevronRight,
  Heart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useUserAlerts } from "@/hooks/useUserAlerts";

interface RealtimeStatus {
  connected: boolean;
  lastHeartbeat?: number;
}

export function TopNavbar() {
  const { t, i18n } = useTranslation();
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({ connected: false });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('appointments').select('id').limit(1);
        setRealtimeStatus({ 
          connected: !error, 
          lastHeartbeat: Date.now() 
        });
      } catch {
        setRealtimeStatus({ connected: false });
      }
    };

    checkConnection();
    heartbeatInterval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, { 
      weekday: 'short',
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  const { alerts, unreadCount } = useUserAlerts();
  const isVi = i18n.language === 'vi';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="flex h-12 sm:h-14 items-center px-3 sm:px-4 gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:flex" />
        
        {/* Mobile: Brand */}
        <div className="flex items-center gap-1.5 md:hidden">
          <Heart className="h-4 w-4 text-primary animate-heartbeat" />
          <span className="font-bold text-sm tracking-tight">Sao Mai</span>
        </div>

        {/* Desktop: Live Status */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <div className={cn(
                "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                realtimeStatus.connected ? "bg-success animate-pulse" : "bg-destructive"
              )} />
            </div>
            <span className="text-[10px] font-bold text-foreground tracking-wider">LIVE</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="text-right">
            <p className="text-xs font-bold text-foreground font-mono tracking-tight leading-none">
              {formatTime(currentTime)}
            </p>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        {/* Mobile: Status dot */}
        <div className="flex md:hidden items-center gap-1 text-[10px] text-muted-foreground">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            realtimeStatus.connected ? "bg-success" : "bg-destructive"
          )} />
          <span>{realtimeStatus.connected ? (isVi ? 'Live' : 'Live') : 'Offline'}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 sm:gap-1.5">
          <LanguageSwitcher />
          <ThemeSwitcher />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-lg h-8 w-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 sm:w-80 rounded-xl p-0 overflow-hidden">
              <DropdownMenuLabel className="flex items-center justify-between p-2.5 bg-destructive/5 border-b border-destructive/10">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-semibold text-xs text-destructive">{isVi ? 'Cảnh báo' : 'Alerts'}</span>
                </div>
                {unreadCount > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground text-[9px] h-4 px-1.5">{unreadCount}</Badge>
                )}
              </DropdownMenuLabel>
              
              <div className="max-h-64 overflow-y-auto">
                {alerts && alerts.length > 0 ? (
                  alerts.slice(0, 5).map((alert: any, idx: number) => (
                    <div key={alert.id || idx} className="p-2.5 hover:bg-accent cursor-pointer transition-colors border-b border-border/50 group">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground line-clamp-1">{alert.title || alert.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{alert.location || alert.category}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center text-muted-foreground">
                    <Bell className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                    <p className="text-[11px]">{isVi ? 'Không có cảnh báo mới' : 'No new alerts'}</p>
                  </div>
                )}
              </div>

              <DropdownMenuSeparator className="m-0" />
              <div className="p-1.5 bg-muted/30">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-center rounded-lg text-[11px] font-medium text-primary hover:text-primary hover:bg-primary/10 h-7"
                  onClick={() => window.location.href = '/alerts'}
                >
                  {isVi ? 'Xem tất cả' : 'View all'}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}