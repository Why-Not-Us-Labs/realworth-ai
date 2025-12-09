'use client';

import React, { useState } from 'react';
import { XIcon, CheckIcon, ChevronRightIcon, SpinnerIcon } from './icons';

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

interface SurveyModalProps {
  survey: Survey;
  userId?: string | null;
  appraisalCount?: number;
  onComplete: () => void;
  onDismiss: () => void;
}

export function SurveyModal({ survey, userId, appraisalCount, onComplete, onDismiss }: SurveyModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const question = survey.questions[currentQuestion];
  const totalQuestions = survey.questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({ ...prev, [question.id]: answer }));
  };

  const handleNext = async () => {
    // If on last question, submit
    if (currentQuestion === totalQuestions - 1) {
      await handleSubmit();
    } else {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/surveys/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          userId,
          answers,
          appraisalCount, // Track when user last completed survey
        }),
      });

      if (response.ok) {
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        // If submission failed, still close the modal gracefully
        // The user's feedback is valuable even if we couldn't save it
        console.error('Survey submission failed:', response.status);
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      // On network error, close gracefully
      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    // Record dismissal so we don't show again
    try {
      await fetch('/api/surveys/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          userId,
        }),
      });
    } catch (error) {
      console.error('Error dismissing survey:', error);
    }
    onDismiss();
  };

  const canProceed = answers[question?.id]?.trim();

  // Success state
  if (isComplete) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-xl text-center animate-slide-up">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Thank You!</h3>
          <p className="text-slate-600">Your feedback helps us build better features for you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">{survey.title}</h3>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              aria-label="Close survey"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {currentQuestion + 1}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <p className="text-slate-800 font-medium mb-4">{question.question}</p>

          {/* Multiple Choice */}
          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    answers[question.id] === option
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        answers[question.id] === option
                          ? 'border-teal-500 bg-teal-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {answers[question.id] === option && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Text Input */}
          {question.type === 'text' && (
            <textarea
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder={question.placeholder || 'Type your answer...'}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            Maybe later
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : currentQuestion === totalQuestions - 1 ? (
              <>
                Submit
                <CheckIcon className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SurveyModal;
