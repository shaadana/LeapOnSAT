import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import DraggablePanel from './DraggablePanel';

export default function GraphingCalculator({ onClose, expressionsToLoad }) {
  const containerRef = useRef(null);
  const calculatorRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.getElementById('desmos-script');
    if (existingScript && window.Desmos) {
      initDesmos();
      return;
    }
    if (existingScript) {
      existingScript.addEventListener('load', initDesmos);
      return;
    }

    const script = document.createElement('script');
    script.id = 'desmos-script';
    script.src = 'https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6';
    script.async = true;
    script.onload = initDesmos;
    document.head.appendChild(script);

    return () => {
      if (calculatorRef.current) {
        calculatorRef.current.destroy();
        calculatorRef.current = null;
      }
    };
  }, []);

  const initDesmos = () => {
    if (!containerRef.current || calculatorRef.current) return;
    try {
      calculatorRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
        keypad: true,
        expressions: true,
        settingsMenu: true,
        zoomButtons: true,
        expressionsTopbar: true,
        pointsOfInterest: true,
        trace: true,
        border: false,
        lockViewport: false,
        expressionIcons: true,
        capExpressionSize: false,
        administerSecretFolders: false,
        images: true,
        folders: true,
        notes: true,
        sliders: true,
        links: false,
        distributions: true,
        pasteTableData: true,
        showResetButtonOnGraphpaper: true,
        autosize: true,
        plotImplicits: true,
        plotSingleVariableImplicitEquations: true,
        language: 'en',
      });
      setLoaded(true);
    } catch (e) {
      console.error('Desmos init error:', e);
    }
  };

  // Load AI-suggested expressions into Desmos when they arrive
  useEffect(() => {
    if (!loaded || !calculatorRef.current || !expressionsToLoad?.length) return;
    calculatorRef.current.setBlank();
    expressionsToLoad.forEach((expr, i) => {
      calculatorRef.current.setExpression({ id: `expr-${i}`, latex: expr });
    });
  }, [expressionsToLoad, loaded]);

  // Notify Desmos to resize when the panel size changes
  const notifyResize = useCallback(() => {
    if (calculatorRef.current) {
      setTimeout(() => calculatorRef.current?.resize(), 60);
    }
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(notifyResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [notifyResize]);

  const headerSlot = (
    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors">
      <X className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <DraggablePanel
      defaultPos={{ x: Math.max(20, window.innerWidth / 2 - 380), y: 88 }}
      defaultSize={{ w: 720, h: 520 }}
      minSize={{ w: 400, h: 300 }}
      maxSize={{ w: 1100, h: 800 }}
      zIndex={9999}
      title="Desmos Graphing Calculator"
      headerSlot={headerSlot}
      headerBg="bg-slate-800"
    >
      <div className="bg-white w-full h-full relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading Desmos...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </DraggablePanel>
  );
}
