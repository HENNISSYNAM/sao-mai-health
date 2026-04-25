import { useState, useEffect, useCallback } from 'react';

export type ConsentCategory = 'essential' | 'analytics' | 'health_improvement' | 'personalization';

export interface ConsentState {
  essential: boolean; // always true
  analytics: boolean;
  health_improvement: boolean;
  personalization: boolean;
  timestamp: string | null;
  version: string;
}

const CONSENT_KEY = 'smh_consent';
const CONSENT_VERSION = '1.0';

const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  health_improvement: false,
  personalization: false,
  timestamp: null,
  version: CONSENT_VERSION,
};

export const useConsentManager = () => {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed: ConsentState = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed);
          setShowBanner(false);
          return;
        }
      } catch { /* corrupted */ }
    }
    // No valid consent found — show banner
    setShowBanner(true);
  }, []);

  const acceptAll = useCallback(() => {
    const newConsent: ConsentState = {
      essential: true,
      analytics: true,
      health_improvement: true,
      personalization: true,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    const newConsent: ConsentState = {
      ...DEFAULT_CONSENT,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  }, []);

  const updateConsent = useCallback((categories: Partial<Omit<ConsentState, 'essential' | 'timestamp' | 'version'>>) => {
    const newConsent: ConsentState = {
      ...consent,
      ...categories,
      essential: true, // always true
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  }, [consent]);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(DEFAULT_CONSENT);
    setShowBanner(true);
  }, []);

  const hasConsent = useCallback((category: ConsentCategory) => {
    return consent[category] === true;
  }, [consent]);

  return {
    consent,
    showBanner,
    acceptAll,
    acceptEssentialOnly,
    updateConsent,
    resetConsent,
    hasConsent,
  };
};
