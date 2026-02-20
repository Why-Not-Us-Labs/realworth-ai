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
    images: [
      {
        url: 'https://realworth.ai/partners/bullseye-og.png',
        width: 1200,
        height: 630,
        alt: 'Bullseye x RealWorth — AI-Powered Sneaker Offers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bullseye x RealWorth — Instant Sneaker Offers',
    description: 'Get an instant cash offer for your sneakers. Snap a few photos, get an AI-powered valuation and buy offer in seconds.',
    images: ['https://realworth.ai/partners/bullseye-og.png'],
  },
};

export default function BullseyeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-slate-900 min-h-screen">
      {children}
    </div>
  );
}
