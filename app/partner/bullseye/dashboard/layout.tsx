import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bullseye Dashboard | RealWorth',
  description: 'Partner dashboard for Bullseye Sneaker Boutique',
  openGraph: {
    title: 'Bullseye Partner Dashboard',
    description: 'Manage sneaker appraisals and buy offers',
    images: [
      {
        url: '/partners/bullseye-dashboard-og.png',
        width: 1200,
        height: 630,
        alt: 'Bullseye x RealWorth Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bullseye Partner Dashboard',
    description: 'Manage sneaker appraisals and buy offers',
    images: ['/partners/bullseye-dashboard-og.png'],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
