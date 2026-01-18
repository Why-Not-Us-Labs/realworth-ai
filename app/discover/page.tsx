
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import Link from 'next/link';
import { LogoIcon, CompassIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import { DiscoverFeed } from '@/components/DiscoverFeed';

export const metadata: Metadata = {
  title: 'Discover Treasures | RealWorth.ai',
  description: 'See what treasures others are finding! Get inspired and discover hidden value in your own items.',
  openGraph: {
    title: 'Discover Treasures | RealWorth.ai',
    description: 'See what treasures others are finding!',
  },
};

// Revalidate every 60 seconds for fresh content
export const revalidate = 60;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getPublicTreasures() {
  const { data, error } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (name, picture)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching public treasures:', error);
    return [];
  }

  return data || [];
}

export default async function DiscoverPage() {
  const treasures = await getPublicTreasures();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/discover" className="text-teal-600 font-medium text-sm">
              Discover
            </Link>
            <Link
              href="/?capture=true"
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start Appraisal
            </Link>
            <Link href="/profile" className="text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm">
              My Treasures
            </Link>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              title="Profile"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <CompassIcon className="w-12 h-12 sm:w-10 sm:h-10 text-white/80" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Discover Treasures
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
            See what amazing finds others are uncovering
          </p>
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-8">
        <DiscoverFeed treasures={treasures} />
      </main>

      <Footer />
    </div>
  );
}
