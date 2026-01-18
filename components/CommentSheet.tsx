'use client';

import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Comment = {
  id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user_id: string;
  users: {
    id: string;
    name: string;
    picture: string;
  } | null;
  replies?: Comment[];
};

type CommentSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  ownerId: string; // Owner of the treasure (for moderation)
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Convert URLs to clickable links
function linkifyContent(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part.length > 40 ? part.substring(0, 40) + '...' : part}
        </a>
      );
    }
    return part;
  });
}

// Highlight @mentions
function formatContent(text: string): React.ReactNode {
  const mentionRegex = /(@\w+)/g;
  const parts = text.split(mentionRegex);

  return parts.map((part, i) => {
    if (part.match(mentionRegex)) {
      return (
        <span key={i} className="text-teal-600 font-medium">
          {part}
        </span>
      );
    }
    return linkifyContent(part);
  });
}

export function CommentSheet({ isOpen, onClose, appraisalId, ownerId }: CommentSheetProps) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  useEffect(() => {
    if (!isOpen) return;

    async function fetchComments() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/feed/comment?appraisalId=${appraisalId}`, {
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchComments();
  }, [isOpen, appraisalId]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/feed/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          appraisalId,
          content: newComment.trim(),
          parentId: replyingTo?.id || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (replyingTo) {
          // Add reply to parent comment
          setComments(prev =>
            prev.map(c =>
              c.id === replyingTo.id
                ? { ...c, replies: [...(c.replies || []), data.comment] }
                : c
            )
          );
        } else {
          // Add new top-level comment
          setComments(prev => [...prev, { ...data.comment, replies: [] }]);
        }

        setNewComment('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string, parentId?: string | null) => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/feed/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        if (parentId) {
          // Remove reply from parent
          setComments(prev =>
            prev.map(c =>
              c.id === parentId
                ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }
                : c
            )
          );
        } else {
          // Remove top-level comment
          setComments(prev => prev.filter(c => c.id !== commentId));
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Can user delete this comment?
  const canDelete = (comment: Comment) => {
    if (!user) return false;
    return user.id === comment.user_id || user.id === ownerId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col animate-slideUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">No comments yet</p>
              <p className="text-slate-400 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main comment */}
                <div className="flex gap-3">
                  {comment.users?.picture ? (
                    <img
                      src={comment.users.picture}
                      alt=""
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {comment.users?.name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {timeAgo(comment.created_at)}
                      </span>
                      {comment.user_id === ownerId && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 break-words mt-0.5">
                      {formatContent(comment.content)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {user && (
                        <button
                          onClick={() => setReplyingTo(comment)}
                          className="text-xs text-slate-500 hover:text-teal-600 transition-colors"
                        >
                          Reply
                        </button>
                      )}
                      {canDelete(comment) && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-3 border-l-2 border-slate-100 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        {reply.users?.picture ? (
                          <img
                            src={reply.users.picture}
                            alt=""
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">
                              {reply.users?.name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {timeAgo(reply.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 break-words mt-0.5">
                            {formatContent(reply.content)}
                          </p>
                          {canDelete(reply) && (
                            <button
                              onClick={() => handleDelete(reply.id, comment.id)}
                              className="text-xs text-slate-400 hover:text-red-500 transition-colors mt-1"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        {user ? (
          <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
            {replyingTo && (
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-2">
                <span className="text-xs text-slate-500">
                  Replying to <span className="font-medium">{replyingTo.users?.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="text-teal-600 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed px-2"
              >
                {isSubmitting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-slate-200 p-4 text-center">
            <p className="text-sm text-slate-500">Sign in to comment</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default CommentSheet;
