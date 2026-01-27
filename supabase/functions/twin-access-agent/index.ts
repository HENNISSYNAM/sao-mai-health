import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwinAccessRequest {
  action: 'validate' | 'activate' | 'log' | 'revoke';
  sessionCode?: string;
  twinId?: string;
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
  permissionScope?: string[];
}

interface SessionData {
  sessionCode: string;
  twinId: string;
  createdAt: string;
  expiresAt: string;
  context: TwinAccessRequest['context'];
  permissionScope: string[];
  accessCount: number;
  isActive: boolean;
}

// In-memory session store (in production, use database)
const activeSessions = new Map<string, SessionData>();
const accessLogs: Array<{
  timestamp: string;
  sessionCode: string;
  twinId: string;
  action: string;
  context: TwinAccessRequest['context'];
  success: boolean;
  reason?: string;
}> = [];

// Session configuration
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ACCESS_COUNT = 50;

// Generate secure session code
function generateSecureCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 6; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

// Validate session
function validateSession(sessionCode: string): { valid: boolean; reason?: string; session?: SessionData } {
  const session = activeSessions.get(sessionCode);
  
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }
  
  if (!session.isActive) {
    return { valid: false, reason: 'Session has been revoked' };
  }
  
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  if (now > expiresAt) {
    session.isActive = false;
    return { valid: false, reason: 'Session has expired' };
  }
  
  if (session.accessCount >= MAX_ACCESS_COUNT) {
    session.isActive = false;
    return { valid: false, reason: 'Maximum access count exceeded' };
  }
  
  return { valid: true, session };
}

// Create new session
function createSession(twinId: string, context: TwinAccessRequest['context'], permissionScope: string[]): SessionData {
  const sessionCode = generateSecureCode();
  const now = new Date();
  
  const session: SessionData = {
    sessionCode,
    twinId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS).toISOString(),
    context,
    permissionScope: permissionScope || ['location', 'healthSummary'],
    accessCount: 0,
    isActive: true
  };
  
  activeSessions.set(sessionCode, session);
  
  // Log session creation
  logAccess(sessionCode, twinId, 'session_created', context, true);
  
  return session;
}

// Log access event
function logAccess(
  sessionCode: string,
  twinId: string,
  action: string,
  context: TwinAccessRequest['context'],
  success: boolean,
  reason?: string
) {
  accessLogs.push({
    timestamp: new Date().toISOString(),
    sessionCode,
    twinId,
    action,
    context,
    success,
    reason
  });
  
  // Keep only last 1000 logs
  if (accessLogs.length > 1000) {
    accessLogs.shift();
  }
  
  console.log(`[ACCESS LOG] ${action} | Session: ${sessionCode} | Twin: ${twinId} | Success: ${success}${reason ? ` | Reason: ${reason}` : ''}`);
}

// Activate session (increment access count, attach context)
function activateSession(sessionCode: string, context: TwinAccessRequest['context']): { 
  success: boolean; 
  session?: SessionData; 
  reason?: string 
} {
  const validation = validateSession(sessionCode);
  
  if (!validation.valid) {
    logAccess(sessionCode, '', 'activation_failed', context, false, validation.reason);
    return { success: false, reason: validation.reason };
  }
  
  const session = validation.session!;
  session.accessCount++;
  
  // Merge context
  if (context) {
    session.context = {
      ...session.context,
      ...context,
      location: context.location || session.context?.location
    };
  }
  
  logAccess(sessionCode, session.twinId, 'session_activated', context, true);
  
  return { success: true, session };
}

// Revoke session
function revokeSession(sessionCode: string): boolean {
  const session = activeSessions.get(sessionCode);
  
  if (!session) {
    return false;
  }
  
  session.isActive = false;
  logAccess(sessionCode, session.twinId, 'session_revoked', session.context, true);
  
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionCode, twinId, context, permissionScope } = await req.json() as TwinAccessRequest;
    
    console.log(`[TWIN-ACCESS-AGENT] Action: ${action}, Session: ${sessionCode || 'N/A'}, Twin: ${twinId || 'N/A'}`);

    switch (action) {
      case 'validate': {
        if (!sessionCode) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session code required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const validation = validateSession(sessionCode);
        
        // Log validation attempt
        logAccess(sessionCode, validation.session?.twinId || '', 'validation_check', context, validation.valid, validation.reason);
        
        return new Response(
          JSON.stringify({
            success: validation.valid,
            session: validation.valid ? {
              twinId: validation.session!.twinId,
              expiresAt: validation.session!.expiresAt,
              remainingAccesses: MAX_ACCESS_COUNT - validation.session!.accessCount,
              permissionScope: validation.session!.permissionScope
            } : null,
            reason: validation.reason
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'activate': {
        if (!sessionCode) {
          // Create new session
          if (!twinId) {
            return new Response(
              JSON.stringify({ success: false, error: 'Twin ID required for new session' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const session = createSession(twinId, context, permissionScope || []);
          
          return new Response(
            JSON.stringify({
              success: true,
              session: {
                sessionCode: session.sessionCode,
                twinId: session.twinId,
                expiresAt: session.expiresAt,
                permissionScope: session.permissionScope,
                remainingAccesses: MAX_ACCESS_COUNT
              },
              qrData: {
                // QR code should only contain session code, not health data
                code: session.sessionCode,
                type: 'TWIN_ACCESS',
                version: 1
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Activate existing session
        const result = activateSession(sessionCode, context);
        
        if (!result.success) {
          return new Response(
            JSON.stringify({ success: false, error: result.reason }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            session: {
              twinId: result.session!.twinId,
              expiresAt: result.session!.expiresAt,
              remainingAccesses: MAX_ACCESS_COUNT - result.session!.accessCount,
              permissionScope: result.session!.permissionScope,
              context: result.session!.context
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'log': {
        // Return recent access logs (admin function)
        const recentLogs = accessLogs.slice(-100).reverse();
        
        return new Response(
          JSON.stringify({
            success: true,
            logs: recentLogs,
            totalSessions: activeSessions.size,
            activeSessions: Array.from(activeSessions.values()).filter(s => s.isActive).length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke': {
        if (!sessionCode) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session code required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const revoked = revokeSession(sessionCode);
        
        return new Response(
          JSON.stringify({
            success: revoked,
            message: revoked ? 'Session revoked successfully' : 'Session not found'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[TWIN-ACCESS-AGENT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
