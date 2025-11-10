import { supabase } from './auth/supabase-client';

export type UsageTrackingError = {
  message: string;
  cause?: unknown;
};

export type UsageLogEntry = {
  durationMinutes: number;
  estimatedCost: number;
  fileName?: string;
  provider: string;
};

/**
 * Tracks usage for transcription services that charge by duration
 * Currently supports Groq Whisper API pricing ($0.03/hour)
 */
export async function trackUsage({
  durationMinutes,
  fileName,
  provider = 'Groq'
}: UsageLogEntry): Promise<void> {
  const estimatedCost = calculateCost(durationMinutes, provider);
  
  // Fire-and-forget - don't block transcription
  setTimeout(async () => {
    try {
      // Get current user from Supabase auth directly
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('Usage tracking skipped: user not authenticated');
        return;
      }

      // Insert usage log
      const { error: logError } = await supabase.from('usage_logs').insert({
        user_id: user.id,
        duration_minutes: durationMinutes,
        estimated_cost: estimatedCost,
        file_name: fileName || 'Unknown',
        provider: provider
      });

      if (logError) {
        console.error('Usage tracking failed:', logError);
        return;
      }

      // Update total usage limit table
      // Check if user record exists
      const { data: existingRecord } = await supabase
        .from('total_usage_limit')
        .select('total_minutes')
        .eq('user_id', user.id)
        .single();

      if (existingRecord) {
        // Update existing record - increment total_minutes
        const newTotal = existingRecord.total_minutes + durationMinutes;
        const { error: updateError } = await supabase
          .from('total_usage_limit')
          .update({ 
            total_minutes: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Failed to update usage limit:', updateError);
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase.from('total_usage_limit').insert({
          user_id: user.id,
          email: user.email || 'unknown',
          total_minutes: durationMinutes,
          limit_minutes: 2000
        });

        if (insertError) {
          console.error('Failed to create usage limit record:', insertError);
        }
      }

      console.log(`✅ Usage tracked: ${durationMinutes.toFixed(2)} min, $${estimatedCost.toFixed(4)} (${provider})`);
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }, 0);
}

/**
 * Calculate estimated cost based on provider and duration
 */
function calculateCost(durationMinutes: number, provider: string): number {
  switch (provider) {
    case 'Groq':
      // Groq Whisper pricing: $0.03/hour = $0.0005/minute
      return durationMinutes * 0.0005;
    case 'OpenAI':
      // OpenAI Whisper pricing: $0.006/minute
      return durationMinutes * 0.006;
    case 'Deepgram':
      // Deepgram varies, using average estimate
      return durationMinutes * 0.0025;
    default:
      // Default to Groq pricing
      return durationMinutes * 0.0005;
  }
}

/**
 * Get audio duration from a blob using HTML5 Audio API
 * This is the most reliable and lightweight method
 */
export async function getAudioDurationFromBlob(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      // Create object URL from blob
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        // Clean up object URL
        URL.revokeObjectURL(objectUrl);
        // Return duration in minutes
        resolve(audio.duration / 60);
      });
      
      audio.addEventListener('error', (error) => {
        // Clean up object URL
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load audio metadata: ${error}`));
      });
      
      // Trigger metadata loading
      audio.load();
    } catch (error) {
      reject(new Error(`Failed to create audio element: ${error}`));
    }
  });
}

/**
 * Get audio duration from a file path (for saved files)
 * Falls back to blob duration if file path doesn't work
 */
export async function getAudioDurationFromFile(filePath: string, fallbackBlob?: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(filePath);
      
      audio.addEventListener('loadedmetadata', () => {
        // Return duration in minutes
        resolve(audio.duration / 60);
      });
      
      audio.addEventListener('error', async (error) => {
        console.warn('File path duration failed, trying blob fallback:', error);
        
        // Try fallback blob if provided
        if (fallbackBlob) {
          try {
            const duration = await getAudioDurationFromBlob(fallbackBlob);
            resolve(duration);
          } catch (blobError) {
            reject(new Error(`Both file path and blob duration failed: ${error}, ${blobError}`));
          }
        } else {
          reject(new Error(`Failed to get duration from file path: ${error}`));
        }
      });
      
      // Trigger metadata loading
      audio.load();
    } catch (error) {
      reject(new Error(`Failed to create audio element from file: ${error}`));
    }
  });
}

/**
 * Check if user has exceeded their usage limit OR is manually blocked
 * Returns null if not authenticated, or object with limit info
 */
export async function checkUsageLimitAndBlockStatus(): Promise<{
  isOverLimit: boolean;
  isBlocked: boolean;
  totalMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
} | null> {
  try {
    // Get current user from Supabase auth directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get user's current usage AND block status from total_usage_limit table
    const { data: usageData, error: usageError } = await supabase
      .from('total_usage_limit')
      .select('total_minutes, limit_minutes, is_blocked, needs_frequent_checks')
      .eq('user_id', user.id)
      .single();

    if (usageError || !usageData) {
      // User doesn't have a record yet, they haven't used any minutes
      return {
        isOverLimit: false,
        isBlocked: false,
        totalMinutes: 0,
        limitMinutes: 2000,
        remainingMinutes: 2000
      };
    }

    const { total_minutes, limit_minutes, is_blocked, needs_frequent_checks } = usageData;
    const remainingMinutes = Math.max(0, limit_minutes - total_minutes);
    const isOverLimit = total_minutes >= limit_minutes;

    // If over limit, always ensure both flags are set
    if (isOverLimit) {
      // Only update if not already set to avoid unnecessary DB writes
      if (!is_blocked || !needs_frequent_checks) {
        await supabase
          .from('total_usage_limit')
          .update({ 
            is_blocked: true,
            needs_frequent_checks: true
          })
          .eq('user_id', user.id);
      }
    }

    // If admin unblocked user (is_blocked = false) but still has frequent checks, reset it
    if (!is_blocked && needs_frequent_checks) {
      await supabase
        .from('total_usage_limit')
        .update({ needs_frequent_checks: false })
        .eq('user_id', user.id);
    }

    return {
      isOverLimit,
      isBlocked: is_blocked || false,
      totalMinutes: total_minutes,
      limitMinutes: limit_minutes,
      remainingMinutes
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return null;
  }
}

/**
 * Check if user has exceeded their usage limit
 * Returns null if not authenticated, or object with limit info
 */
export async function checkUsageLimit(): Promise<{
  isOverLimit: boolean;
  totalMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
} | null> {
  try {
    // Get current user from Supabase auth directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    // Get user's current usage from total_usage_limit table
    const { data: usageData, error: usageError } = await supabase
      .from('total_usage_limit')
      .select('total_minutes, limit_minutes')
      .eq('user_id', user.id)
      .single();

    if (usageError || !usageData) {
      // User doesn't have a record yet, they haven't used any minutes
      return {
        isOverLimit: false,
        totalMinutes: 0,
        limitMinutes: 2000,
        remainingMinutes: 2000
      };
    }

    const { total_minutes, limit_minutes } = usageData;
    const remainingMinutes = Math.max(0, limit_minutes - total_minutes);
    const isOverLimit = total_minutes >= limit_minutes;

    return {
      isOverLimit,
      totalMinutes: total_minutes,
      limitMinutes: limit_minutes,
      remainingMinutes
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return null;
  }
}

/**
 * Get user's usage summary (for dashboard/billing)
 */
export async function getUserUsageSummary(timeframe: 'day' | 'week' | 'month' = 'month') {
  try {
    // Get current user from Supabase auth directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }

    const startDate = new Date();
    switch (timeframe) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('usage_logs')
      .select('duration_minutes, estimated_cost, provider, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get usage summary:', error);
      return null;
    }

    const totalMinutes = data.reduce((sum, log) => sum + log.duration_minutes, 0);
    const totalCost = data.reduce((sum, log) => sum + log.estimated_cost, 0);
    const recordingCount = data.length;

    return {
      totalMinutes,
      totalCost,
      recordingCount,
      timeframe,
      logs: data
    };
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return null;
  }
}