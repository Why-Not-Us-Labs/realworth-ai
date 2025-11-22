
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import { dbService } from '@/services/dbService';
import { UserPlusIcon, CheckIcon, ClockIcon, UserIcon } from './icons';

interface FriendButtonProps {
  targetUserId: string;
  targetUserName: string;
}

export const FriendButton: React.FC<FriendButtonProps> = ({ targetUserId, targetUserName }) => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isRequester, setIsRequester] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user || user.id === targetUserId) {
        setLoading(false);
        return;
      }

      const result = await dbService.getFriendshipStatus(user.id, targetUserId);
      if (result) {
        setStatus(result.status);
        setFriendshipId(result.friendshipId || null);
        setIsRequester(result.isRequester || false);
      }
      setLoading(false);
    };

    checkStatus();
  }, [user, targetUserId]);

  if (!user || user.id === targetUserId || loading) {
    return null;
  }

  const handleSendRequest = async () => {
    setActionLoading(true);
    const success = await dbService.sendFriendRequest(user.id, targetUserId);
    if (success) {
      setStatus('pending');
      setIsRequester(true);
    }
    setActionLoading(false);
  };

  const handleAccept = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    const success = await dbService.respondToFriendRequest(friendshipId, 'accepted');
    if (success) {
      setStatus('accepted');
    }
    setActionLoading(false);
  };

  const handleDecline = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    const success = await dbService.respondToFriendRequest(friendshipId, 'declined');
    if (success) {
      setStatus('declined');
    }
    setActionLoading(false);
  };

  const handleRemove = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    const success = await dbService.removeFriend(friendshipId);
    if (success) {
      setStatus(null);
      setFriendshipId(null);
    }
    setActionLoading(false);
  };

  // Already friends
  if (status === 'accepted') {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckIcon className="w-4 h-4" />
          Friends
        </span>
        <button
          onClick={handleRemove}
          disabled={actionLoading}
          className="text-xs text-slate-500 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  // Request pending - you sent it
  if (status === 'pending' && isRequester) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
        <ClockIcon className="w-4 h-4" />
        Request Sent
      </span>
    );
  }

  // Request pending - you received it
  if (status === 'pending' && !isRequester) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAccept}
          disabled={actionLoading}
          className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold py-1.5 px-3 rounded-full transition-colors"
        >
          <CheckIcon className="w-4 h-4" />
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={actionLoading}
          className="text-sm text-slate-500 hover:text-red-500 transition-colors"
        >
          Decline
        </button>
      </div>
    );
  }

  // No relationship - show add friend button
  return (
    <button
      onClick={handleSendRequest}
      disabled={actionLoading}
      className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold py-1.5 px-3 rounded-full transition-colors disabled:opacity-50"
    >
      <UserPlusIcon className="w-4 h-4" />
      Add Friend
    </button>
  );
};
