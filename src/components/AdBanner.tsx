import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';

interface AdBannerProps {
  type: 'horizontal' | 'vertical';
  className?: string;
}

export default function AdBanner({ type, className = '' }: AdBannerProps) {
  const { isSupporter } = useSubscription();

  // Don't render ads for supporters
  if (isSupporter) {
    return null;
  }

  return (
    <div className={className}>
      <div className="text-center text-sm text-primary-200 mb-2">Advertisement</div>
      <div className={`bg-white/10 rounded-lg overflow-hidden mx-auto ${
        type === 'horizontal' ? 'w-full max-w-[728px] h-[90px]' : 'w-[160px] h-[600px]'
      }`}>
        <ins 
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-4808858357223212"
          data-ad-slot="7453835259"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}