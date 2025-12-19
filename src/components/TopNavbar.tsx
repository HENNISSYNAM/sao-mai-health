import React, { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle,
  Bell,
  Activity,
  RefreshCw,
  Moon,
  Sun,
  ChevronRight,
  Heart
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

interface RealtimeStatus {
  connected: boolean;
  lastHeartbeat?: number;
}

export function TopNavbar() {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({ connected: false });
  const [isDark, setIsDark] = useState(false);
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

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long',
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="flex h-16 items-center px-4 gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        
        {/* Logo/Title for mobile */}
        <div className="flex items-center gap-3 lg:hidden">
          <Heart className="h-6 w-6 text-primary animate-heartbeat" />
          <span className="font-bold text-lg">Stroke Alert</span>
        </div>

        {/* Live Status */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-5 w-5 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
            </div>
            <span className="text-sm font-semibold text-foreground">LIVE</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-right">
            <p className="text-lg font-bold text-foreground font-mono tracking-tight">
              {formatTime(currentTime)}
            </p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
            realtimeStatus.connected 
              ? "bg-success/10 text-success border border-success/20" 
              : "bg-danger/10 text-danger border border-danger/20"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              realtimeStatus.connected ? "bg-success animate-pulse" : "bg-danger"
            )} />
            <span className="hidden sm:inline">
              {realtimeStatus.connected ? "Kết nối" : "Mất kết nối"}
            </span>
          </div>

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-border hover:bg-accent"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-xl border-border hover:bg-accent"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative rounded-xl border-border hover:bg-accent">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 rounded-2xl p-0 overflow-hidden">
              <DropdownMenuLabel className="flex items-center justify-between p-4 bg-danger/5 border-b border-danger/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                  <span className="font-bold text-danger">Cảnh báo khẩn cấp</span>
                </div>
                <Badge className="bg-danger text-danger-foreground">3 mới</Badge>
              </DropdownMenuLabel>
              
              <div className="max-h-96 overflow-y-auto">
                {/* Alert 1 - Critical */}
                <div className="p-4 hover:bg-accent cursor-pointer transition-colors border-b border-border group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-danger" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-danger text-danger-foreground text-[10px] px-1.5">CRITICAL</Badge>
                        <span className="text-[10px] text-muted-foreground">2 phút trước</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Áp suất giảm đột ngột</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quận 1, TP.HCM - Nguy cơ đột quỵ cao</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Alert 2 - High */}
                <div className="p-4 hover:bg-accent cursor-pointer transition-colors border-b border-border group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-secondary text-secondary-foreground text-[10px] px-1.5">HIGH</Badge>
                        <span className="text-[10px] text-muted-foreground">15 phút trước</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">AQI vượt ngưỡng an toàn</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ba Đình, Hà Nội - PM2.5: 156</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Alert 3 - Medium */}
                <div className="p-4 hover:bg-accent cursor-pointer transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                      <Bell className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5">MEDIUM</Badge>
                        <span className="text-[10px] text-muted-foreground">1 giờ trước</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Nhiệt độ tăng bất thường</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cầu Giấy, Hà Nội - 38°C</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="m-0" />
              <div className="p-3 bg-muted/30">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-center rounded-xl font-semibold text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => window.location.href = '/alerts'}
                >
                  Xem tất cả cảnh báo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
