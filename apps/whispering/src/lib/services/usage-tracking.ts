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

      const { error } = await supabase.from('usage_logs').insert({
        user_id: user.id,
        duration_minutes: durationMinutes,
        estimated_cost: estimatedCost,
        file_name: fileName || 'Unknown',
        provider: provider
      });

      if (error) {
        console.error('Usage tracking failed:', error);
      } else {
        console.log(`✅ Usage tracked: ${durationMinutes.toFixed(2)} min, $${estimatedCost.toFixed(4)} (${provider})`);
      }
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