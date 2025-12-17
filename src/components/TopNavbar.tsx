import React, { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Command, 
  Wifi, 
  WifiOff, 
  Plus, 
  Upload, 
  CheckCircle,
  X,
  AlertCircle,
  Bell,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface RealtimeStatus {
  connected: boolean;
  lastHeartbeat?: number;
}

interface OfflineStatus {
  isOffline: boolean;
  pendingChanges: number;
}

export function TopNavbar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({ connected: false });
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({ isOffline: false, pendingChanges: 0 });
  const { suggestions, loading } = useSmartSearch(searchTerm);
  const queryClient = useQueryClient();

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

    const handleOnline = () => {
      setOfflineStatus(prev => ({ ...prev, isOffline: false }));
      checkConnection();
    };

    const handleOffline = () => {
      setOfflineStatus(prev => ({ ...prev, isOffline: true }));
      setRealtimeStatus({ connected: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOfflineStatus(prev => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleQuickAction = (action: string) => {
    setIsCommandOpen(false);
    
    switch (action) {
      case 'add-case':
        window.location.href = '/case-intake';
        break;
      case 'import-csv':
        toast.info("Đang mở import CSV...");
        break;
      case 'acknowledge-alerts':
        toast.success("Đã xác nhận tất cả cảnh báo");
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        break;
      case 'view-dashboard':
        window.location.href = '/';
        break;
      case 'add-appointment':
        window.location.href = '/appointments';
        break;
      default:
        break;
    }
  };

  const handleDismissOfflineBanner = () => {
    setOfflineStatus(prev => ({ ...prev, isOffline: false }));
  };

  return (
    <>
      {/* Offline Banner */}
      {offlineStatus.isOffline && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm text-warning font-medium">
                Đang offline – dữ liệu vẫn lưu tạm
                {offlineStatus.pendingChanges > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {offlineStatus.pendingChanges} chưa đồng bộ
                  </Badge>
                )}
              </span>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDismissOfflineBanner}
              className="h-6 w-6 p-0 text-warning hover:text-warning"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bệnh nhân, ca bệnh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-muted/30 border-0 focus:bg-card rounded-xl"
            />
            
            {searchTerm && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto animate-fade-up">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0 flex items-center justify-between group"
                    onClick={() => setSearchTerm('')}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-normal">
                        {suggestion.type}
                      </Badge>
                      <span className="text-sm font-medium">{suggestion.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Command Palette Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandOpen(true)}
              className="gap-2 rounded-xl border-border/50 bg-muted/30 hover:bg-muted/50"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline text-muted-foreground">Tìm lệnh</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                ⌘K
              </kbd>
            </Button>

            {/* Connection Status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              realtimeStatus.connected 
                ? "bg-success/10 text-success" 
                : "bg-muted text-muted-foreground"
            )}>
              {realtimeStatus.connected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                    2
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-xl">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Thông báo</span>
                  <Badge variant="secondary" className="text-xs">2 mới</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-3 hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-danger rounded-full mt-2 animate-pulse" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold">Cảnh báo SXH tăng đột biến</p>
                        <p className="text-xs text-muted-foreground">Tăng 150% tại Quận 1</p>
                        <p className="text-xs text-muted-foreground">5 phút trước</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-3 hover:bg-accent cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-warning rounded-full mt-2" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold">Vượt ngưỡng giường ICU</p>
                        <p className="text-xs text-muted-foreground">Công suất 95% tại BV Chợ Rẫy</p>
                        <p className="text-xs text-muted-foreground">12 phút trước</p>
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button variant="ghost" size="sm" className="w-full justify-center rounded-lg" onClick={() => window.location.href = '/alerts'}>
                    Xem tất cả cảnh báo
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Nhập lệnh hoặc tìm kiếm..." className="border-0" />
        <CommandList>
          <CommandEmpty>Không tìm thấy lệnh nào.</CommandEmpty>
          
          <CommandGroup heading="Thêm mới">
            <CommandItem onSelect={() => handleQuickAction('add-case')} className="gap-3 py-3">
              <Plus className="h-4 w-4 text-primary" />
              <span>Thêm ca bệnh mới</span>
              <kbd className="ml-auto text-xs bg-muted px-2 py-0.5 rounded">Ctrl+N</kbd>
            </CommandItem>
            <CommandItem onSelect={() => handleQuickAction('add-appointment')} className="gap-3 py-3">
              <Plus className="h-4 w-4 text-primary" />
              <span>Thêm lịch hẹn</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Import & Export">
            <CommandItem onSelect={() => handleQuickAction('import-csv')} className="gap-3 py-3">
              <Upload className="h-4 w-4 text-info" />
              <span>Import CSV</span>
              <kbd className="ml-auto text-xs bg-muted px-2 py-0.5 rounded">Ctrl+I</kbd>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Hành động nhanh">
            <CommandItem onSelect={() => handleQuickAction('acknowledge-alerts')} className="gap-3 py-3">
              <CheckCircle className="h-4 w-4 text-success" />
              <span>Xác nhận tất cả cảnh báo</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}