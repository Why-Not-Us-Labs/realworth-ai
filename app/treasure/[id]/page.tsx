
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LogoIcon, LockIcon } from '@/components/icons';
import { getSupabaseAdmin } from '@/lib/supabase';

interface TreasurePageProps {
  params: { id: string };
}

// Fetch treasure data (uses admin client to bypass RLS for public sharing)
async function getTreasure(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (name, picture)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

// Generate metadata for social sharing
export async function generateMetadata({ params }: TreasurePageProps): Promise<Metadata> {
  const treasure = await getTreasure(params.id);

  if (!treasure || !treasure.is_public) {
    return {
      title: 'Treasure Not Found | RealWorth.ai',
    };
  }

  const avgValue = ((treasure.price_low + treasure.price_high) / 2).toFixed(0);
  const title = `${treasure.item_name} - Worth $${avgValue}!`;
  const description = `Discovered on RealWorth.ai: ${treasure.description?.substring(0, 150)}...`;

  return {
    title: `${title} | RealWorth.ai`,
    description,
    openGraph: {
      title,
      description,
      images: treasure.image_url ? [treasure.image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: treasure.image_url ? [treasure.image_url] : [],
    },
  };
}

export default async function TreasurePage({ params }: TreasurePageProps) {
  const treasure = await getTreasure(params.id);

  if (!treasure) {
    notFound();
  }

  // Check if treasure is public
  if (!treasure.is_public) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <LockIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Private Treasure</h1>
          <p className="text-slate-600 mb-6">
            This treasure is set to private by its owner.
          </p>
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
          >
            Discover Your Own Treasures
          </Link>
        </div>
      </div>
    );
  }

  const avgValue = (treasure.price_low + treasure.price_high) / 2;
  const formattedAvg = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(avgValue);

  const formattedLow = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(treasure.price_low);

  const formattedHigh = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: treasure.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(treasure.price_high);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <span className="font-bold text-xl text-slate-900">RealWorth<span className="font-light text-slate-500">.ai</span></span>
          </Link>
          <Link
            href="/"
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-full text-sm transition-transform transform hover:scale-105"
          >
            Appraise Your Items
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Image */}
          {treasure.image_url && (
            <div className="relative aspect-square sm:aspect-video bg-slate-100">
              <img
                src={treasure.image_url}
                alt={treasure.item_name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Category & Era Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-block bg-teal-100 text-teal-800 text-sm font-semibold px-3 py-1 rounded-full">
                {treasure.category}
              </span>
              {treasure.era && (
                <span className="inline-block bg-slate-100 text-slate-600 text-sm font-medium px-3 py-1 rounded-full">
                  {treasure.era}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
              {treasure.item_name}
            </h1>

            {treasure.author && treasure.author !== 'N/A' && (
              <p className="text-lg text-slate-500 mb-6">by {treasure.author}</p>
            )}

            {/* Value & Confidence Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Value Card */}
              <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg shadow-teal-500/20">
                <p className="text-xs uppercase tracking-wider opacity-80 mb-1 font-medium">Estimated Value</p>
                <p className="text-4xl font-black mb-1">{formattedAvg}</p>
                <p className="text-sm opacity-80">
                  {formattedLow} - {formattedHigh}
                </p>
              </div>

              {/* Confidence Score Card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-xs uppercase tracking-wider opacity-80 mb-1 font-medium">Confidence Score</p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-black">
                    {treasure.confidence_score ?? 75}
                    <span className="text-lg font-normal opacity-60">/100</span>
                  </p>
                  {/* Confidence Level Badge */}
                  <span className={`text-xs font-bold px-2 py-1 rounded-full mb-1 ${
                    (treasure.confidence_score ?? 75) >= 90 ? 'bg-emerald-500/20 text-emerald-300' :
                    (treasure.confidence_score ?? 75) >= 70 ? 'bg-teal-500/20 text-teal-300' :
                    (treasure.confidence_score ?? 75) >= 50 ? 'bg-amber-500/20 text-amber-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {(treasure.confidence_score ?? 75) >= 90 ? 'Very High' :
                     (treasure.confidence_score ?? 75) >= 70 ? 'High' :
                     (treasure.confidence_score ?? 75) >= 50 ? 'Moderate' : 'Low'}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (treasure.confidence_score ?? 75) >= 90 ? 'bg-emerald-400' :
                      (treasure.confidence_score ?? 75) >= 70 ? 'bg-teal-400' :
                      (treasure.confidence_score ?? 75) >= 50 ? 'bg-amber-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${treasure.confidence_score ?? 75}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Confidence Factors (if available) */}
            {treasure.confidence_factors && treasure.confidence_factors.length > 0 && (
              <div className="mb-8 bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Why This Confidence Score?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(treasure.confidence_factors as Array<{factor: string; impact: string; detail: string}>).map((cf, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${
                        cf.impact === 'positive' ? 'bg-emerald-100 text-emerald-600' :
                        cf.impact === 'negative' ? 'bg-red-100 text-red-600' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {cf.impact === 'positive' ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : cf.impact === 'negative' ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{cf.factor}</p>
                        <p className="text-xs text-slate-500">{cf.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description Card */}
            <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                About This Item
              </h3>
              <p className="text-slate-600 leading-relaxed">{treasure.description}</p>
            </div>

            {/* Valuation Reasoning Card */}
            <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
              <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Valuation Reasoning
              </h3>
              <p className="text-amber-900/80 leading-relaxed">{treasure.reasoning}</p>
            </div>

            {/* Get Expert Opinion Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Want a Second Opinion?
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Get a professional appraisal from trusted experts:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(treasure.item_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                >
                  <span className="font-medium">Search eBay</span>
                  <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://www.valuemystuff.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                >
                  <span className="font-medium">ValueMyStuff</span>
                  <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://www.ha.com/free-auction-appraisal.s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                >
                  <span className="font-medium">Heritage Auctions</span>
                  <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href="https://www.mearto.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                >
                  <span className="font-medium">Mearto</span>
                  <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Owner Info */}
            {treasure.users && (
              <div className="border-t pt-6 flex items-center gap-3">
                {treasure.users.picture && (
                  <img
                    src={treasure.users.picture}
                    alt={treasure.users.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm text-slate-500">Discovered by</p>
                  <p className="font-semibold text-slate-900">{treasure.users.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">Think you have hidden treasures?</p>
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30"
          >
            Start Appraising Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center p-6 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </div>
  );
}
