import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

/**
 * Reusable "I Don't Know" button shown next to the answer-submit action.
 * Pressing it records the question as not-known (incorrect, but flagged) and
 * reveals the correct answer + explanation, just like a submitted answer.
 */
export default function IDontKnowButton({ onClick, disabled, className = '' }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={`border-2 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 rounded-full font-bold ${className}`}
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      I Don't Know
    </Button>
  );
}
