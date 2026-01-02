import { authService } from '$lib/services/auth';
import type { AuthState } from '$lib/services/auth';

let authState = $state<AuthState>({
  user: null,
  session: null,
  loading: true,
});

// Subscribe to auth changes
authService.onAuthStateChange((state) => {
  authState = state;
});

export const auth = {
  get state() {
    return authState;
  },
  
  get user() {
    return authState.user;
  },
  
  get isAuthenticated() {
    return !!authState.session;
  },
  
  get isLoading() {
    return authState.loading;
  },

  get isAnonymous() {
    return authState.user?.isAnonymous || false;
  },

  async signIn() {
    return authService.signIn();
  },

  async signUp() {
    return authService.signUp();
  },

  async signInAnonymously() {
    return authService.signInAnonymously();
  },

  async signOut() {
    return authService.signOut();
  }
};