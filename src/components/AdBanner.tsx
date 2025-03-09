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
      <div id={`ezoic-pub-ad-placeholder-${type === 'horizontal' ? '102' : '104'}`} className={`bg-white/10 rounded-lg overflow-hidden mx-auto ${
        type === 'horizontal' ? 'w-full max-w-[728px] h-[90px]' : 'w-[160px] h-[600px]'
      }`} />
    </div>
  );
}