import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  showSuccess?: boolean;
}

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.98 },
  disabled: { scale: 1, opacity: 0.7 }
};

const getButtonStyles = (variant: string, disabled: boolean, showSuccess: boolean) => {
  const baseStyles = 'px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  if (disabled) {
    return `${baseStyles} opacity-50 cursor-not-allowed bg-gray-300 text-gray-500`;
  }

  if (showSuccess) {
    return `${baseStyles} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`;
  }

  switch (variant) {
    case 'primary':
      return `${baseStyles} bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500`;
    case 'secondary':
      return `${baseStyles} bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500`;
    case 'danger':
      return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
    case 'success':
      return `${baseStyles} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`;
    default:
      return `${baseStyles} bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500`;
  }
};

export default function AnimatedButton({ 
  children, 
  variant = 'primary',
  disabled = false,
  className = '',
  showSuccess = false,
  ...props 
}: AnimatedButtonProps) {
  const [isSuccess, setIsSuccess] = useState(showSuccess);

  useEffect(() => {
    setIsSuccess(showSuccess);
    if (showSuccess) {
      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? "disabled" : "hover"}
      whileTap={disabled ? "disabled" : "tap"}
      className={`${getButtonStyles(variant, disabled, isSuccess)} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}