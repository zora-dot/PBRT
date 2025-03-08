import React, { useEffect, useState } from 'react';
import { FileText, HardDrive } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface UsageStatsProps {
  dailyPastes: number;
  totalStorage: number;
}

export default function UsageStats({ dailyPastes, totalStorage }: UsageStatsProps) {
  const { isSupporter } = useSubscription();
  const { user } = useAuth();
  const [directCount, setDirectCount] = useState<number | null>(null);
  
  useEffect(() => {
    // Get direct count from database as a backup
    const getDirectCount = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.rpc(
          'get_daily_paste_count',
          { user_id_param: user.id }
        );
        
        if (!error && typeof data === 'number') {
          console.log('Direct count from DB:', data);
          setDirectCount(data);
        }
      } catch (err) {
        console.error('Error getting direct count:', err);
      }
    };
    
    getDirectCount();
  }, [user]);
  
  // Use direct count if available and dailyPastes is 0
  const displayCount = (dailyPastes === 0 && directCount !== null) ? directCount : dailyPastes;
  
  const maxDailyPastes = isSupporter ? 250 : 25; // 25 pastes for free users
  const maxStoragePerPaste = isSupporter ? 250 * 1024 : 50 * 1024; // 50KB for free users, 250KB for supporters
  const maxTotalStorage = maxDailyPastes * maxStoragePerPaste;

  const dailyPastePercentage = (displayCount / maxDailyPastes) * 100;
  const storagePercentage = (totalStorage / maxTotalStorage) * 100;

  return (
    <div className={`grid grid-cols-1 ${isSupporter ? 'md:grid-cols-2' : ''} gap-4`}>
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            <h3 className="font-medium text-gray-900">Daily Pastes</h3>
          </div>
          <span className="text-sm text-gray-500">
            {displayCount} / {maxDailyPastes}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${Math.min(dailyPastePercentage, 100)}%` }}
          />
        </div>
      </div>

      {isSupporter && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary-500" />
              <h3 className="font-medium text-gray-900">Storage Used</h3>
            </div>
            <span className="text-sm text-gray-500">
              {(totalStorage / 1024 / 1024).toFixed(2)}MB / {(maxTotalStorage / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}