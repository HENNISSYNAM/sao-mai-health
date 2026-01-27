import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionInfo {
  sessionCode: string;
  twinId: string;
  expiresAt: string;
  remainingAccesses: number;
  permissionScope: string[];
  context?: {
    location?: { lat: number; lng: number };
    environment?: {
      temperature?: number;
      humidity?: number;
      aqi?: number;
    };
    deviceInfo?: {
      userAgent: string;
      platform: string;
    };
  };
}

interface QRData {
  code: string;
  type: string;
  version: number;
}

interface AccessLog {
  timestamp: string;
  sessionCode: string;
  twinId: string;
  action: string;
  context: SessionInfo['context'];
  success: boolean;
  reason?: string;
}

export const useTwinAccessAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  // Get device context
  const getDeviceContext = useCallback(async (): Promise<SessionInfo['context']> => {
    const context: SessionInfo['context'] = {
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform
      }
    };

    // Try to get location
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      
      context.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
    } catch (error) {
      console.log('[TWIN-ACCESS] Location unavailable:', error);
    }

    return context;
  }, []);

  // Create new access session
  const createSession = useCallback(async (
    twinId: string,
    permissionScope: string[] = ['location', 'healthSummary']
  ): Promise<{ session: SessionInfo; qrData: QRData } | null> => {
    setIsLoading(true);
    
    try {
      const context = await getDeviceContext();
      
      const { data, error } = await supabase.functions.invoke('twin-access-agent', {
        body: {
          action: 'activate',
          twinId,
          context,
          permissionScope
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      const session: SessionInfo = {
        sessionCode: data.session.sessionCode,
        twinId: data.session.twinId,
        expiresAt: data.session.expiresAt,
        remainingAccesses: data.session.remainingAccesses,
        permissionScope: data.session.permissionScope,
        context
      };

      setCurrentSession(session);
      console.log('[TWIN-ACCESS] Session created:', session.sessionCode);

      return {
        session,
        qrData: data.qrData
      };
    } catch (error) {
      console.error('[TWIN-ACCESS] Create session error:', error);
      toast.error('Không thể tạo phiên truy cập');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceContext]);

  // Validate session code
  const validateSession = useCallback(async (sessionCode: string): Promise<SessionInfo | null> => {
    setIsLoading(true);
    
    try {
      const context = await getDeviceContext();
      
      const { data, error } = await supabase.functions.invoke('twin-access-agent', {
        body: {
          action: 'validate',
          sessionCode,
          context
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        toast.error(data.reason || 'Mã không hợp lệ');
        return null;
      }

      const session: SessionInfo = {
        sessionCode,
        twinId: data.session.twinId,
        expiresAt: data.session.expiresAt,
        remainingAccesses: data.session.remainingAccesses,
        permissionScope: data.session.permissionScope
      };

      console.log('[TWIN-ACCESS] Session validated:', sessionCode);
      return session;
    } catch (error) {
      console.error('[TWIN-ACCESS] Validate error:', error);
      toast.error('Không thể xác thực phiên');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceContext]);

  // Activate session (for joining)
  const activateSession = useCallback(async (sessionCode: string): Promise<SessionInfo | null> => {
    setIsLoading(true);
    
    try {
      const context = await getDeviceContext();
      
      const { data, error } = await supabase.functions.invoke('twin-access-agent', {
        body: {
          action: 'activate',
          sessionCode,
          context
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        toast.error(data.error || 'Không thể kích hoạt phiên');
        return null;
      }

      const session: SessionInfo = {
        sessionCode,
        twinId: data.session.twinId,
        expiresAt: data.session.expiresAt,
        remainingAccesses: data.session.remainingAccesses,
        permissionScope: data.session.permissionScope,
        context: data.session.context
      };

      setCurrentSession(session);
      console.log('[TWIN-ACCESS] Session activated:', sessionCode);
      toast.success('Đã kích hoạt phiên truy cập!');

      return session;
    } catch (error) {
      console.error('[TWIN-ACCESS] Activate error:', error);
      toast.error('Không thể kích hoạt phiên');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getDeviceContext]);

  // Revoke session
  const revokeSession = useCallback(async (sessionCode: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('twin-access-agent', {
        body: {
          action: 'revoke',
          sessionCode
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        if (currentSession?.sessionCode === sessionCode) {
          setCurrentSession(null);
        }
        toast.success('Đã thu hồi phiên truy cập');
        console.log('[TWIN-ACCESS] Session revoked:', sessionCode);
      }

      return data.success;
    } catch (error) {
      console.error('[TWIN-ACCESS] Revoke error:', error);
      toast.error('Không thể thu hồi phiên');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  // Fetch access logs
  const fetchAccessLogs = useCallback(async (): Promise<AccessLog[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('twin-access-agent', {
        body: { action: 'log' }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setAccessLogs(data.logs);
        return data.logs;
      }

      return [];
    } catch (error) {
      console.error('[TWIN-ACCESS] Fetch logs error:', error);
      return [];
    }
  }, []);

  // Generate QR code data string
  const generateQRCodeData = useCallback((sessionCode: string): string => {
    // Simple format that doesn't contain any health data
    return JSON.stringify({
      code: sessionCode,
      type: 'TWIN_ACCESS',
      version: 1
    });
  }, []);

  // Calculate time remaining
  const getTimeRemaining = useCallback((expiresAt: string): { minutes: number; seconds: number } | null => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      return null;
    }

    return {
      minutes: Math.floor(diff / 60000),
      seconds: Math.floor((diff % 60000) / 1000)
    };
  }, []);

  return {
    isLoading,
    currentSession,
    accessLogs,
    createSession,
    validateSession,
    activateSession,
    revokeSession,
    fetchAccessLogs,
    generateQRCodeData,
    getTimeRemaining
  };
};
