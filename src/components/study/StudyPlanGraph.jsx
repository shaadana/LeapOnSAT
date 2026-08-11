import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DOMAIN_COLORS } from '@/data/satKnowledgeGraph';

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

// Lay out nodes left-to-right by dependency depth
function computeLayout(nodes, edges) {
  const depth = {};
  const getDepth = (id) => {
    if (depth[id] !== undefined) return depth[id];
    const prereqs = edges.filter(e => e.to === id).map(e => e.from);
    if (!prereqs.length) { depth[id] = 0; return 0; }
    depth[id] = Math.max(...prereqs.map(p => getDepth(p))) + 1;
    return depth[id];
  };
  nodes.forEach(n => getDepth(n.id));

  const byDepth = {};
  nodes.forEach(n => {
    const d = depth[n.id] || 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n);
  });

  const COL_W = 200;
  const ROW_H = 140;
  const positions = {};
  Object.entries(byDepth).forEach(([d, nodesInCol]) => {
    const totalH = nodesInCol.length * ROW_H;
    nodesInCol.forEach((n, i) => {
      positions[n.id] = {
        x: 80 + Number(d) * COL_W,
        y: 80 + i * ROW_H - (totalH / 2) + 300,
      };
    });
  });
  return positions;
}

export default function StudyPlanGraph({ nodes, onNodeClick, selectedNodeId }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 40, y: 0, scale: 0.9 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const initialized = useRef(false);

  // Build edges from related_node_ids or prerequisites
  const edges = [];
  const edgeSeen = new Set();
  nodes.forEach(n => {
    (n.prerequisites || n.related_node_ids || []).forEach(pid => {
      const key = `${pid}--${n.id}`;
      if (!edgeSeen.has(key) && nodes.find(x => x.id === pid || x.node_id === pid)) {
        edgeSeen.add(key);
        edges.push({ from: pid, to: n.id });
      }
    });
  });

  useEffect(() => {
    if (initialized.current || !nodes.length) return;
    initialized.current = true;
    // Simple circular layout if no edges, otherwise depth-based
    if (!edges.length) {
      const positions = {};
      const cx = 400, cy = 300, r = Math.min(200, nodes.length * 35);
      nodes.forEach((n, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
        positions[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
      });
      setPositions(positions);
    } else {
      setPositions(computeLayout(nodes, edges));
    }
  }, [nodes]);

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
    const newScale = Math.max(0.2, Math.min(3, transform.scale * delta));
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
    const p1 = positions[from] || positions[nodes.find(n => n.node_id === from)?.id];
    const p2 = positions[to] || positions[nodes.find(n => n.node_id === to)?.id];
    if (!p1 || !p2) return null;
    const R = 38;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return null;
    const ux = dx / dist, uy = dy / dist;
    const x1 = p1.x + ux * R, y1 = p1.y + uy * R;
    const x2 = p2.x - ux * (R + 8), y2 = p2.y - uy * (R + 8);
    const mx = (x1 + x2) / 2 - uy * 20;
    const my = (y1 + y2) / 2 + ux * 20;
    const fromNode = nodes.find(n => n.id === from || n.node_id === from);
    const toNode = nodes.find(n => n.id === to || n.node_id === to);
    const bothMastered = fromNode?.mastery_level === 'mastered' && toNode?.mastery_level === 'mastered';
    return (
      <path key={`${from}--${to}`}
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke={bothMastered ? '#059669' : '#cbd5e1'}
        strokeWidth={bothMastered ? 2 : 1.5}
        markerEnd={bothMastered ? 'url(#arrow-green-sp)' : 'url(#arrow-gray-sp)'}
      />
    );
  };

  const renderNode = (node) => {
    const pos = positions[node.id];
    if (!pos) return null;
    const fill = MASTERY_FILL[node.mastery_level || 'not_started'];
    const stroke = MASTERY_STROKE[node.mastery_level || 'not_started'];
    const isSelected = selectedNodeId === node.id || selectedNodeId === node.node_id;
    const R = 38;
    const typeColors = {
      concept: '#6366f1', skill: '#10b981', review: '#f59e0b',
    };
    const typeColor = typeColors[node.type] || '#6b7280';

    return (
      <g key={node.id}
        transform={`translate(${pos.x}, ${pos.y})`}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}
        style={{ cursor: 'pointer' }}
      >
        {/* Type color ring */}
        <circle r={R + 5} fill={`${typeColor}22`} stroke={typeColor} strokeWidth={isSelected ? 3 : 1.5} opacity={isSelected ? 1 : 0.5} />
        {/* Main node */}
        <circle r={R} fill={fill} stroke={isSelected ? typeColor : stroke} strokeWidth={isSelected ? 2.5 : 1.5} />
        {/* Emoji */}
        <text textAnchor="middle" dominantBaseline="middle" fontSize={20} y={-8}>{node.emoji || '📚'}</text>
        {/* Title */}
        <text textAnchor="middle" dominantBaseline="middle" fontSize={8.5} fill="#1e293b" fontWeight="600" y={13} style={{ userSelect: 'none' }}>
          {node.title.length > 14 ? node.title.slice(0, 13) + '…' : node.title}
        </text>
        {/* Type badge */}
        <rect x={-20} y={R + 6} width={40} height={12} rx={5} fill={typeColor} opacity={0.85} />
        <text textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" fontWeight="700" y={R + 13} style={{ userSelect: 'none' }}>
          {(node.type || 'concept').toUpperCase()}
        </text>
        {/* Mastery dot */}
        <circle cx={R - 6} cy={-(R - 6)} r={7} fill={stroke} stroke="white" strokeWidth={1.5} />
      </g>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none bg-slate-50 rounded-2xl overflow-hidden">
      {/* Type legend */}
      <div className="absolute top-2 left-2 flex gap-2 z-10 pointer-events-none flex-wrap">
        {[['concept','#6366f1'],['skill','#10b981'],['review','#f59e0b']].map(([type, color]) => (
          <span key={type} className="text-xs px-2 py-0.5 rounded-full font-semibold text-white shadow-sm" style={{ backgroundColor: color }}>
            {type}
          </span>
        ))}
      </div>
      {/* Mastery legend */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10 pointer-events-none">
        {[['Mastered','#059669'],['Practiced','#10b981'],['Learning','#eab308'],['Not Started','#94a3b8']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5 bg-white/80 rounded-full px-2 py-0.5">
            <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill={color} /></svg>
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>
      <svg ref={svgRef} width="100%" height="100%"
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} onMouseDown={handleSvgMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <defs>
          <marker id="arrow-gray-sp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#cbd5e1" />
          </marker>
          <marker id="arrow-green-sp" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#059669" />
          </marker>
        </defs>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          <g>{edges.map(renderEdge)}</g>
          <g>{nodes.map(renderNode)}</g>
        </g>
      </svg>
      <div className="absolute bottom-2 left-2 text-xs text-slate-400 bg-white/70 rounded-full px-2 py-0.5 pointer-events-none">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
