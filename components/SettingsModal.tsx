'use client';

import React, { useState, useContext } from 'react';
import { AuthContext } from '@/components/contexts/AuthContext';
import { authService } from '@/services/authService';
import { GearIcon } from '@/components/icons';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAccount: () => void;
};

export function SettingsModal({ isOpen, onClose, onDeleteAccount }: SettingsModalProps) {
  const { user } = useContext(AuthContext);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authService.signOut();
      onClose();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Options */}
        <div className="p-2">
          {/* Account Section */}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Account</p>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </span>
          </button>

          {/* Divider */}
          <div className="my-2 border-t border-slate-100" />

          {/* Danger Zone */}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Danger Zone</p>
          </div>

          {/* Delete Account */}
          <button
            onClick={onDeleteAccount}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm font-medium">Delete Account</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">
            {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
