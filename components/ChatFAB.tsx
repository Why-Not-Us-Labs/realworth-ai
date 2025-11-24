'use client';

import React, { useState, useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ChatInterface from './ChatInterface';

export default function ChatFAB() {
  const { user } = useContext(AuthContext);
  const { isPro } = useSubscription(user?.id || null);
  const [showChat, setShowChat] = useState(false);

  // Only show for Pro users
  if (!user || !isPro) return null;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Chat with AI"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="w-full md:max-w-lg h-[85vh] md:h-[600px] md:max-h-[80vh]">
            <ChatInterface
              userId={user.id}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
