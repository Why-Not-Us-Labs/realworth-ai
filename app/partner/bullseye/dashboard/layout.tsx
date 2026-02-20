import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bullseye Dashboard | RealWorth',
  description: 'Partner dashboard for Bullseye Sneaker Boutique',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
