import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { sha256 } from 'js-sha256';
import { supabase } from './supabase';

/**
 * Generate a random nonce for Apple Sign-In
 * This is used for security - Apple embeds the hash in the token, Supabase verifies it
 */
function generateNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Lazy initialization flag for Google Sign-In
let isGoogleConfigured = false;

/**
 * Configure Google Sign-In lazily (only when needed)
 * This avoids crashes at module load when env vars are undefined
 */
function ensureGoogleConfigured() {
  if (isGoogleConfigured) return;

  // TODO: Replace with actual client IDs from Google Cloud Console
  const iosClientId = undefined; // Set your iOS client ID here
  const webClientId = undefined; // Set your web client ID here

  GoogleSignin.configure({
    iosClientId,
    webClientId,
  });
  isGoogleConfigured = true;
}

export const authService = {
  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    // Fail fast - Google not configured yet
    throw new Error('Google Sign-In coming soon. Please use Apple Sign-In.');
  },

  /**
   * Sign in with Apple
   * Uses nonce for security - native iOS always embeds a nonce in the token
   * Note: iOS hashes the nonce internally, so we send the same raw nonce to both Apple and Supabase
   */
  async signInWithApple() {
    try {
      // Generate a raw nonce - same value goes to both Apple and Supabase
      // iOS will hash it internally before embedding in the token
      // Supabase will hash it and compare to what's in the token
      const rawNonce = generateNonce();

      // Request Apple auth with RAW nonce (iOS hashes it internally)
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        nonce: rawNonce,
      });

      if (!appleAuthResponse.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      // Send to Supabase with RAW nonce (they hash and verify against token)
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: appleAuthResponse.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw error;
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    try {
      // Sign out from Google if signed in
      try {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          await GoogleSignin.signOut();
        }
      } catch {
        // Ignore Google sign out errors
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  },
};
