import React, { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', 'G-BHMMG9ZJT0');
  }, []);

  return (
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-BHMMG9ZJT0" />
  );
}