import React, { useState } from 'react';
import { ReviewComment } from '../types';

interface ReviewCommentsProps {
  comments: ReviewComment[];
  onAddComment?: (comment: Omit<ReviewComment, 'id' | 'timestamp'>) => void;
  className?: string;
}

export const ReviewComments: React.FC<ReviewCommentsProps> = ({
  comments,
  onAddComment,
  className = ''
}) => {
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState({
    resourceType: 'ult' as const,
    textSelection: '',
    comment: '',
    author: 'Current User'
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.comment.trim() && onAddComment) {
      onAddComment({
        ...newComment,
        reference: '1:1', // This would come from context in real app
        status: 'pending'
      });
      setNewComment({
        resourceType: 'ult',
        textSelection: '',
        comment: '',
        author: 'Current User'
      });
      setIsAddingComment(false);
    }
  };

  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'ult': return 'ULT';
      case 'ust': return 'UST';
      case 'tn': return 'Translation Notes';
      case 'tw': return 'Translation Words';
      default: return type.toUpperCase();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h3 className="text-lg font-light text-slate-800 tracking-wide">
            Review Comments
          </h3>
          <span className="ml-3 text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-full">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        
        <button
          onClick={() => setIsAddingComment(!isAddingComment)}
          className="px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-all duration-300 text-sm shadow-sm"
        >
          {isAddingComment ? '✕' : '+'}
        </button>
      </div>

      {isAddingComment && (
        <form onSubmit={handleSubmitComment} className="mb-6 p-5 bg-slate-50/50 rounded-xl border border-slate-200/50">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Resource Type
              </label>
              <select
                value={newComment.resourceType}
                onChange={(e) => setNewComment({
                  ...newComment,
                  resourceType: e.target.value as any
                })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all"
              >
                <option value="ult">ULT</option>
                <option value="ust">UST</option>
                <option value="tn">Translation Notes</option>
                <option value="tw">Translation Words</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Text Selection
              </label>
              <input
                type="text"
                value={newComment.textSelection}
                onChange={(e) => setNewComment({
                  ...newComment,
                  textSelection: e.target.value
                })}
                placeholder="Selected text..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Comment
            </label>
            <textarea
              value={newComment.comment}
              onChange={(e) => setNewComment({
                ...newComment,
                comment: e.target.value
              })}
              placeholder="Enter your review comment..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all resize-none"
              required
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-all duration-300 text-sm shadow-sm"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setIsAddingComment(false)}
              className="px-4 py-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-all duration-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet. Be the first to add a review comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded p-3 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(comment.timestamp)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(comment.status)}`}>
                    {comment.status}
                  </span>
                </div>
                
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {getResourceTypeLabel(comment.resourceType)}
                </span>
              </div>
              
              {comment.textSelection && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600">Selected text: </span>
                  <span className="text-sm font-mono bg-yellow-100 px-1 rounded">
                    "{comment.textSelection}"
                  </span>
                </div>
              )}
              
              <p className="text-gray-700 text-sm leading-relaxed">
                {comment.comment}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 