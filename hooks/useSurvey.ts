'use client';

import { useState, useCallback, useEffect } from 'react';

interface SurveyQuestion {
  id: string;
  type: 'multiple_choice' | 'text' | 'rating';
  question: string;
  options?: string[];
  placeholder?: string;
}

interface Survey {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
}

interface UseSurveyOptions {
  userId?: string | null;
  appraisalCount: number;
}

export function useSurvey({ userId, appraisalCount }: UseSurveyOptions) {
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // Check for active surveys based on trigger conditions
  const checkForSurvey = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        appraisalCount: appraisalCount.toString(),
      });

      if (userId) {
        params.set('userId', userId);
      }

      const response = await fetch(`/api/surveys/active?${params}`);
      const data = await response.json();

      if (data.survey) {
        setActiveSurvey(data.survey);
      }
    } catch (error) {
      console.error('Error checking for surveys:', error);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [userId, appraisalCount, isLoading]);

  // Dismiss the current survey
  const dismissSurvey = useCallback(() => {
    setActiveSurvey(null);
  }, []);

  // Mark survey as completed
  const completeSurvey = useCallback(() => {
    setActiveSurvey(null);
  }, []);

  // Auto-check for surveys when appraisal count changes
  // Check at every 50 appraisals (50, 100, 150, 200, etc.)
  useEffect(() => {
    // Only check at multiples of 50 (and at least 50)
    const shouldCheck = appraisalCount >= 50 && appraisalCount % 50 === 0;

    if (shouldCheck && !hasChecked) {
      checkForSurvey();
    }
  }, [appraisalCount, hasChecked, checkForSurvey]);

  // Reset hasChecked when appraisal count changes to allow new checks
  useEffect(() => {
    setHasChecked(false);
  }, [appraisalCount]);

  return {
    activeSurvey,
    isLoading,
    checkForSurvey,
    dismissSurvey,
    completeSurvey,
  };
}

export default useSurvey;
