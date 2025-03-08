import { useEffect } from 'react';
import { initPropellerAds, initInappRedirect } from '../utils/propellerAds';

export default function PropellerAdsInit() {
  useEffect(() => {
    // Initialize PropellerAds
    initPropellerAds();

    // Initialize in-app redirect
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initInappRedirect);
    } else {
      initInappRedirect();
    }
  }, []);

  return null;
}