import React, { useState } from 'react';
import { Calculator, TrendingUp, PenLine, FileText } from 'lucide-react';
import ScientificCalculator from './ScientificCalculator';
import GraphingCalculator from './GraphingCalculator';
import ScratchPad from './ScratchPad';
import DraggablePanel from './DraggablePanel';

export default function CalculatorPanel({ expressionsToLoad, tools }) {
  const [showScientific, setShowScientific] = useState(false);
  const [showGraphing, setShowGraphing] = useState(false);
  const [showScratchPad, setShowScratchPad] = useState(false);
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);

  // tools is an optional override (e.g. from assignments) — undefined = enabled by default
  const sciOn   = !tools || tools.scientific_calculator !== false;
  const graphOn = !tools || tools.graphing_calculator   !== false;
  const padOn   = !tools || tools.scratch_pad           !== false;
  const formulasOn = !tools || tools.formula_sheet !== false;

  if (!sciOn && !graphOn && !padOn && !formulasOn) return null;

  return (
    <div className="flex gap-2 items-center">
      {sciOn && (
      <button
        onClick={() => setShowScientific(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          showScientific
            ? 'bg-stone-700 text-white border-stone-700'
            : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500 hover:bg-stone-50'
        }`}
        title="TI-84 Scientific Calculator"
      >
        <Calculator className="w-3.5 h-3.5" />
        Scientific
      </button>
      )}

      {graphOn && (
      <button
        onClick={() => setShowGraphing(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          showGraphing
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-stone-600 border-stone-300 hover:border-emerald-400 hover:bg-emerald-50'
        }`}
        title="Desmos Graphing Calculator"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        Graphing
      </button>
      )}

      {padOn && (
      <button
        onClick={() => setShowScratchPad(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          showScratchPad
            ? 'bg-stone-600 text-white border-stone-600'
            : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400 hover:bg-stone-50'
        }`}
        title="Scratch Pad"
      >
        <PenLine className="w-3.5 h-3.5" />
        Scratch Pad
      </button>
      )}

      {formulasOn && (
      <button
        onClick={() => setShowFormulaSheet(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          showFormulaSheet
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-blue-600 border-blue-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        title="Formula Sheet"
      >
        <FileText className="w-3.5 h-3.5" />
        Formula Sheet
      </button>
      )}

      {/* Floating panels — each manages its own position via DraggablePanel */}
      {showScientific && (
        <ScientificCalculator onClose={() => setShowScientific(false)} />
      )}
      {showGraphing && (
        <GraphingCalculator
          onClose={() => setShowGraphing(false)}
          expressionsToLoad={expressionsToLoad}
        />
      )}
      {showScratchPad && (
        <ScratchPad onClose={() => setShowScratchPad(false)} />
      )}
      {showFormulaSheet && (
        <DraggablePanel
          title="Formula Sheet"
          onClose={() => setShowFormulaSheet(false)}
          defaultPosition={{ x: window.innerWidth > 600 ? window.innerWidth - 550 : 20, y: 100 }}
        >
          <div className="w-[500px] h-[600px] bg-white overflow-hidden rounded-b-xl max-w-[100vw]">
            <iframe 
              src="https://media.base44.com/files/public/697af105929434f3d29062c7/a7e44d73b_FormulasheetforSAT_260521_205732.pdf" 
              className="w-full h-full border-none"
              title="Formula Sheet"
            />
          </div>
        </DraggablePanel>
      )}
    </div>
  );
}
