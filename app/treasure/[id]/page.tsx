
import { Metadata } from 'next';
import { TreasureViewer } from '@/components/TreasureViewer';
import { createClient } from '@supabase/supabase-js';

interface TreasurePageProps {
  params: { id: string };
}

// Fetch treasure data for metadata generation (public treasures only)
async function getPublicTreasure(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Use service role for metadata fetch to ensure partner appraisals (no user_id) are accessible
  const supabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('rw_appraisals')
    .select('id, item_name, description, price_low, price_high, currency, ai_image_url, image_urls, is_public, partner_id, sneaker_details, buy_offer')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    image_url: data.ai_image_url || (data.image_urls && data.image_urls[0]) || '',
  };
}

// Generate metadata for social sharing (only for public treasures)
export async function generateMetadata({ params }: TreasurePageProps): Promise<Metadata> {
  const treasure = await getPublicTreasure(params.id);

  if (!treasure) {
    return {
      title: 'Treasure | RealWorth.ai',
      description: 'Discover the value of your items with AI-powered appraisals.',
    };
  }

  // Bullseye partner-branded metadata
  if (treasure.partner_id === 'bullseye') {
    const buyOffer = treasure.buy_offer as { amount?: number } | null;
    const offerAmount = buyOffer?.amount ? `$${buyOffer.amount.toFixed(0)}` : null;
    const title = offerAmount
      ? `${treasure.item_name} — Bullseye Offer: ${offerAmount}`
      : `${treasure.item_name} — Bullseye x RealWorth`;
    const description = offerAmount
      ? `AI-powered sneaker offer: ${offerAmount}. Get your own instant cash offer at Bullseye.`
      : `AI-powered sneaker appraisal. Get your own instant cash offer at Bullseye.`;
    const ogImage = 'https://realworth.ai/partners/bullseye-og.png';

    return {
      title: `${title} | Bullseye x RealWorth`,
      description,
      openGraph: {
        title,
        description,
        images: [ogImage],
        type: 'article',
        siteName: 'Bullseye x RealWorth',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
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

export default function TreasurePage({ params }: TreasurePageProps) {
  return <TreasureViewer treasureId={params.id} />;
}
