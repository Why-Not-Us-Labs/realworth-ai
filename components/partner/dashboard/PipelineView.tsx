'use client';

import { useState } from 'react';
import { AppraisalRow } from './AppraisalRow';
import type { PipelineAppraisal } from './AppraisalRow';

type Pipeline = {
  pending: PipelineAppraisal[];
  accepted: PipelineAppraisal[];
  declined: PipelineAppraisal[];
  review: PipelineAppraisal[];
  fulfilled: PipelineAppraisal[];
};

type Props = {
  pipeline: Pipeline;
  onUpdateStatus: (id: string, status: 'accepted' | 'declined' | 'pending' | 'fulfilled' | 'no_show') => Promise<void>;
  onAdjustOffer: (id: string, amount: number) => Promise<void>;
};

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'review', label: 'Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'declined', label: 'Declined' },
] as const;

export function PipelineView({ pipeline, onUpdateStatus, onAdjustOffer }: Props) {
  const [activeTab, setActiveTab] = useState<keyof Pipeline>('pending');

  const items = pipeline[activeTab] || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const count = pipeline[tab.key]?.length || 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-red-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No {activeTab} appraisals
          </p>
        ) : (
          items.map((item) => (
            <AppraisalRow
              key={item.id}
              appraisal={item}
              onUpdateStatus={onUpdateStatus}
              onAdjustOffer={onAdjustOffer}
            />
          ))
        )}
      </div>
    </div>
  );
}
