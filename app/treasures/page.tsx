'use client';

import React, { useContext, useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { DiscoverFeed } from '@/components/DiscoverFeed';
import { AuthContext } from '@/components/contexts/AuthContext';
import { AppraisalContext } from '@/components/contexts/AppraisalContext';
import { GemIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function TreasuresPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const { appraisals, refreshAppraisals, isLoading: isAppraisalsLoading } = useContext(AppraisalContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthLoading) {
      if (user) {
        refreshAppraisals(user.id).then(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }
  }, [user, isAuthLoading, refreshAppraisals]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <GemIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to view your treasures</h1>
            <p className="text-slate-600 mb-6">
              Create an account to start building your collection of discovered treasures.
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const treasures = appraisals.map((appraisal) => ({
    id: appraisal.id,
    item_name: appraisal.itemName,
    image_url: appraisal.image || (appraisal.images && appraisal.images[0]) || '',
    price_low: appraisal.priceRange.low,
    price_high: appraisal.priceRange.high,
    currency: appraisal.currency,
    category: appraisal.category,
    era: appraisal.era || null,
    created_at: new Date(appraisal.timestamp).toISOString(),
    users: {
      name: user.name,
      picture: user.picture,
    },
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white py-6 sm:py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <GemIcon className="w-12 h-12 sm:w-10 sm:h-10 text-white/80" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            My Treasures
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
            Your collection of discovered treasures
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-8">
        {isAppraisalsLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
          </div>
        ) : (
          <DiscoverFeed treasures={treasures} />
        )}
      </main>

      <Footer />
    </div>
  );
}

