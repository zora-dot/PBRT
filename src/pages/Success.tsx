import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { successAnimation } from '../utils/animations';

export default function Success() {
  const navigate = useNavigate();
  const { checkSubscriptionStatus } = useSubscription();

  useEffect(() => {
    const initializeSubscription = async () => {
      try {
        // Wait for subscription to be active
        await new Promise(resolve => setTimeout(resolve, 2000));
        await checkSubscriptionStatus();
        
        // Show success animation
        const container = document.querySelector('.success-container');
        if (container) {
          successAnimation(container as HTMLElement);
        }

        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    initializeSubscription();
  }, [checkSubscriptionStatus, navigate]);

  return (
    <>
      <Helmet>
        <title>Payment Successful - PasteBin Rich Text</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center success-container">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-green-500" />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Payment Successful!
            </motion.h1>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-2 text-primary-600 mb-4"
            >
              <Crown className="w-5 h-5" />
              <span className="font-medium">Welcome to Supporter Status</span>
            </motion.div>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 mb-6"
            >
              Your account has been upgraded successfully. You now have access to all supporter features!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="animate-pulse text-sm text-gray-500"
            >
              Redirecting to dashboard...
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}