
'use client';

import React, { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Header } from '@/components/Header';
import { AppraisalResult, AppraisalRequest } from '@/lib/types';
import { useAppraisal } from '@/hooks/useAppraisal';
import { useQueue } from '@/hooks/useQueue';
import { Loader } from '@/components/Loader';
import { ResultCard } from '@/components/ResultCard';
import { CelebrationScreen } from '@/components/CelebrationScreen';
import { HistoryList } from '@/components/HistoryList';
import { SparklesIcon, GemIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import { GamificationStats } from '@/components/GamificationStats';
import { Achievements } from '@/components/Achievements';
import { DailyChallenges } from '@/components/DailyChallenges';
import { AuthContext } from '@/components/contexts/AuthContext';
import { dbService } from '@/services/dbService';
import { useSubscription } from '@/hooks/useSubscription';
import UpgradeModal from '@/components/UpgradeModal';
import UsageMeter from '@/components/UsageMeter';
import { SurveyModal } from '@/components/SurveyModal';
import { useSurvey } from '@/hooks/useSurvey';
import { QueueStatus } from '@/components/QueueStatus';

type View = 'HOME' | 'FORM' | 'LOADING' | 'CELEBRATION' | 'RESULT';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  streakIncreased: boolean;
  streakBroken: boolean;
}

