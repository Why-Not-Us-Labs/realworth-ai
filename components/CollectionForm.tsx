'use client';

import React, { useState } from 'react';
import { CollectionVisibility } from '@/lib/types';

interface CollectionFormProps {
  onSubmit: (data: {
    name: string;
    description?: string;
    category?: string;
    expectedCount?: number;
    visibility: CollectionVisibility;
    goalDate?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: {
    name?: string;
    description?: string;
    category?: string;
    expectedCount?: number;
    visibility?: CollectionVisibility;
    goalDate?: string;
  };
}

const CATEGORIES = [
  'Books',
  'Coins',
  'Cards',
  'Comics',
  'Vinyl',
  'Art',
  'Antiques',
  'Toys',
  'Stamps',
  'Other',
];

export const CollectionForm: React.FC<CollectionFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [expectedCount, setExpectedCount] = useState<string>(
    initialData?.expectedCount?.toString() || ''
  );
  const [visibility, setVisibility] = useState<CollectionVisibility>(
    initialData?.visibility || 'private'
  );
  const [goalDate, setGoalDate] = useState(initialData?.goalDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      expectedCount: expectedCount ? parseInt(expectedCount, 10) : undefined,
      visibility,
      goalDate: goalDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Collection Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Series of Unfortunate Events First Editions"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this collection special?"
          rows={3}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition bg-white"
          >
            <option value="">Select...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expectedCount" className="block text-sm font-medium text-slate-700 mb-1">
            Expected Items
          </label>
          <input
            type="number"
            id="expectedCount"
            value={expectedCount}
            onChange={(e) => setExpectedCount(e.target.value)}
            placeholder="e.g., 13"
            min="1"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Privacy</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'private', label: 'Private', desc: 'Only you' },
            { value: 'unlisted', label: 'Unlisted', desc: 'Link only' },
            { value: 'public', label: 'Public', desc: 'Everyone' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setVisibility(option.value as CollectionVisibility)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition flex flex-col items-center ${
                visibility === option.value
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>{option.label}</span>
              <span className={`text-xs ${visibility === option.value ? 'text-teal-100' : 'text-slate-500'}`}>
                {option.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="goalDate" className="block text-sm font-medium text-slate-700 mb-1">
          Goal Completion Date
        </label>
        <input
          type="date"
          id="goalDate"
          value={goalDate}
          onChange={(e) => setGoalDate(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="flex-1 px-4 py-2 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
        >
          {isLoading ? 'Creating...' : initialData ? 'Update Collection' : 'Create Collection'}
        </button>
      </div>
    </form>
  );
};
