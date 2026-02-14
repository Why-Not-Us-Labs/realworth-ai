'use client';

import React from 'react';
import type { SneakerConditionGrade } from '@/lib/types';

type Props = {
  value: SneakerConditionGrade | null;
  onChange: (grade: SneakerConditionGrade) => void;
};

const grades: { grade: SneakerConditionGrade; label: string; desc: string }[] = [
  { grade: 'DS', label: 'DS', desc: 'Deadstock — brand new, never worn' },
  { grade: 'VNDS', label: 'VNDS', desc: 'Very near deadstock — tried on only' },
  { grade: 'Excellent', label: 'Excellent', desc: 'Worn 2-5 times, minimal wear' },
  { grade: 'Good', label: 'Good', desc: 'Moderate wear, light creasing' },
  { grade: 'Fair', label: 'Fair', desc: 'Heavy wear, noticeable creasing' },
  { grade: 'Beater', label: 'Beater', desc: 'Significantly worn, major flaws' },
];

export default function SneakerConditionPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Condition (optional — AI will also assess)
      </label>
      <div className="grid grid-cols-2 gap-2">
        {grades.map(({ grade, label, desc }) => {
          const selected = value === grade;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => onChange(grade)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selected
                  ? 'border-red-500 bg-red-500/10 text-white'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs mt-0.5 opacity-70">{desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
