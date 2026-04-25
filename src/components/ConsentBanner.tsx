import React, { useEffect } from 'react';
import { useConsentManager } from '@/hooks/useConsentManager';

/**
 * Silent consent component — auto-accepts all consent categories
 * when the user uses the platform (implicit consent via Terms of Service).
 * No visible UI. Legal basis documented in /legal page.
 */
const ConsentBanner: React.FC = () => {
  const { showBanner, acceptAll } = useConsentManager();

  useEffect(() => {
    if (showBanner) {
      // Auto-accept: usage of the platform implies consent
      // as documented in Terms of Service and Privacy Policy
      acceptAll();
    }
  }, [showBanner, acceptAll]);

  return null; // No visible UI
};

export default ConsentBanner;
