import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import MathText from '@/components/sat/MathText';
import IDKBadge from '@/components/sat/IDKBadge';

const DOMAIN_LABELS = {
  algebra: 'Algebra',
  advanced_algebra: 'Adv. Algebra',
  geometry: 'Geometry',
  trigonometry: 'Trig',
  statistics: 'Statistics',
  problem_solving: 'Problem Solving',
  systems_of_equations: 'Systems',
  quadratics: 'Quadratics',
  exponentials: 'Exponentials',
  ratios_proportions: 'Ratios',
  circles: 'Circles',
  polynomials: 'Polynomials'
};

export default function DiagnosticResponseList({ responses }) {
  if (!responses || responses.length === 0) return null;

  return (
    <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-2">
      {responses.map((r, i) => {
        const isIdk = r.idk || r.user_answer === '__IDK__';
        return (
          <div key={i} className="bg-white p-4 rounded-xl border border-stone-100 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-stone-700">
                  Q{i + 1}. {DOMAIN_LABELS[r.domain] || r.domain?.replace(/_/g, ' ') || 'Unknown'}
                </span>
                {r.difficulty && (
                  <Badge className={`text-[10px] shadow-none ${
                    r.difficulty === 'expert' ? 'bg-stone-700 text-white' :
                    r.difficulty === 'hard' ? 'bg-stone-400 text-white' :
                    r.difficulty === 'medium' ? 'bg-stone-200 text-stone-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>{r.difficulty}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.time_spent_seconds != null && (
                  <span className="flex items-center gap-1 text-[10px] text-stone-400">
                    <Clock className="w-3 h-3" />{r.time_spent_seconds}s
                  </span>
                )}
                {isIdk ? (
                  <IDKBadge />
                ) : (
                  <Badge className={r.correct
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none'
                    : 'bg-red-100 text-red-700 border-red-200 shadow-none'
                  }>
                    {r.correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Question text */}
            <div className="text-sm text-stone-800">
              <MathText>{r.question_text}</MathText>
            </div>

            {/* Options if available */}
            {r.options && r.options.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {r.options.map((opt, j) => {
                  const label = opt.label || opt[0];
                  const text = opt.text || (typeof opt === 'string' ? opt.slice(3) : '');
                  const isCorrectOpt = label === r.correct_answer;
                  const isStudentPick = !isIdk && (
                    r.user_answer === opt || r.user_answer?.[0] === label
                  );
                  return (
                    <div key={j} className={`px-2 py-1.5 rounded-lg border ${
                      isCorrectOpt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                      isStudentPick && !r.correct ? 'border-red-300 bg-red-50 text-red-800' :
                      'border-stone-100 bg-stone-50 text-stone-500'
                    }`}>
                      <span className="font-bold mr-1">{label}.</span> <MathText>{text}</MathText>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer summary for incorrect / IDK */}
            {!r.correct && (
              <div className="flex flex-col gap-1.5 text-xs p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-stone-600 min-w-24">Student Answer:</span>
                  <span className="text-red-600">
                    {isIdk ? <IDKBadge /> : <MathText>{r.user_answer || 'No answer'}</MathText>}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-stone-600 min-w-24">Correct Answer:</span>
                  <span className="text-emerald-600"><MathText>{r.correct_answer}</MathText></span>
                </div>
              </div>
            )}

            {/* Explanation */}
            {r.explanation && (
              <details className="text-xs">
                <summary className="cursor-pointer text-stone-500 hover:text-stone-700 font-medium">
                  Show Explanation
                </summary>
                <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-100 text-stone-700 leading-relaxed">
                  <MathText>{r.explanation}</MathText>
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