export default function Home() {
  const [view, setView] = useState<View>('HOME');
  const [history, setHistory] = useState<AppraisalResult[]>([]);
  const [archivedHistory, setArchivedHistory] = useState<AppraisalResult[]>([]);
  const [currentResult, setCurrentResult] = useState<AppraisalResult | null>(null);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  // Celebration screen state
  const [celebrationStreakInfo, setCelebrationStreakInfo] = useState<StreakInfo | null>(null);
  const [triviaPointsEarned, setTriviaPointsEarned] = useState(0);
  const [celebrationItemName, setCelebrationItemName] = useState<string>('');
  const [celebrationValue, setCelebrationValue] = useState<number>(0);
  const [celebrationCurrency, setCelebrationCurrency] = useState<string>('USD');
  const { queueAppraisal, isLoading, error } = useAppraisal();
  const { user, isAuthLoading, signIn } = useContext(AuthContext);
  const { isPro, usageCount, checkCanAppraise, incrementUsage, refresh: refreshSubscription } = useSubscription(user?.id || null, user?.email);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  // Handle queue item completion - show celebration
  const handleQueueItemComplete = useCallback((item: { id: string; appraisalId: string | null; itemName: string; value: number; currency: string }) => {
    console.log('[Queue] Item completed:', item);
    // Refresh history to include new appraisal
    if (user) {
      dbService.getHistory(user.id).then(setHistory);
      dbService.getUserStreaks(user.id).then(setStreaks);
      incrementUsage();
      refreshSubscription();
    }
    // Show celebration for completed item
    setCelebrationItemName(item.itemName);
    setCelebrationValue(item.value);
    setCelebrationCurrency(item.currency);
    setView('CELEBRATION');
  }, [user, incrementUsage, refreshSubscription]);

  // Queue system for async processing
  const { items: queueItems, stats: queueStats } = useQueue({
    userId: user?.id,
    onItemComplete: handleQueueItemComplete,
    pollInterval: 3000,
  });

  // Survey system - triggers after certain appraisal counts
  const { activeSurvey, checkForSurvey, dismissSurvey, completeSurvey } = useSurvey({
    userId: user?.id,
    appraisalCount: history.length,
  });

  // Load history and streaks from database when user logs in
  useEffect(() => {
    if (user && !isAuthLoading) {
      dbService.getHistory(user.id).then(setHistory);
      dbService.getArchivedHistory(user.id).then(setArchivedHistory);
      dbService.getUserStreaks(user.id).then(setStreaks);
    } else if (!user && !isAuthLoading) {
      setHistory([]);
      setArchivedHistory([]);
      setStreaks({ currentStreak: 0, longestStreak: 0 });
    }
  }, [user, isAuthLoading]);

  // Check for subscription success from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      // Refresh subscription status
      refreshSubscription();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshSubscription]);

  // Reload histories when archive status changes
  const handleArchiveChange = () => {
    if (user) {
      dbService.getHistory(user.id).then(setHistory);
      dbService.getArchivedHistory(user.id).then(setArchivedHistory);
    }
  };

  // Show upgrade modal with specific feature
  const promptUpgrade = (feature?: string) => {
    setUpgradeFeature(feature);
    setShowUpgradeModal(true);
  };

  const handleAppraisalRequest = async (request: AppraisalRequest) => {
    // Check if user can create appraisal (for logged-in users)
    if (user) {
      const { canCreate } = await checkCanAppraise();
      if (!canCreate) {
        promptUpgrade('Unlimited Appraisals');
        return;
      }
    }

    // Queue-based flow: Upload → Queue → Return to form immediately
    // User can continue capturing while items process in background
    setIsUploading(true);

    try {
      const result = await queueAppraisal(request);

      if (result?.queueId) {
        // Success! Item queued for processing
        console.log('[Queue] Item queued:', result.queueId);
        // Return to form so user can capture more items
        setView('FORM');
      } else {
        // Queue failed - show error
        console.error('[Queue] Failed to queue item');
      }
    } catch (e) {
      console.error('[Queue] Error:', e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartNew = () => {
    setCurrentResult(null);
    setCelebrationStreakInfo(null);
    setTriviaPointsEarned(0);
    setView('FORM');
  };

  // Handler for trivia points earned during loading
  const handleTriviaPoints = (points: number) => {
    setTriviaPointsEarned(prev => prev + points);
  };

  // Handler for continuing from celebration - go back to form to capture more
  const handleCelebrationContinue = () => {
    // In queue mode, go back to form so user can keep capturing
    // Reset celebration state
    setCelebrationItemName('');
    setCelebrationValue(0);
    setCelebrationCurrency('USD');
    setView('FORM');
  };
  
  const handleSelectHistoryItem = (item: AppraisalResult) => {
    setIsFromHistory(true);
    setCurrentResult(item);
    setView('RESULT');
  }

  const { totalValue, itemCount } = useMemo(() => {
    const total = history.reduce((acc, item) => acc + (item.priceRange.high + item.priceRange.low) / 2, 0);
    return { totalValue: total, itemCount: history.length };
  }, [history]);

  const renderView = () => {
    switch (view) {
      case 'LOADING':
        return <Loader onPointsEarned={handleTriviaPoints} />;
      case 'CELEBRATION':
        // Queue-based celebration uses dedicated state variables
        if (celebrationItemName) {
          return (
            <CelebrationScreen
              itemName={celebrationItemName}
              value={celebrationValue}
              currency={celebrationCurrency}
              streakInfo={celebrationStreakInfo}
              triviaPoints={triviaPointsEarned}
              onContinue={handleCelebrationContinue}
            />
          );
        }
        // Fallback for legacy sync mode (if currentResult exists)
        if (currentResult) {
          const avgValue = (currentResult.priceRange.low + currentResult.priceRange.high) / 2;
          return (
            <CelebrationScreen
              itemName={currentResult.itemName}
              value={avgValue}
              currency={currentResult.currency}
              streakInfo={celebrationStreakInfo}
              triviaPoints={triviaPointsEarned}
              onContinue={handleCelebrationContinue}
            />
          );
        }
        return null;
      case 'FORM':
        return <AppraisalForm onSubmit={handleAppraisalRequest} isLoading={isLoading || isUploading} error={error} />;
      case 'RESULT':
        return currentResult && <ResultCard result={currentResult} onStartNew={handleStartNew} setHistory={setHistory} isFromHistory={isFromHistory} />;
      case 'HOME':
      default:
        return (
          <div className="text-center p-8">
            <div className="mb-8">
              <h1 className="text-5xl md:text-6xl font-black mb-4 text-slate-900">
                Turn Clutter into <span className="gradient-text">Cash</span>!
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                It's a win-win! Declutter your home and discover hidden treasures. Snap a photo to see what your items are worth. It's fun, easy, and you might just find a fortune!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  if (!user) {
                    signIn();
                  } else {
                    setView('FORM');
                  }
                }}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30 inline-flex items-center gap-3"
              >
                <SparklesIcon />
                {user ? 'Start Appraisal' : 'Sign in to Start'}
              </button>
            </div>
            {/* Mobile upgrade button - visible only on mobile where header button is hidden */}
            {user && !isPro && (
              <button
                onClick={() => promptUpgrade()}
                className="sm:hidden mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-semibold py-3 px-6 rounded-full text-base transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Upgrade to Pro - $9.99/mo
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <Header onUpgradeClick={() => promptUpgrade()} />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="w-full bg-white rounded-2xl shadow-lg mb-8">
          {renderView()}
        </div>

        {user && (
          <>
            {history.length > 0 ? (
              <>
                <GamificationStats
                  itemCount={itemCount}
                  totalValue={totalValue}
                  currency={history[0]?.currency || 'USD'}
                  currentStreak={streaks.currentStreak}
                  longestStreak={streaks.longestStreak}
                />
                {/* Usage meter for free users */}
                {!isPro && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                    <UsageMeter
                      used={usageCount}
                      limit={10}
                      isPro={isPro}
                      onUpgrade={() => promptUpgrade()}
                    />
                  </div>
                )}
                <DailyChallenges
                  history={history}
                  currentStreak={streaks.currentStreak}
                  longestStreak={streaks.longestStreak}
                />
                <Achievements history={history} />
                <HistoryList
                  history={history}
                  onSelect={handleSelectHistoryItem}
                  userId={user.id}
                  onUpdate={(updatedItem) => {
                    setHistory(prev => prev.map(item =>
                      item.id === updatedItem.id ? updatedItem : item
                    ));
                  }}
                  archivedHistory={archivedHistory}
                  onArchiveChange={handleArchiveChange}
                />
              </>
            ) : (
              <>
                {/* Pro upgrade banner for new users */}
                {!isPro && (
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 mb-6 text-white">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="text-xl font-bold mb-1">Unlock Unlimited Appraisals</h3>
                        <p className="text-teal-100 text-sm">
                          Go Pro for $9.99/month - AI chat, unlimited photos, priority support
                        </p>
                      </div>
                      <button
                        onClick={() => promptUpgrade()}
                        className="bg-white text-teal-600 font-semibold py-2.5 px-6 rounded-full hover:bg-teal-50 transition-colors whitespace-nowrap shadow-lg"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <GemIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Your Collection is Empty</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                    Start discovering hidden treasures. Snap photos of items around your home to find out what they're worth.
                  </p>
                  <button
                    onClick={() => setView('FORM')}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
                  >
                    Find Your First Treasure
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Queue Status - floating indicator for background processing */}
      {user && (
        <QueueStatus
          items={queueItems}
          stats={queueStats}
          onViewResult={(appraisalId) => {
            // Find the appraisal in history and show it
            const item = history.find(h => h.id === appraisalId);
            if (item) {
              handleSelectHistoryItem(item);
            }
          }}
        />
      )}

      {/* Upgrade Modal */}
      {user && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          feature={upgradeFeature}
        />
      )}

      {/* Survey Modal */}
      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          userId={user?.id}
          appraisalCount={history.length}
          onComplete={completeSurvey}
          onDismiss={dismissSurvey}
        />
      )}
    </>
  );
}
