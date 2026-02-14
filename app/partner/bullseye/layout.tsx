import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bullseye x RealWorth — Instant Sneaker Offers',
  description: 'Get an instant cash offer for your sneakers. Powered by AI.',
  icons: { icon: '/logo.svg' },
};

export default function BullseyeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black text-white min-h-screen">
      {children}
    </div>
  );
}
