import React from 'react';
import { HelpCircle } from 'lucide-react';

/** Small inline badge marking a question the student answered "I Don't Know". */
export default function IDKBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 text-xs font-semibold ${className}`}>
      <HelpCircle className="w-3 h-3" />
      Didn't Know
    </span>
  );
}
