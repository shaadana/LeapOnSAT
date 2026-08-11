import React from 'react';
import MathText from './MathText';

/**
 * Parses an explanation string and renders it as a beautifully formatted
 * step-by-step breakdown. Detects numbered steps, key terms, and equations.
 */
function parseSteps(text) {
  if (!text) return [];

  // Split on numbered steps: "1.", "2.", "Step 1:", "Step 1.", etc.
  const stepPattern = /(?:^|\n)\s*(?:Step\s*)?\d+[.)]\s+/g;
  const matches = [];
  let match;
  while ((match = stepPattern.exec(text)) !== null) {
    matches.push(match.index);
  }

  if (matches.length < 2) return null; // fall through to prose rendering

  const steps = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1] : text.length;
    const raw = text.slice(start, end).trim();
    const cleaned = raw.replace(/^(?:Step\s*)?\d+[.)]\s+/, '').trim();
    steps.push(cleaned);
  }
  return steps;
}

/**
 * Highlight key math patterns like "= X", numeric answers, important phrases
 */
function HighlightedText({ children }) {
  const text = children || '';
  return <MathText>{text}</MathText>;
}

export default function ExplanationText({ children, className = '', isCorrect = true }) {
  const text = (children || '').trim();
  const steps = parseSteps(text);

  // Step color scheme
  const stepColors = isCorrect
    ? ['bg-emerald-500', 'bg-emerald-400', 'bg-teal-500', 'bg-teal-400', 'bg-green-500']
    : ['bg-amber-500', 'bg-amber-400', 'bg-orange-500', 'bg-orange-400', 'bg-yellow-500'];

  const stepLabels = ['Set Up', 'Solve', 'Check', 'Simplify', 'Result', 'Step'];

  if (steps && steps.length >= 2) {
    return (
      <div className={`space-y-5 ${className}`}>
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            {/* Step number badge */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full ${stepColors[idx % stepColors.length]} flex items-center justify-center text-white text-sm font-bold shadow-sm mt-0.5`}>
              {idx + 1}
            </div>
            {/* Step content */}
            <div className="flex-1 min-w-0">
              {/* Auto-label based on position */}
              <span className={`text-xs font-semibold uppercase tracking-wide ${isCorrect ? 'text-emerald-600' : 'text-amber-600'} mr-2`}>
                {stepLabels[idx] || `Step ${idx + 1}`}:
              </span>
              <span className="text-gray-700 block mt-1">
                <HighlightedText>{step}</HighlightedText>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No numbered steps — render as nicely-wrapped prose with sentence breaks
  // Split on period + space + capital letter to separate logical sentences
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z0-9])/).filter(s => s.trim());

  if (sentences.length <= 1) {
    return (
      <div className={className}>
        <MathText>{text}</MathText>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {sentences.map((sentence, idx) => {
        return (
          <div key={idx} className="flex gap-3 items-start">
            {idx === 0 ? (
              <span className={`flex-shrink-0 text-sm font-bold mt-1.5 ${isCorrect ? 'text-emerald-500' : 'text-amber-500'}`}>→</span>
            ) : (
              <span className="flex-shrink-0 text-sm text-gray-300 mt-1.5">·</span>
            )}
            <div className="flex-1 text-gray-700">
              <MathText>{sentence.trim()}</MathText>
            </div>
          </div>
        );
      })}
    </div>
  );
}
