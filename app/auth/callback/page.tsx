'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[Auth Callback] Page loaded at:', window.location.href);
      console.log('[Auth Callback] Hash:', window.location.hash);
      console.log('[Auth Callback] Search:', window.location.search);

      // Check if we have hash params (implicit grant) or query params (PKCE)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = queryParams.get('code');
      const error = queryParams.get('error') || hashParams.get('error');
      const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

      if (error) {
        console.error('[Auth Callback] OAuth error:', error, errorDescription);
        setStatus(`Error: ${errorDescription || error}`);
        setTimeout(() => router.replace('/'), 3000);
        return;
      }

      if (accessToken && refreshToken) {
        // Implicit grant flow - set session directly
        setStatus('Setting up your session...');
        console.log('[Auth Callback] Setting session from hash tokens');

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('[Auth Callback] Error setting session:', sessionError);
          setStatus(`Session error: ${sessionError.message}`);
          setTimeout(() => router.replace('/'), 3000);
          return;
        }

        console.log('[Auth Callback] Session set for:', data.user?.email);
        setStatus(`Welcome, ${data.user?.email}!`);

        // Wait a moment for session to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

      } else if (code) {
        // PKCE flow - exchange code for session
        setStatus('Exchanging authorization code...');
        console.log('[Auth Callback] Exchanging code for session');

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('[Auth Callback] Error exchanging code:', exchangeError);
          setStatus(`Exchange error: ${exchangeError.message}`);
          setTimeout(() => router.replace('/'), 3000);
          return;
        }

        console.log('[Auth Callback] Session created for:', data.user?.email);
        setStatus(`Welcome, ${data.user?.email}!`);

        // Wait a moment for session to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

      } else {
        // No tokens - check if session already exists (Supabase may have auto-detected)
        console.log('[Auth Callback] No tokens in URL, checking existing session...');
        setStatus('Checking session...');

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('[Auth Callback] Found existing session for:', session.user.email);
          setStatus(`Welcome back, ${session.user.email}!`);
        } else {
          console.log('[Auth Callback] No session found');
          setStatus('No authentication data found');
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Redirect to home
      router.replace('/');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">{status}</p>
      </div>
    </div>
  );
}
