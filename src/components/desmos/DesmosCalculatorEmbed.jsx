import React, { useState } from 'react';
import { Calculator, ExternalLink } from 'lucide-react';

export default function DesmosCalculatorEmbed() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-900">Desmos Graphing Calculator</span>
        </div>
        <a
          href="https://www.desmos.com/calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 underline"
        >
          <ExternalLink className="w-3 h-3" />
          Open Full Screen
        </a>
      </div>

      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-200 bg-stone-50" style={{ height: '600px' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-50">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-3 text-2xl">📱</div>
              <p className="text-sm font-medium text-stone-600">Loading Desmos Calculator...</p>
            </div>
          </div>
        )}
        <iframe
          src="https://www.desmos.com/calculator"
          width="100%"
          height="100%"
          title="Desmos Graphing Calculator"
          onLoad={() => setLoaded(true)}
          className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ border: 'none' }}
        />
      </div>

      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
        <p className="text-xs text-emerald-700 font-medium mb-1">💡 Quick Tips:</p>
        <ul className="text-xs text-emerald-600 space-y-0.5">
          <li>• Type equations directly and press Enter to graph</li>
          <li>• Click intersection points to see coordinates</li>
          <li>• Use <strong>|expression|</strong> for absolute value</li>
          <li>• Add sliders by typing a variable (like "a") and clicking "Create Slider"</li>
          <li>• Use sqrt() for square roots and ^ for exponents</li>
        </ul>
      </div>
    </div>
  );
}
