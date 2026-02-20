'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BullseyeAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = queryParams.get('code');
      const error = queryParams.get('error') || hashParams.get('error');
      const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

      if (error) {
        setStatus(`Error: ${errorDescription || error}`);
        setTimeout(() => router.replace('/dashboard'), 3000);
        return;
      }

      if (accessToken && refreshToken) {
        setStatus('Setting up your session...');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setStatus(`Session error: ${sessionError.message}`);
          setTimeout(() => router.replace('/dashboard'), 3000);
          return;
        }
      } else if (code) {
        setStatus('Signing you in...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setStatus(`Sign-in error: ${exchangeError.message}`);
          setTimeout(() => router.replace('/dashboard'), 3000);
          return;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      router.replace('/dashboard');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-700 text-sm">{status}</p>
      </div>
    </div>
  );
}
