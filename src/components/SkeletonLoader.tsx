import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  className?: string;
}

export default function SkeletonLoader({ className = '' }: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <motion.div
        className="h-full w-full bg-gray-200 rounded"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}