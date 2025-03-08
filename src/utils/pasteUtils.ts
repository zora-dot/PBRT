import { createClient } from '@supabase/supabase-js';
import { compressContent, decompressContent, isCompressed } from './compression';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const calculateExpirationDate = (expirationTime: string) => {
  const now = new Date();
  
  switch (expirationTime) {
    case '1hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '12hours':
      return new Date(now.getTime() + 12 * 60 * 60 * 1000);
    case '1day':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '5days':
      return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    case '10days':
      return new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    case '30days':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'never':
      return null;
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 1 day
  }
};

export const validatePasteSize = async (content: string, isSupporter: boolean) => {
  // Compress content first
  const compressedContent = await compressContent(content);
  
  // Calculate size of compressed content
  const encoder = new TextEncoder();
  const bytes = encoder.encode(compressedContent);
  const sizeInKB = bytes.length / 1024;
  
  // Set limits based on subscription
  const maxSize = isSupporter ? 250 : 50; // 50KB for free users, 250KB for supporters
  const maxStorage = isSupporter ? 5 * 1024 * 1024 : 100 * 1024; // 5GB for supporters, 100MB for free

  return {
    isValid: sizeInKB <= maxSize,
    compressedContent,
    sizeInKB,
    maxSize,
    maxStorage
  };
};

export async function getDailyUsageStats(userId: string) {
  try {
    // First try to use the database function for accurate count
    const { data: countData, error: countFunctionError } = await supabase.rpc(
      'get_daily_paste_count',
      { user_id_param: userId }
    );
    
    if (!countFunctionError && typeof countData === 'number') {
      console.log('Daily paste count from DB function:', countData);
      
      // Get total storage usage (using compressed content)
      const { data: pastes, error: pastesError } = await supabase
        .from('pastes')
        .select('content')
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (pastesError) {
        console.error('Error fetching pastes for storage calculation:', pastesError);
        return { dailyPastes: countData, totalStorage: 0 };
      }

      // Calculate total storage with compression
      const totalStorage = await pastes?.reduce(async (accPromise, paste) => {
        const acc = await accPromise;
        const content = isCompressed(paste.content) 
          ? paste.content 
          : await compressContent(paste.content);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);
        return acc + bytes.length;
      }, Promise.resolve(0)) || 0;

      return {
        dailyPastes: countData,
        totalStorage
      };
    }
    
    // Fallback to client-side calculation if the function fails
    console.log('Falling back to client-side calculation for daily pastes');
    
    // Get today's date at midnight in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date at midnight in local timezone
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Convert to ISO strings for database query
    const startOfDay = today.toISOString();
    const endOfDay = tomorrow.toISOString();

    // Direct count query with explicit conditions
    const { count: dailyPastes, error: countError } = await supabase
      .from('pastes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay)
      .is('deleted_at', null);

    if (countError) {
      console.error('Error counting daily pastes:', countError);
      
      // Last resort: just count all pastes for the user
      const { data: allPastes, error: allPastesError } = await supabase
        .from('pastes')
        .select('id, created_at')
        .eq('user_id', userId)
        .is('deleted_at', null);
        
      if (allPastesError) {
        console.error('Error fetching all pastes:', allPastesError);
        return { dailyPastes: 0, totalStorage: 0 };
      }
      
      // Filter pastes created today manually
      const todayStart = today.getTime();
      const todayEnd = tomorrow.getTime();
      const todayPastes = allPastes.filter(paste => {
        const pasteDate = new Date(paste.created_at).getTime();
        return pasteDate >= todayStart && pasteDate < todayEnd;
      });
      
      console.log('Manually filtered today pastes:', todayPastes.length);
      
      // Get total storage usage (using compressed content)
      const { data: pastes, error: pastesError } = await supabase
        .from('pastes')
        .select('content')
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (pastesError) {
        console.error('Error fetching pastes for storage calculation:', pastesError);
        return { dailyPastes: todayPastes.length, totalStorage: 0 };
      }

      // Calculate total storage with compression
      const totalStorage = await pastes?.reduce(async (accPromise, paste) => {
        const acc = await accPromise;
        const content = isCompressed(paste.content) 
          ? paste.content 
          : await compressContent(paste.content);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);
        return acc + bytes.length;
      }, Promise.resolve(0)) || 0;

      return {
        dailyPastes: todayPastes.length,
        totalStorage
      };
    }

    // Get total storage usage (using compressed content)
    const { data: pastes, error: pastesError } = await supabase
      .from('pastes')
      .select('content')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (pastesError) {
      console.error('Error fetching pastes for storage calculation:', pastesError);
      return { dailyPastes: dailyPastes || 0, totalStorage: 0 };
    }

    // Calculate total storage with compression
    const totalStorage = await pastes?.reduce(async (accPromise, paste) => {
      const acc = await accPromise;
      const content = isCompressed(paste.content) 
        ? paste.content 
        : await compressContent(paste.content);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      return acc + bytes.length;
    }, Promise.resolve(0)) || 0;

    return {
      dailyPastes: dailyPastes || 0,
      totalStorage
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      dailyPastes: 0,
      totalStorage: 0
    };
  }
}

export const getDailyPasteLimit = (isSupporter: boolean) => {
  return isSupporter ? 250 : 25; // 25 pastes for free users, 250 for supporters
};

// Helper function to check if a user has reached their daily paste limit
export async function hasReachedDailyLimit(userId: string, isSupporter: boolean) {
  const { dailyPastes } = await getDailyUsageStats(userId);
  const limit = getDailyPasteLimit(isSupporter);
  return dailyPastes >= limit;
}

// Helper function to check if a user has reached their storage limit
export async function hasReachedStorageLimit(userId: string, newContentSize: number, isSupporter: boolean) {
  const { totalStorage } = await getDailyUsageStats(userId);
  const maxStorageBytes = (isSupporter ? 5 * 1024 * 1024 * 1024 : 100 * 1024 * 1024); // 5GB or 100MB
  return (totalStorage + newContentSize) > maxStorageBytes;
}