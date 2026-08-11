import React from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function BookmarkButton({ questionData, className = '' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: () => base44.entities.BookmarkedQuestion.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const questionTextStr = questionData?.question_text || questionData?.questionText || '';
  const questionId = questionData?.question_id || questionData?.id || '';
  
  // Find by ID or exactly matching text to avoid duplicates
  const bookmark = bookmarks.find(b => 
    (questionId && b.question_id === questionId) || 
    (questionTextStr && b.question_text === questionTextStr)
  );
  const isBookmarked = !!bookmark;

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await base44.entities.BookmarkedQuestion.delete(bookmark.id);
      } else {
        await base44.entities.BookmarkedQuestion.create({
          user_id: user.id,
          question_id: questionId || `custom_${Date.now()}`,
          question_text: questionTextStr,
          options: questionData?.options || [],
          correct_answer: questionData?.correct_answer || questionData?.correctAnswer || '',
          explanation: questionData?.explanation || '',
          domain: questionData?.domain || questionData?.skill || '',
          difficulty: questionData?.difficulty || 'medium',
          subject: questionData?.subject || 'mixed',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    }
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`} disabled>
        <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`gap-1.5 h-8 px-2.5 rounded-lg shadow-sm border transition-all ${isBookmarked ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:text-stone-700'} ${className}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleMutation.mutate(); }}
      disabled={toggleMutation.isPending}
      type="button"
    >
      {toggleMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isBookmarked ? (
        <><BookmarkCheck className="w-4 h-4" /> <span className="text-xs font-medium">Saved</span></>
      ) : (
        <><Bookmark className="w-4 h-4" /> <span className="text-xs font-medium">Save</span></>
      )}
    </Button>
  );
}
