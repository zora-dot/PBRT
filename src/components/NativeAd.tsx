import { useEffect } from 'react';

export default function NativeAd() {
  useEffect(() => {
    // Create and append the script
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = '//pl26061373.effectiveratecpm.com/0e31a249649c069612d5a7e46fedbfe4/invoke.js';
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-4">
      <div id="container-0e31a249649c069612d5a7e46fedbfe4"></div>
    </div>
  );
}