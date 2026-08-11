import React from 'react';
import { Button } from '@/components/ui/button';

export default function MathKeyboard({ onInsert }) {
  const symbols = [
    { label: '√', value: '√' },
    { label: 'π', value: 'π' },
    { label: '^', value: '^' },
    { label: '/', value: '/' },
    { label: '±', value: '±' },
    { label: '°', value: '°' },
    { label: 'θ', value: 'θ' },
    { label: '≤', value: '≤' },
    { label: '≥', value: '≥' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {symbols.map(s => (
        <Button 
          key={s.label} 
          variant="outline" 
          size="sm" 
          type="button"
          className="h-8 px-3 text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
          onClick={() => onInsert(s.value)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
