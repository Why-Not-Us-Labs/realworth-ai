import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://gwoahdeybyjfonoahmvv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2FoZGV5YnlqZm9ub2FobXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjY5NjYsImV4cCI6MjA3OTE0Mjk2Nn0.FzTatFNzy70X0F9FgvOIwc5MDFoC4Ma7R447XmeJeak';

export type Session = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type User = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

type AuthListener = (session: Session | null) => void;

let currentSession: Session | null = null;
let listeners: AuthListener[] = [];

const STORAGE_BUCKET = 'appraisal-images';

export const supabase = {
  storage: {
    /**
     * Upload an image to Supabase Storage
     * @param base64Data - Base64 encoded image data (without data URL prefix)
     * @param userId - User ID for the storage path
     * @param mimeType - MIME type (image/jpeg or image/png)
     * @returns Object with public URL and storage path
     */
    async uploadImage(
      base64Data: string,
      userId: string,
      mimeType: string = 'image/jpeg'
    ): Promise<{ url: string; path: string }> {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Generate unique path
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 9);
      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const path = `${userId}/uploads/${timestamp}-${randomStr}.${extension}`;

      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': mimeType,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: bytes,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      // Construct public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

      return { url: publicUrl, path };
    },
  },

  auth: {
    async signInWithIdToken({ provider, token, nonce }: { provider: string; token: string; nonce?: string }) {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          provider,
          id_token: token,
          ...(nonce && { nonce }),
        }),
      });
      const data = await res.json();
      if (!res.ok) return { data: null, error: data };

      currentSession = data;
      await AsyncStorage.setItem('supabase_session', JSON.stringify(data));
      listeners.forEach(cb => cb(data));
      return { data, error: null };
    },

    async getSession() {
      if (currentSession) return { data: { session: currentSession }, error: null };
      const stored = await AsyncStorage.getItem('supabase_session');
      currentSession = stored ? JSON.parse(stored) : null;
      return { data: { session: currentSession }, error: null };
    },

    async signOut() {
      currentSession = null;
      await AsyncStorage.removeItem('supabase_session');
      listeners.forEach(cb => cb(null));
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      const listener = (s: Session | null) => callback(s ? 'SIGNED_IN' : 'SIGNED_OUT', s);
      listeners.push(listener);
      this.getSession().then(({ data }) => callback('INITIAL_SESSION', data.session));
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners = listeners.filter(l => l !== listener);
            },
          },
        },
      };
    },
  },
};
