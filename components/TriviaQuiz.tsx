'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TriviaQuestion, getRandomQuestionExcluding, triviaQuestions } from '@/lib/triviaQuestions';
import { GemIcon, CheckIcon, XIcon } from './icons';

interface TriviaQuizProps {
  onPointsEarned?: (points: number) => void;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function TriviaQuiz({ onPointsEarned }: TriviaQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [totalPoints, setTotalPoints] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  // Track shown question IDs to keep them fresh
  const shownQuestionIds = useRef<Set<string>>(new Set());
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Get next fresh question (resets pool if all shown)
  const getNextQuestion = useCallback(() => {
    // If we've shown all questions, reset the pool
    if (shownQuestionIds.current.size >= triviaQuestions.length) {
      shownQuestionIds.current.clear();
    }

    const nextQuestion = getRandomQuestionExcluding(Array.from(shownQuestionIds.current));
    if (nextQuestion) {
      shownQuestionIds.current.add(nextQuestion.id);
      setCurrentQuestion(nextQuestion);
    }
  }, []);

  // Initialize first question
  useEffect(() => {
    getNextQuestion();
    // Cleanup timer on unmount
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [getNextQuestion]);

  // Advance to next question immediately
  const advanceToNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSelectedAnswer(null);
    setAnswerState('unanswered');
    setShowExplanation(false);
    getNextQuestion();
  }, [getNextQuestion]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (answerState !== 'unanswered' || !currentQuestion) return;

    setSelectedAnswer(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      setAnswerState('correct');
      const newTotal = totalPoints + currentQuestion.points;
      setTotalPoints(newTotal);
      onPointsEarned?.(currentQuestion.points);
    } else {
      setAnswerState('incorrect');
    }

    setShowExplanation(true);
    setQuestionsAnswered(prev => prev + 1);

    // Auto-advance to next question after delay (user can tap to skip)
    autoAdvanceTimer.current = setTimeout(() => {
      advanceToNext();
    }, 4000); // 4 seconds gives time to read explanation
  }, [answerState, currentQuestion, totalPoints, onPointsEarned, advanceToNext]);

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Points Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full">
          <GemIcon className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-700">{totalPoints} pts</span>
        </div>
        <span className="text-xs text-slate-500">
          {questionsAnswered + 1} answered
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        {/* Question */}
        <p className="text-slate-800 font-medium text-sm mb-4 leading-relaxed">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === currentQuestion.correctIndex;
            const showCorrect = answerState !== 'unanswered' && isCorrectOption;
            const showWrong = answerState === 'incorrect' && isSelected;

            let buttonClass = 'w-full text-left p-3 rounded-lg border text-sm transition-all ';

            if (answerState === 'unanswered') {
              buttonClass += 'border-slate-200 hover:border-teal-300 hover:bg-teal-50 active:bg-teal-100';
            } else if (showCorrect) {
              buttonClass += 'border-green-400 bg-green-50 text-green-800';
            } else if (showWrong) {
              buttonClass += 'border-red-400 bg-red-50 text-red-800';
            } else {
              buttonClass += 'border-slate-200 bg-slate-50 text-slate-500';
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={answerState !== 'unanswered'}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    showCorrect ? 'bg-green-500' :
                    showWrong ? 'bg-red-500' :
                    'bg-slate-100'
                  }`}>
                    {showCorrect && <CheckIcon className="w-4 h-4 text-white" />}
                    {showWrong && <XIcon className="w-4 h-4 text-white" />}
                    {answerState === 'unanswered' && (
                      <span className="text-xs font-medium text-slate-400">
                        {String.fromCharCode(65 + index)}
                      </span>
                    )}
                  </div>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            answerState === 'correct'
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-2">
              {answerState === 'correct' ? (
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <span className="text-amber-500 flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
              <div className="flex-1">
                <p className={`font-medium mb-1 ${
                  answerState === 'correct' ? 'text-green-800' : 'text-amber-800'
                }`}>
                  {answerState === 'correct' ? `+${currentQuestion.points} points!` : 'Good try!'}
                </p>
                <p className={answerState === 'correct' ? 'text-green-700' : 'text-amber-700'}>
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
            {/* Next button for immediate advancement */}
            <button
              onClick={advanceToNext}
              className="mt-3 w-full py-2 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Next Question
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Infinite Progress Indicator */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400">Keep playing while we appraise</span>
      </div>
    </div>
  );
}

export default TriviaQuiz;
