import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ENGLISH_GRAPH_NODES, ENGLISH_DOMAIN_COLORS } from '@/data/englishKnowledgeGraph';

const MASTERY_FILL = {
  not_started: '#f1f5f9',
  learning:    '#fef9c3',
  practiced:   '#d1fae5',
  mastered:    '#6ee7b7',
};

const MASTERY_STROKE = {
  not_started: '#94a3b8',
  learning:    '#eab308',
  practiced:   '#10b981',
  mastered:    '#059669',
};

function computeLayout(nodes) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const depth = {};
  const visited = new Set();
  const getDepth = (id) => {
    if (depth[id] !== undefined) return depth[id];
    if (visited.has(id)) return 0;
    visited.add(id);
    const prereqs = (nodeMap[id]?.prerequisites || []).filter(p => nodeMap[p]);
    if (prereqs.length === 0) { depth[id] = 0; return 0; }
    depth[id] = Math.max(...prereqs.map(p => getDepth(p))) + 1;
    return depth[id];
  };
  nodes.forEach(n => getDepth(n.id));

  const DOMAIN_ORDER = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
  const byDomain = {};
  nodes.forEach(n => {
    const d = n.domain || 'Other';
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(n);
  });

  const COLS = 7;
  const COL_W = 180;
  const ROW_H = 140;
  const DOMAIN_GAP = 60;
  const PADDING_LEFT = 80;
  const PADDING_TOP = 80;

  const positions = {};
  let currentY = PADDING_TOP;

  DOMAIN_ORDER.forEach((domain) => {
    const group = (byDomain[domain] || []).slice().sort((a, b) => {
      const dd = (depth[a.id] || 0) - (depth[b.id] || 0);
      return dd !== 0 ? dd : a.title.localeCompare(b.title);
    });
    if (group.length === 0) return;

    group.forEach((n, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      positions[n.id] = {
        x: PADDING_LEFT + col * COL_W,
        y: currentY + row * ROW_H,
      };
    });

    const rowsUsed = Math.ceil(group.length / COLS);
    currentY += rowsUsed * ROW_H + DOMAIN_GAP;
  });

  nodes.filter(n => !DOMAIN_ORDER.includes(n.domain)).forEach((n, i) => {
    positions[n.id] = { x: PADDING_LEFT + (i % COLS) * COL_W, y: currentY + Math.floor(i / COLS) * ROW_H };
  });

  return positions;
}

