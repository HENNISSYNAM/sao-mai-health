import React from 'react';
import { Bell, BellRing, CheckCheck, Clock, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAlertsBell } from '@/hooks/useAlertsBell';
import { formatDistanceToNow } from 'date-fns';

const getSeverityIcon = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low':
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

export const AlertsBell: React.FC = () => {
  const { 
    alerts, 
    unreadCount, 
    isLoading, 
    markAllAsRead, 
    handleAlertClick 
  } = useAlertsBell();

  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-accent hover:text-accent-foreground"
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 overflow-y-auto bg-card border shadow-lg z-50"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between text-card-foreground">
          <span>Alerts</span>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs hover:bg-accent hover:text-accent-foreground"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <DropdownMenuItem
              key={alert.id}
              className={`cursor-pointer p-3 space-y-2 text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                alert.is_unread ? 'bg-accent/50' : ''
              }`}
              onClick={() => handleAlertClick(alert.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(alert.severity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium truncate">
                      {alert.title}
                    </h4>
                    {alert.is_unread && (
                      <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity}
                    </Badge>
                    
                    {alert.ward && (
                      <span className="truncate">
                        {alert.ward}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-sm text-primary hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onClick={() => window.location.href = '/alerts'}
            >
              View all alerts
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};