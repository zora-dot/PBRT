import React from 'react';
import { Crown } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { motion } from 'framer-motion';

interface SupporterBadgeProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SupporterBadge({ 
  className = '', 
  showLabel = true,
  size = 'md'
}: SupporterBadgeProps) {
  const { isSupporter } = useSubscription();

  if (!isSupporter) return null;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1 
        ${sizeClasses[size]}
        bg-gradient-to-r from-green-400 to-green-500
        text-white rounded-full font-medium
        shadow-lg shadow-green-500/20
        transition-all duration-200
        ${className}
      `}
      title="Supporter"
    >
      <motion.div
        animate={{ 
          rotate: [-5, 5, -5],
          transition: { 
            repeat: Infinity, 
            duration: 2,
            ease: "easeInOut"
          }
        }}
      >
        <Crown className={iconSizes[size]} />
      </motion.div>
      {showLabel && <span>Supporter</span>}
    </motion.div>
  );
}