export default function EnglishConceptGraph({ masteryMap, onNodeClick, selectedNodeId }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 20, y: 0, scale: 0.72 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [svgSize, setSvgSize] = useState({ w: 1000, h: 600 });
  const initialized = useRef(false);

  // Merge static nodes with user mastery
  const graphNodes = ENGLISH_GRAPH_NODES.map(n => ({
    ...n,
    mastery_level: masteryMap?.[n.id] || 'not_started',
  }));

  const edges = [];
  const seen = new Set();
  graphNodes.forEach(node => {
    (node.prerequisites || []).forEach(prereqId => {
      const key = `${prereqId}--${node.id}`;
      if (!seen.has(key) && graphNodes.find(n => n.id === prereqId)) {
        seen.add(key);
        edges.push({ from: prereqId, to: node.id });
      }
    });
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setPositions(computeLayout(graphNodes));
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) setSvgSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.scale;
    const my = (e.clientY - rect.top - transform.y) / transform.scale;
    setDragging(nodeId);
    setDragOffset({ x: mx - (positions[nodeId]?.x || 0), y: my - (positions[nodeId]?.y || 0) });
  };

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left - transform.x) / transform.scale;
      const my = (e.clientY - rect.top - transform.y) / transform.scale;
      setPositions(prev => ({ ...prev, [dragging]: { x: mx - dragOffset.x, y: my - dragOffset.y } }));
    } else if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, dragOffset, isPanning, panStart, transform]);

  const handleMouseUp = () => { setDragging(null); setIsPanning(false); setPanStart(null); };

  const handleSvgMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(2.5, transform.scale * delta));
    const scaleChange = newScale / transform.scale;
    setTransform(prev => ({
      scale: newScale,
      x: mouseX - scaleChange * (mouseX - prev.x),
      y: mouseY - scaleChange * (mouseY - prev.y),
    }));
  }, [transform]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const renderEdge = ({ from, to }) => {
    const p1 = positions[from];
    const p2 = positions[to];
    if (!p1 || !p2) return null;
    const R = 36;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return null;
    const ux = dx / dist;
    const uy = dy / dist;
    const x1 = p1.x + ux * R;
    const y1 = p1.y + uy * R;
    const x2 = p2.x - ux * (R + 8);
    const y2 = p2.y - uy * (R + 8);
    const mx = (x1 + x2) / 2 - uy * 20;
    const my = (y1 + y2) / 2 + ux * 20;

    const fromNode = graphNodes.find(n => n.id === from);
    const toNode = graphNodes.find(n => n.id === to);
    const prereqMastered = fromNode?.mastery_level === 'mastered';
    const bothMastered = prereqMastered && toNode?.mastery_level === 'mastered';

    return (
      <path
        key={`${from}--${to}`}
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke={bothMastered ? '#059669' : prereqMastered ? '#a7f3d0' : '#cbd5e1'}
        strokeWidth={bothMastered ? 2 : 1.5}
        opacity={0.8}
        markerEnd={bothMastered ? 'url(#arrow-green-en)' : prereqMastered ? 'url(#arrow-light-en)' : 'url(#arrow-gray-en)'}
      />
    );
  };

  const renderNode = (node) => {
    const pos = positions[node.id];
    if (!pos) return null;
    const domainColor = ENGLISH_DOMAIN_COLORS[node.domain] || { base: '#6b7280', light: '#f3f4f6', dark: '#374151' };
    const fill = MASTERY_FILL[node.mastery_level] || MASTERY_FILL.not_started;
    const stroke = MASTERY_STROKE[node.mastery_level] || MASTERY_STROKE.not_started;
    const isSelected = selectedNodeId === node.id;
    const R = 38;

    const prereqsMastered = (node.prerequisites || []).every(pid => {
      const pn = graphNodes.find(n => n.id === pid);
      return !pn || pn.mastery_level === 'mastered';
    });
    const isLocked = !prereqsMastered && node.mastery_level === 'not_started';

    return (
      <g
        key={node.id}
        transform={`translate(${pos.x}, ${pos.y})`}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
        style={{ cursor: 'pointer' }}
      >
        <circle r={R + 5} fill={domainColor.light} stroke={domainColor.base} strokeWidth={isSelected ? 3 : 1.5} opacity={isSelected ? 1 : 0.6} />
        <circle r={R} fill={isLocked ? '#f8fafc' : fill} stroke={isSelected ? domainColor.dark : stroke} strokeWidth={isSelected ? 2.5 : 1.5} />
        {isLocked && <text textAnchor="middle" dominantBaseline="middle" fontSize={11} y={-6} opacity={0.4}>🔒</text>}
        {!isLocked && <text textAnchor="middle" dominantBaseline="middle" fontSize={18} y={-7}>{node.emoji || '📚'}</text>}
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8.5}
          fill={isLocked ? '#94a3b8' : '#1e293b'}
          fontWeight="600"
          y={isLocked ? 4 : 13}
          style={{ userSelect: 'none' }}
        >
          {node.title.length > 16 ? node.title.slice(0, 15) + '…' : node.title}
        </text>
        <circle cx={R - 6} cy={-(R - 6)} r={7} fill={MASTERY_STROKE[node.mastery_level] || '#94a3b8'} stroke="white" strokeWidth={1.5} />
        <rect x={-28} y={R + 7} width={56} height={13} rx={6} fill={domainColor.base} opacity={0.85} />
        <text textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" fontWeight="700" y={R + 14} style={{ userSelect: 'none' }}>
          {node.domain?.split(' ')[0].toUpperCase()}
        </text>
      </g>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none bg-slate-50 rounded-3xl overflow-hidden">
      {/* Domain legend */}
      <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 z-10 pointer-events-none">
        {Object.entries(ENGLISH_DOMAIN_COLORS).map(([domain, colors]) => (
          <span key={domain} className="text-xs px-2 py-0.5 rounded-full font-semibold text-white shadow-sm" style={{ backgroundColor: colors.base }}>
            {domain}
          </span>
        ))}
      </div>

      {/* Mastery legend */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10 pointer-events-none">
        {[
          { label: 'Mastered', color: '#059669' },
          { label: 'Practiced', color: '#10b981' },
          { label: 'Learning', color: '#eab308' },
          { label: 'Not Started', color: '#94a3b8' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 bg-white/80 rounded-full px-2 py-0.5">
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill={color} /></svg>
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleSvgMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <defs>
          <marker id="arrow-gray-en" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
          </marker>
          <marker id="arrow-light-en" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#a7f3d0" />
          </marker>
          <marker id="arrow-green-en" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#059669" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          <g opacity={0.04}>
            {Array.from({ length: 40 }, (_, i) => (
              <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={5000} stroke="#64748b" strokeWidth={1} />
            ))}
            {Array.from({ length: 60 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 100} x2={5000} y2={i * 100} stroke="#64748b" strokeWidth={1} />
            ))}
          </g>
          {/* Domain band backgrounds */}
          {(() => {
            const DOMAIN_ORDER = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
            const COLS = 7;
            const COL_W = 180;
            const PADDING_LEFT = 80;
            return DOMAIN_ORDER.map(domain => {
              const nodesInDomain = graphNodes.filter(n => n.domain === domain);
              if (nodesInDomain.length === 0) return null;
              const ys = nodesInDomain.map(n => positions[n.id]?.y).filter(y => y !== undefined);
              if (ys.length === 0) return null;
              const minY = Math.min(...ys) - 60;
              const maxY = Math.max(...ys) + 80;
              const color = ENGLISH_DOMAIN_COLORS[domain];
              return (
                <g key={`band-${domain}`}>
                  <rect x={20} y={minY} width={COLS * COL_W + PADDING_LEFT} height={maxY - minY}
                    rx={16} fill={color?.light || '#f8fafc'} stroke={color?.base || '#e2e8f0'} strokeWidth={1.5} opacity={0.5} />
                  <text x={36} y={minY + 22} fontSize={11} fontWeight="700" fill={color?.dark || '#475569'} opacity={0.8}>{domain.toUpperCase()}</text>
                </g>
              );
            });
          })()}

          <g>{edges.map(renderEdge)}</g>
          <g>{graphNodes.map(renderNode)}</g>
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 text-xs text-slate-400 bg-white/70 rounded-full px-2 py-0.5 pointer-events-none">
        Scroll to zoom · Drag to pan · Click node for details
      </div>
    </div>
  );
}
