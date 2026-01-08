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

export const supabase = {
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
