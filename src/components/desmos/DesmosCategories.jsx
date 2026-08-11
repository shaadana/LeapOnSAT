import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, BookOpen } from 'lucide-react';
import { DESMOS_LESSONS } from '@/data/desmosLessons';
import { motion } from 'framer-motion';

export default function DesmosCategories({ onSelectLesson }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Choose a Lesson Module</p>
      <div className="grid md:grid-cols-2 gap-4">
        {DESMOS_LESSONS.map((lesson, i) => (
          <motion.div key={lesson.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Card
              className="cursor-pointer bg-white border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-xl transition-all h-full rounded-2xl"
              onClick={() => onSelectLesson(lesson)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md text-2xl">
                  {lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{lesson.title}</h3>
                    <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{lesson.subtitle}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">
                      {lesson.questionCount} Questions
                    </span>
                    <span className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 font-medium">
                      {lesson.tips.length} Hacks
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">How to Use This Section</p>
            <p className="text-xs text-emerald-700 mt-1">Each module teaches you core Desmos strategies through worked examples, then tests you with real SAT-style questions. Use the embedded calculator to try each hack yourself before checking explanations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
