
'use client';

import React, { useState } from 'react';
import { AppraisalRequest } from '@/lib/types';
import { FileUpload } from './FileUpload';
import { SparklesIcon, SpinnerIcon } from './icons';
import { PhotoGuidanceModal } from './PhotoGuidanceModal';
import { Button } from '@/components/ui/button';

interface AppraisalFormProps {
  onSubmit: (request: AppraisalRequest) => void;
  isLoading: boolean;
  error: string | null;
}

export const AppraisalForm: React.FC<AppraisalFormProps> = ({
  onSubmit,
  isLoading,
  error,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [showGuidance, setShowGuidance] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      onSubmit({ files });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Appraise an Item</h2>
        <p className="text-slate-500 mt-1">Upload a photo, select the condition, and get an instant valuation.</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg" role="alert">
          <strong className="font-bold">Oops! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <FileUpload files={files} setFiles={setFiles} />

      {/* Photo Tips Link */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="link"
          onClick={() => setShowGuidance(true)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Tips for the best appraisal
        </Button>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={files.length === 0 || isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? <SpinnerIcon /> : <SparklesIcon />}
          {isLoading ? 'Analyzing...' : 'Get Appraisal'}
        </Button>
      </div>

      {/* Photo Guidance Modal */}
      {showGuidance && (
        <PhotoGuidanceModal
          onClose={() => setShowGuidance(false)}
          onContinue={() => setShowGuidance(false)}
        />
      )}
    </form>
  );
};
