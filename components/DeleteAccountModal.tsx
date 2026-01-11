'use client';

import React, { useEffect, useCallback, useState, useContext } from 'react';
import { XIcon, AlertIcon } from './icons';
import { AuthContext } from './contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { user } = useContext(AuthContext);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    },
    [onClose, isDeleting]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Reset state when modal opens
      setConfirmText('');
      setError(null);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE' || !user) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('No active session. Please sign in again.');
        setIsDeleting(false);
        return;
      }

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out locally
      await supabase.auth.signOut();

      // Notify parent component
      onDeleted();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const canDelete = confirmText === 'DELETE' && !isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        {!isDeleting && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}

        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Delete Account</h2>
          <p className="text-sm text-slate-500 mt-2">
            This action cannot be undone. All your data will be permanently deleted.
          </p>
        </div>

        {/* What will be deleted */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-red-800 mb-2">This will permanently delete:</p>
          <ul className="text-sm text-red-700 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>All your appraisals and valuations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>All your collections</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>Your friend connections</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>Your subscription (if active)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">-</span>
              <span>Your account and profile</span>
            </li>
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            disabled={isDeleting}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </span>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
