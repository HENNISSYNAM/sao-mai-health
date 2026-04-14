import { useCallback, useRef } from 'react';
import { useConsentManager, ConsentCategory } from './useConsentManager';

interface TrackEvent {
  event: string;
  category: ConsentCategory;
  properties?: Record<string, unknown>;
}

/**
 * Hook chỉ thu thập dữ liệu khi người dùng đã đồng ý (consent-aware).
 * Tuân thủ GDPR & Luật An ninh mạng Việt Nam 2018.
 */
export const useConsentTracker = () => {
  const { hasConsent, consent } = useConsentManager();
  const queueRef = useRef<TrackEvent[]>([]);

  const track = useCallback((event: string, category: ConsentCategory, properties?: Record<string, unknown>) => {
    // Essential events always allowed
    if (category === 'essential' || hasConsent(category)) {
      const payload = {
        event,
        category,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          consent_version: consent.version,
        },
      };

      // Log to console in dev
      if (import.meta.env.DEV) {
        console.log('[ConsentTracker]', payload);
      }

      // TODO: Send to user_events table via dbService when ready
      return true;
    }

    // Not consented — silently skip
    return false;
  }, [hasConsent, consent.version]);

  const trackPageView = useCallback((page: string) => {
    return track('page_view', 'analytics', { page });
  }, [track]);

  const trackFeatureUse = useCallback((feature: string, details?: Record<string, unknown>) => {
    return track('feature_use', 'analytics', { feature, ...details });
  }, [track]);

  const trackHealthInteraction = useCallback((interaction: string, details?: Record<string, unknown>) => {
    return track('health_interaction', 'health_improvement', { interaction, ...details });
  }, [track]);

  return {
    track,
    trackPageView,
    trackFeatureUse,
    trackHealthInteraction,
    hasConsent,
  };
};
