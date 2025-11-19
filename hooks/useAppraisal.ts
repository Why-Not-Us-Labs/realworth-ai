
import { useState } from 'react';
import { AppraisalRequest, AppraisalResult } from '@/types';

type AppraisalOutput = {
    appraisalData: Omit<AppraisalResult, 'id' | 'image'>;
    imageDataUrl: string;
} | null;

export const useAppraisal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAppraisal = async (request: AppraisalRequest): Promise<AppraisalOutput> => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    request.files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('condition', request.condition);

    try {
      const response = await fetch('/api/appraise', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'An unknown error occurred.');
      }

      const result = await response.json();
      return result;

    } catch (e) {
      console.error("Error getting appraisal:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get appraisal. ${errorMessage}. Please try again.`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getAppraisal, isLoading, error };
};
