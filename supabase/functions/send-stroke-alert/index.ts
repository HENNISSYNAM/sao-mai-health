import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys for web push (public key can be shared)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

// Web Push utility functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendWebPush(subscription: any, payload: any) {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    console.error('Invalid subscription:', subscription);
    return { success: false, error: 'Invalid subscription' };
  }

  try {
    // For web push, we need to use the Web Push protocol
    // Since Deno doesn't have native web-push support, we'll use a simplified approach
    // In production, consider using a service like Firebase Cloud Messaging
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text());
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Push error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      subscriberId, 
      phone,
      title, 
      body, 
      riskLevel,
      riskScore,
      factors,
      sendToAll = false 
    } = await req.json();

    console.log('Send alert request:', { subscriberId, phone, title, riskLevel, sendToAll });

    // Build query to get subscribers
    let query = supabase
      .from('stroke_alert_subscribers')
      .select('*')
      .eq('is_active', true)
      .eq('notification_enabled', true)
      .not('push_subscription', 'is', null);

    if (subscriberId) {
      query = query.eq('id', subscriberId);
    } else if (phone) {
      query = query.eq('phone', phone);
    } else if (!sendToAll) {
      return new Response(
        JSON.stringify({ error: 'Must provide subscriberId, phone, or sendToAll=true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscribers, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscribers?.length || 0} subscribers to notify`);

    const results = [];
    const now = new Date().toISOString();

    for (const subscriber of subscribers || []) {
      if (!subscriber.push_subscription) continue;

      // Rate limit: don't send more than once per 5 minutes per subscriber
      if (subscriber.last_push_sent) {
        const lastSent = new Date(subscriber.last_push_sent);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (lastSent > fiveMinutesAgo) {
          console.log(`Skipping ${subscriber.phone} - rate limited`);
          continue;
        }
      }

      // Build notification payload
      const notificationPayload = {
        title: title || `⚠️ Cảnh báo nguy cơ đột quỵ ${riskLevel || 'CAO'}`,
        body: body || `Điểm nguy cơ: ${riskScore}/100. Hãy kiểm tra sức khỏe ngay!`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `stroke-alert-${Date.now()}`,
        requireInteraction: riskLevel === 'HIGH',
        data: {
          riskLevel,
          riskScore,
          factors,
          timestamp: now,
          subscriberId: subscriber.id
        }
      };

      const result = await sendWebPush(subscriber.push_subscription, notificationPayload);
      
      if (result.success) {
        // Update last push sent time
        await supabase
          .from('stroke_alert_subscribers')
          .update({ last_push_sent: now })
          .eq('id', subscriber.id);
      }

      results.push({
        subscriberId: subscriber.id,
        phone: subscriber.phone,
        ...result
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sent ${successCount}/${results.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-stroke-alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
