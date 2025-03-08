import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdsense() {
  const initialized = useRef(false);
  const scriptLoaded = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    // Function to load the AdSense script with retry logic
    const loadAdSenseScript = async () => {
      if (scriptLoaded.current || retryCount.current >= MAX_RETRIES) return;

      try {
        // Initialize adsbygoogle array if not already initialized
        if (typeof window.adsbygoogle === 'undefined') {
          window.adsbygoogle = [];
        }

        // Create and configure script element
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4808858357223212';
        script.crossOrigin = 'anonymous';
        
        // Create a promise to handle script loading
        await new Promise((resolve, reject) => {
          script.onload = () => {
            scriptLoaded.current = true;
            resolve(true);
          };

          script.onerror = (error) => {
            script.remove();
            reject(error);
          };

          // Remove any existing AdSense scripts
          const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
          if (existingScript) {
            existingScript.remove();
          }

          document.head.appendChild(script);
        });

        // Initialize ads after script loads successfully
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
          // Ignore push errors as they're usually non-critical
          console.warn('AdSense push warning:', error);
        }

      } catch (error) {
        retryCount.current++;
        console.warn(`AdSense script load attempt ${retryCount.current} failed:`, error);

        // Retry with exponential backoff
        if (retryCount.current < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount.current) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          await loadAdSenseScript();
        }
      }
    };

    // Initialize AdSense if not already done
    if (!initialized.current) {
      initialized.current = true;
      loadAdSenseScript().catch(error => {
        console.warn('Final AdSense initialization attempt failed:', error);
      });
    }

    // Cleanup function
    return () => {
      initialized.current = false;
      scriptLoaded.current = false;
      retryCount.current = 0;
    };
  }, []);

  // Component doesn't render anything
  return null;
}