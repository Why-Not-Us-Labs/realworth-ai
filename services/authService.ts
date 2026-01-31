import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export type AuthProvider = 'google' | 'apple';

class AuthService {
  /**
   * Sign up with email and password
   */
  public async signUpWithEmail(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Sign up error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        return { user: this.mapSupabaseUserToUser(data.user) };
      }

      return { user: null };
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  /**
   * Sign in with email and password
   */
  public async signInWithEmail(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    if (!isSupabaseConfigured) {
      return { user: null, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Sign in error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        return { user: this.mapSupabaseUserToUser(data.user) };
      }

      return { user: null };
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  /**
   * Send magic link to email for passwordless sign-in
   * User clicks the link in their email to sign in automatically
   */
  public async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const redirectUrl = `${currentOrigin}/auth/callback`;

      console.log('[Auth] Sending magic link to:', email, 'redirectTo:', redirectUrl);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('[Auth] Send magic link error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('[Auth] Send magic link error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send magic link' };
    }
  }

  /**
   * Sign in with a provider using Supabase Auth
   */
  public async signInWithProvider(provider: AuthProvider): Promise<User | null> {
    if (!isSupabaseConfigured) {
      const errorMsg = "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      // Use the auth callback route to properly exchange the code for a session
      const redirectUrl = `${currentOrigin}/auth/callback`;

      console.log(`[Auth] Signing in with ${provider}, redirectTo:`, redirectUrl);
      console.log(`[Auth] Current origin:`, currentOrigin);

      const options: Record<string, unknown> = {
        redirectTo: redirectUrl,
      };

      // Google-specific options
      if (provider === 'google') {
        options.queryParams = {
          access_type: 'offline',
          prompt: 'consent',
        };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options,
      });

      if (error) {
        console.error("OAuth error:", error);
        throw error;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        return this.mapSupabaseUserToUser(sessionData.session.user);
      }

      return null;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  /**
   * Sign in with Google natively on iOS via Capacitor plugin.
   * Uses the native Google Sign-In SDK (bypasses WebView restriction),
   * then exchanges the ID token with Supabase via signInWithIdToken().
   */
  public async signInWithGoogleNative(): Promise<User | null> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');

      await SocialLogin.initialize({
        google: {
          iOSClientId: '811570590708-5vkm4h9mtofqoi6e38rflim0vk8t5um5.apps.googleusercontent.com',
          iOSServerClientId: '811570590708-flberffl49r3oufn7qebb16ht06rm548.apps.googleusercontent.com',
          mode: 'online',
        },
      });

      const res = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });

      const googleResult = res.result as { idToken?: string | null };
      if (!googleResult.idToken) {
        throw new Error('No ID token returned from Google Sign-In');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleResult.idToken,
      });

      if (error) {
        console.error('[Auth] Google native sign-in error:', error);
        throw error;
      }

      if (data.user) {
        return this.mapSupabaseUserToUser(data.user);
      }

      return null;
    } catch (error) {
      console.error('[Auth] Google native sign-in error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google using Supabase Auth
   * @deprecated Use signInWithProvider('google') instead
   */
  public async signInWithGoogle(): Promise<User | null> {
    return this.signInWithProvider('google');
  }

  /**
   * Sign in with Apple using Supabase Auth
   * @deprecated Use signInWithProvider('apple') instead
   */
  public async signInWithApple(): Promise<User | null> {
    return this.signInWithProvider('apple');
  }

  /**
   * Sign out the current user
   */
  public async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        return null;
      }

      return this.mapSupabaseUserToUser(session.user);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Listen for auth state changes
   */
  public onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);

      if (session?.user) {
        callback(this.mapSupabaseUserToUser(session.user));
      } else {
        callback(null);
      }
    });
  }

  /**
   * Map Supabase user to our User type
   * Handles different metadata formats from Google and Apple
   */
  private mapSupabaseUserToUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};

    // Apple returns name as an object { firstName, lastName } on first auth only
    // Google returns name as a string
    let name = metadata.name || metadata.full_name;
    if (!name && metadata.firstName) {
      name = `${metadata.firstName} ${metadata.lastName || ''}`.trim();
    }

    return {
      id: supabaseUser.id,
      name: name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      picture: metadata.avatar_url || metadata.picture || '',
    };
  }
}

export const authService = new AuthService();
