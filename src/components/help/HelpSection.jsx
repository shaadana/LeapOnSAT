import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

const FAQ = [
  {
    q: "How do I start practicing SAT Math?",
    a: "Go to SAT Practice from the top nav. Choose Blitz (fast), Class (structured), or Choice (custom) mode, then hit Start Session. The app adapts to your level automatically."
  },
  {
    q: "What is the Diagnostic?",
    a: "The Diagnostic is a short adaptive test that assesses your executive functioning, mindset, and motivation. It helps LeapOn personalize your learning experience. Find it under Profile → Diagnostic."
  },
  {
    q: "What is the SAT Diagnostic?",
    a: "The SAT Diagnostic is a 4-6 minute adaptive quiz that maps out your SAT Math strengths and knowledge gaps by topic. Access it from SAT Diagnostic in the top nav."
  },
  {
    q: "How do Study Habits work?",
    a: "Study Habits uses the Tiny Habits method: pick an anchor moment, a tiny behavior, and a celebration. The AI can generate personalized habits based on your diagnostic results. Find it under Learn → Study Habits."
  },
  {
    q: "What is the Knowledge Graph?",
    a: "The Knowledge Graph is a visual map of all SAT Math topics and how they connect. It shows your mastery level per topic and highlights gaps. Go to Learn → Knowledge Graph."
  },
  {
    q: "How do I join a class or family?",
    a: "Ask your teacher or parent for their join code. Then go to My Groups and enter the code to connect."
  },
  {
    q: "What is the AI Coach?",
    a: "My Coach is your personal AI learning assistant. It knows your diagnostic results and can give personalized advice, help with SAT problems, and guide your study plan. Access it from My Coach in the nav."
  },
  {
    q: "How does Independent Study work?",
    a: "Paste in a topic outline or upload a document and the AI generates a structured study plan with lessons and quizzes for each concept. Find it under Learn → Independent Study."
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-emerald-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-emerald-50/50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 bg-emerald-50/30 text-sm text-gray-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function HelpSection({ onStartTour }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          Help & Feature Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-800 text-sm">New to LeapOn?</p>
            <p className="text-xs text-emerald-600 mt-0.5">Take the quick tour to learn what every feature does.</p>
          </div>
          <Button
            onClick={onStartTour}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs px-4 whitespace-nowrap"
            size="sm"
          >
            <PlayCircle className="w-4 h-4 mr-1" />
            Start Tour
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequently Asked Questions</p>
          {FAQ.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
