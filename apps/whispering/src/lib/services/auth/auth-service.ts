import { supabase } from './supabase-client';
import type { User, Session } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type AuthState = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
};

class AuthService {
  private authState: AuthState = {
    user: null,
    session: null,
    loading: true,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.initializeAuth();
    this.initializeDeepLinks();
  }

  private async initializeAuth() {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }

      this.updateAuthState({ 
        session, 
        user: session?.user ? this.mapUser(session.user) : null,
        loading: false 
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        this.updateAuthState({
          session,
          user: session?.user ? this.mapUser(session.user) : null,
          loading: false,
        });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.updateAuthState({ user: null, session: null, loading: false });
    }
  }

  // Initialize deep link handling
  private async initializeDeepLinks() {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
        
        await onOpenUrl((urls) => {
          console.log('Deep link received:', urls);
          
          for (const url of urls) {
            if (url.startsWith('noteflux://auth/callback')) {
              this.handleAuthCallback(url);
              break;
            }
          }
        });
        
        console.log('Deep link listener initialized');
      } catch (error) {
        console.error('Failed to initialize deep links:', error);
      }
    }
  }

  private mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email,
    };
  }

  private updateAuthState(updates: Partial<AuthState>) {
    this.authState = { ...this.authState, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (state: AuthState) => void) {
    this.listeners.push(callback);
    
    // Immediately call with current state
    callback(this.authState);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.authState.session;
  }

  // Sign in by opening browser to web app
  async signIn() {
    console.log('🔑 AuthService.signIn() called');
    try {
      // Add redirect parameter for desktop app
      const redirectTo = 'noteflux://auth/callback';
      const signInUrl = `https://noteflux.app/sign-in?redirect_to=${encodeURIComponent(redirectTo)}`;
      
      console.log('🌐 Opening browser for sign in:', signInUrl);
      console.log('🚀 Is Tauri environment:', !!(window as any).__TAURI_INTERNALS__);
      
      // Check if we're in Tauri environment
      if ((window as any).__TAURI_INTERNALS__) {
        // Use Tauri opener
        console.log('📱 Using Tauri opener...');
        try {
          const openerModule = await import('@tauri-apps/plugin-opener');
          console.log('📦 Opener module imported:', Object.keys(openerModule));
          
          if (openerModule.openUrl) {
            console.log('✅ Using openUrl function');
            await openerModule.openUrl(signInUrl);
            console.log('🎉 Browser opened successfully with openUrl');
          } else {
            console.error('❌ openUrl function not found in opener module');
            throw new Error('openUrl function not available');
          }
        } catch (importError) {
          console.error('💥 Error importing opener module:', importError);
          throw importError;
        }
      } else {
        // Use web browser API
        console.log('🌐 Using window.open (web environment)');
        window.open(signInUrl, '_blank');
        console.log('✅ window.open completed');
      }
    } catch (error) {
      console.error('💥 Error in signIn:', error);
      throw new Error('Failed to open sign in page: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // Sign up by opening browser to web app
  async signUp() {
    console.log('🔑 AuthService.signUp() called');
    try {
      // Add redirect parameter for desktop app
      const redirectTo = 'noteflux://auth/callback';
      const signUpUrl = `https://noteflux.app/sign-up?redirect_to=${encodeURIComponent(redirectTo)}`;
      
      console.log('🌐 Opening browser for sign up:', signUpUrl);
      console.log('🚀 Is Tauri environment:', !!(window as any).__TAURI_INTERNALS__);
      
      // Check if we're in Tauri environment
      if ((window as any).__TAURI_INTERNALS__) {
        // Use Tauri opener
        console.log('📱 Using Tauri opener...');
        try {
          const openerModule = await import('@tauri-apps/plugin-opener');
          console.log('📦 Opener module imported:', Object.keys(openerModule));
          
          if (openerModule.openUrl) {
            console.log('✅ Using openUrl function');
            await openerModule.openUrl(signUpUrl);
            console.log('🎉 Browser opened successfully with openUrl');
          } else {
            console.error('❌ openUrl function not found in opener module');
            throw new Error('openUrl function not available');
          }
        } catch (importError) {
          console.error('💥 Error importing opener module:', importError);
          throw importError;
        }
      } else {
        // Use web browser API
        console.log('🌐 Using window.open (web environment)');
        window.open(signUpUrl, '_blank');
        console.log('✅ window.open completed');
      }
    } catch (error) {
      console.error('💥 Error in signUp:', error);
      throw new Error('Failed to open sign up page: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error during sign out:', error);
      throw new Error('Failed to sign out');
    }
  }

  // Handle auth callback from web app
  async handleAuthCallback(url: string) {
    try {
      console.log('🔗 Handling auth callback:', url);
      
      // Extract tokens from URL
      const urlObj = new URL(url);
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      
      console.log('🎫 Extracted tokens:', { 
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
      });
      
      if (!accessToken || !refreshToken) {
        throw new Error('Missing auth tokens in callback URL');
      }

      // Set the session with the tokens
      console.log('🔧 Setting Supabase session...');
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('❌ Error setting session:', error);
        throw error;
      }

      console.log('✅ Successfully authenticated:', data.user?.email);
      console.log('👤 User data:', data.user);
      return data;
    } catch (error) {
      console.error('💥 Error handling auth callback:', error);
      throw new Error('Failed to complete authentication: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}

// Export singleton instance
export const authService = new AuthService();