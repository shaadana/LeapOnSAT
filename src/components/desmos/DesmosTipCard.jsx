import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, ChevronDown } from 'lucide-react';

export default function DesmosTipCard({ tip, index, onTryIt }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <Card className="border-2 border-emerald-100 rounded-2xl overflow-hidden">
      <button
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-emerald-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{tip.title}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 border-t border-emerald-50">
          {/* Body text — whitespace-pre-line to preserve line breaks from PDF */}
          <p className="text-sm text-gray-700 mb-4 leading-relaxed mt-3 whitespace-pre-line">{tip.body}</p>

          {tip.desmosExpression && (
            <div className="bg-stone-900 rounded-xl p-4 mb-3">
              <p className="text-xs text-stone-400 mb-2 font-mono font-semibold">▶ Type into Desmos:</p>
              <pre className="text-emerald-400 text-sm font-mono whitespace-pre-wrap leading-relaxed">{tip.desmosExpression}</pre>
            </div>
          )}

          <Button
            size="sm"
            onClick={onTryIt}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            Open Calculator Tab
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
