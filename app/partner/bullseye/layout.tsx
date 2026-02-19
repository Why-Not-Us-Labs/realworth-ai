import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bullseye x RealWorth — Instant Sneaker Offers',
  description: 'Get an instant cash offer for your sneakers. Snap a few photos, get an AI-powered valuation and buy offer in seconds.',
  icons: { icon: '/logo.svg' },
  openGraph: {
    title: 'Bullseye x RealWorth — Instant Sneaker Offers',
    description: 'Get an instant cash offer for your sneakers. Snap a few photos, get an AI-powered valuation and buy offer in seconds.',
    siteName: 'RealWorth.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bullseye x RealWorth — Instant Sneaker Offers',
    description: 'Get an instant cash offer for your sneakers. Snap a few photos, get an AI-powered valuation and buy offer in seconds.',
  },
};

export default function BullseyeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-slate-900 min-h-screen">
      {children}
    </div>
  );
}
