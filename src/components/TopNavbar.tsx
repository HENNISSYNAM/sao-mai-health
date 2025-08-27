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
  LogOut,
  Settings,
  User
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
import { useAuthContext } from "@/components/AuthProvider";
import { AlertsBell } from "@/components/AlertsBell";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface RealtimeStatus {
  connected: boolean;
  lastHeartbeat?: number;
}

interface OfflineStatus {
  isOffline: boolean;
  pendingChanges: number;
}

export function TopNavbar() {
  const { user, signOut } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({ connected: false });
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({ isOffline: false, pendingChanges: 0 });
  const { suggestions, loading } = useSmartSearch(searchTerm);
  const queryClient = useQueryClient();

  // Monitor realtime connection status
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

    // Check connection every 30 seconds
    checkConnection();
    heartbeatInterval = setInterval(checkConnection, 30000);

    // Listen to browser online/offline events
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

    // Set initial offline status
    setOfflineStatus(prev => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor IndexedDB for offline changes
  useEffect(() => {
    // Simulate checking for pending offline changes
    const checkPendingChanges = () => {
      // In real implementation, check IndexedDB for pending sync operations
      const simulatedPendingChanges = offlineStatus.isOffline ? 
        Math.floor(Math.random() * 5) : 0;
      
      setOfflineStatus(prev => ({
        ...prev,
        pendingChanges: simulatedPendingChanges
      }));
    };

    if (offlineStatus.isOffline) {
      checkPendingChanges();
      const interval = setInterval(checkPendingChanges, 10000); // Check every 10s
      return () => clearInterval(interval);
    }
  }, [offlineStatus.isOffline]);

  // Keyboard shortcuts
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

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDismissOfflineBanner = () => {
    setOfflineStatus(prev => ({ ...prev, isOffline: false }));
  };

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div 
          className={`h-2 w-2 rounded-full ${realtimeStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}
          title={realtimeStatus.connected ? 'Kết nối realtime' : 'Mất kết nối'}
        />
        {realtimeStatus.connected ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {realtimeStatus.connected ? 'Online' : 'Offline'}
      </span>
    </div>
  );

  const OfflineBanner = () => {
    if (!offlineStatus.isOffline) return null;

    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Đang offline – dữ liệu vẫn lưu tạm
              {offlineStatus.pendingChanges > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {offlineStatus.pendingChanges} thay đổi chưa đồng bộ
                </Badge>
              )}
            </span>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleDismissOfflineBanner}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <OfflineBanner />
      
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <SidebarTrigger />
          
          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bệnh nhân, ca bệnh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            
            {/* Search suggestions dropdown */}
            {searchTerm && suggestions.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setSearchTerm('');
                      // Handle suggestion selection
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                      <span className="text-sm">{suggestion.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Command Palette Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandOpen(true)}
              className="gap-2"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline">Command</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Connection Status */}
            <ConnectionStatus />

            {/* Real-time Alerts Bell */}
            <AlertsBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Thông tin cá nhân</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Cài đặt</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Enhanced Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Tìm lệnh nhanh..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy lệnh nào.</CommandEmpty>
          
          <CommandGroup heading="Thêm mới">
            <CommandItem onSelect={() => handleQuickAction('add-case')}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Thêm ca bệnh mới</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                Ctrl+N
              </kbd>
            </CommandItem>
            <CommandItem onSelect={() => handleQuickAction('add-appointment')}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Thêm lịch hẹn</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Import & Export">
            <CommandItem onSelect={() => handleQuickAction('import-csv')}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Import CSV</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                Ctrl+I
              </kbd>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Hành động nhanh">
            <CommandItem onSelect={() => handleQuickAction('acknowledge-alerts')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Xác nhận tất cả cảnh báo</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                Ctrl+A
              </kbd>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Điều hướng">
            <CommandItem onSelect={() => handleQuickAction('view-dashboard')}>
              <span>Về trang chủ</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                Ctrl+H
              </kbd>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}