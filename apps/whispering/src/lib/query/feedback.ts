import { supabase } from '$lib/services/auth/supabase-client';
import { Err, Ok } from 'wellcrafted/result';

import { defineMutation } from './_client';

export type FeedbackType = 'bug' | 'feature_request' | 'issue';

export type CreateFeedbackInput = {
  type: FeedbackType;
  message: string;
  name?: string;
};

export const feedback = {
  mutations: {
    submitFeedback: defineMutation({
      mutationKey: ['feedback', 'submit'] as const,
      resultMutationFn: async ({ type, message, name }: CreateFeedbackInput) => {
        try {
          // Get current user from Supabase auth
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            return Err({ message: 'Failed to get user information', cause: userError });
          }

          // If no user, still allow anonymous feedback but require email in form
          const userEmail = user?.email;
          const userId = user?.id;

          const { error } = await supabase.from('feedback').insert({
            type,
            message,
            name: name || 'Anonymous',
            email: userEmail || 'anonymous@noteflux.app', // Fallback for anonymous users
            user_id: userId,
            status: 'open',
            priority: 'medium'
          });

          if (error) {
            return Err({ message: 'Failed to submit feedback', cause: error });
          }

          return Ok({ success: true });
        } catch (error) {
          return Err({ message: 'Unexpected error occurred', cause: error });
        }
      },
    }),
  },
};

/**
 * Get feedback type display labels
 */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  issue: 'General Issue'
};

/**
 * Get feedback type descriptions
 */
export const FEEDBACK_TYPE_DESCRIPTIONS: Record<FeedbackType, string> = {
  bug: 'Report a problem or error',
  feature_request: 'Suggest a new feature',
  issue: 'General feedback or question'
};