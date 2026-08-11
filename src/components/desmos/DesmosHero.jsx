import React from 'react';
import { Calculator, Zap, Target, BookOpen } from 'lucide-react';

export default function DesmosHero() {
  return (
    <div className="relative rounded-[2.5rem] overflow-hidden bg-emerald-500 p-8 shadow-2xl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg text-3xl">
            📱
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Righteous, sans-serif' }}>
              Desmos Hacks
            </h1>
            <p className="text-white/80 text-sm">Core strategies for the SAT</p>
          </div>
        </div>
        <p className="text-white/90 text-base max-w-2xl mb-6">
          Learn to use the Desmos graphing calculator as your ultimate SAT math weapon. Master 5 core strategy modules 
          covering linear equations, systems, quadratics, transformations, and advanced algebra — with 50 practice questions.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { icon: Target, label: '50 Practice Questions' },
            { icon: BookOpen, label: '5 Strategy Modules' },
            { icon: Calculator, label: 'Live Desmos Calculator' },
            { icon: Zap, label: 'Step-by-Step Tips' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-1.5 text-sm font-medium">
              <Icon className="w-4 h-4" />
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20">
        <p className="text-white/70 text-xs italic">
          ⚠️ Disclaimer: These techniques are helpful strategies for solving SAT questions using Desmos. Some questions may be solved more quickly through manual methods. Apply based on your own judgment.
        </p>
      </div>
    </div>
  );
}
