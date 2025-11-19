
'use client';

import React from 'react';
import { LogoIcon } from './icons';
import { Auth } from './Auth';

export const Header: React.FC = () => {
  return (
    <header className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
            <LogoIcon />
            <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
            RealWorth<span className="font-light text-slate-500">.ai</span>
            </h1>
        </div>
        <Auth />
      </div>
    </header>
  );
};
