import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, BookOpen, Target, Sparkles, CheckCircle, TrendingUp, BarChart2 } from 'lucide-react';
import ConceptGraph from '@/components/study/ConceptGraph';
import { DOMAIN_COLORS } from '@/data/satKnowledgeGraph';
import { isIdkEntry } from '@/utils/idk';
import { HelpCircle } from 'lucide-react';
import { useSATKnowledgeGraph } from '@/hooks/useSATKnowledgeGraph';

const MASTERY_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-stone-200 text-stone-600', icon: '○' },
  learning:    { label: 'Learning', color: 'bg-emerald-50 text-emerald-600', icon: '◑' },
  practiced:   { label: 'Practiced', color: 'bg-emerald-100 text-emerald-700', icon: '◕' },
  mastered:    { label: 'Mastered', color: 'bg-emerald-500 text-white', icon: '●' },
};

export default function KnowledgeGraph() {
  const [user, setUser] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'sat' | 'study'

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { mergedNodes, isLoading, practiceSessions = [] } = useSATKnowledgeGraph(user?.id);

  // Stats based on merged graph
  const total = mergedNodes.length;
  const mastered = mergedNodes.filter(n => n.mastery_level === 'mastered').length;
  const gaps = mergedNodes.filter(n => n.mastery_level === 'not_started' || (n.quiz_score !== undefined && n.quiz_score < 2));
  const ready = mergedNodes.filter(n => {
    if (n.mastery_level === 'mastered' || n.mastery_level === 'practiced') return false;
    return (n.prerequisites || []).every(pid => {
      const prereq = mergedNodes.find(x => x.id === pid);
      return !prereq || prereq.mastery_level === 'mastered' || prereq.mastery_level === 'practiced';
    });
  });

  const domainGroups = mergedNodes.reduce((acc, node) => {
    const d = node.domain || 'General';
    if (!acc[d]) acc[d] = [];
    acc[d].push(node);
    return acc;
  }, {});

  // Count "I Don't Know" responses per domain across all practice sessions
  const idkByDomain = {};
  practiceSessions.forEach(s => {
    (s.question_history || []).forEach(q => {
      if (isIdkEntry(q)) idkByDomain[q.domain] = (idkByDomain[q.domain] || 0) + 1;
    });
  });

  // Last updated from sessions
  const lastSession = practiceSessions.sort((a,b) => new Date(b.start_time||0)-new Date(a.start_time||0))[0];

  if (!user) return null;

  return (
    <div className="space-y-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Header */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-2xl md:text-3xl font-bold text-white">SAT Math Knowledge Graph</h1>
            <p className="text-white/80 text-sm">{total} concepts · {mastered} proficient · {ready.length} ready to unlock</p>
            {lastSession && <p className="text-white/60 text-xs mt-0.5">Updates live from your practice sessions</p>}
          </div>
          <div className="sm:ml-auto flex gap-3 flex-wrap">
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{mastered}</div>
              <div className="text-xs text-white/80">Proficient</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{ready.length}</div>
              <div className="text-xs text-white/80">Unlocked</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{total - mastered}</div>
              <div className="text-xs text-white/80">To Practice</div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Loading your knowledge graph...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Stats Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Overall Progress */}
            <Card className="border-4 border-white rounded-3xl shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Overall Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Proficient</span>
                    <span>{mastered}/{total}</span>
                  </div>
                  <Progress value={total ? (mastered / total) * 100 : 0} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(MASTERY_CONFIG).map(([key, cfg]) => {
                    const count = mergedNodes.filter(n => (n.mastery_level || 'not_started') === key).length;
                    return (
                      <div key={key} className={`p-2 rounded-xl text-center text-xs font-medium ${cfg.color}`}>
                        <div className="text-lg font-bold">{count}</div>
                        <div>{cfg.label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Ready to Learn */}
            {ready.length > 0 && (
              <Card className="border-4 border-emerald-200 rounded-3xl shadow-xl bg-emerald-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-emerald-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Ready to Unlock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ready.slice(0, 5).map(node => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="w-full text-left p-2 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{node.emoji || '📚'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-800 truncate">{node.title}</p>
                          <p className="text-xs" style={{ color: DOMAIN_COLORS[node.domain]?.base || '#6b7280' }}>{node.domain}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Domain Progress */}
            <Card className="border-4 border-white rounded-3xl shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  By Domain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(domainGroups).map(([domain, dNodes]) => {
                  const domainMastered = dNodes.filter(n => n.mastery_level === 'mastered').length;
                  const colors = DOMAIN_COLORS[domain] || { base: '#6b7280', light: '#f3f4f6' };
                  const domainIdk = idkByDomain[domain] || 0;
                  return (
                    <div key={domain} className="space-y-1">
                      <div className="flex justify-between text-xs items-center">
                        <span className="font-medium" style={{ color: colors.base }}>{domain}</span>
                        <span className="text-stone-400 flex items-center gap-1.5">
                          {domainIdk > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold"><HelpCircle className="w-3 h-3" />{domainIdk}</span>
                          )}
                          {domainMastered} proficient
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(domainMastered / dNodes.length) * 100}%`, backgroundColor: colors.base }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Graph Area */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-4 border-white rounded-3xl shadow-xl overflow-hidden" style={{ height: '600px' }}>
              <ConceptGraph
                nodes={mergedNodes}
                onNodeClick={(clickedNode) => {
                  const merged = mergedNodes.find(n => n.id === (clickedNode.node_id || clickedNode.id));
                  setSelectedNode(merged || clickedNode);
                }}
                selectedNodeId={selectedNode?.id}
              />
            </Card>

            {/* Node Detail Panel */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                  <Card className="border-4 border-emerald-200 rounded-3xl shadow-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{selectedNode.emoji || '📚'}</span>
                          <div>
                            <CardTitle className="text-lg text-stone-900">{selectedNode.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs" style={{ borderColor: DOMAIN_COLORS[selectedNode.domain]?.base, color: DOMAIN_COLORS[selectedNode.domain]?.base }}>
                                {selectedNode.domain || selectedNode.subject_area || 'General'}
                              </Badge>
                              <Badge className={`text-xs ${MASTERY_CONFIG[selectedNode.mastery_level || 'not_started'].color}`}>
                                {MASTERY_CONFIG[selectedNode.mastery_level || 'not_started'].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} className="rounded-full">✕</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-stone-600">{selectedNode.description}</p>

                      {/* Prerequisites */}
                      {(selectedNode.prerequisites || []).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-stone-500 mb-1">Prerequisites:</p>
                          <div className="flex flex-wrap gap-1">
                            {(selectedNode.prerequisites || []).map(pid => {
                              const prereq = mergedNodes.find(n => n.id === pid);
                              if (!prereq) return null;
                              return (
                                <button
                                  key={pid}
                                  onClick={() => setSelectedNode(prereq)}
                                  className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${
                                    prereq.mastery_level === 'mastered'
                                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                      : 'bg-stone-100 border-stone-300 text-stone-600 hover:border-stone-400'
                                  }`}
                                >
                                  {prereq.mastery_level === 'mastered' ? '✓' : '○'} {prereq.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Accuracy from sessions */}
                      {selectedNode._domainStats && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <BarChart2 className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-700">Tracked from your practice sessions</span>
                          <Badge className="ml-auto bg-blue-100 text-blue-700 text-xs">Live</Badge>
                        </div>
                      )}

                      {selectedNode.quiz_score !== undefined && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-stone-600">Quiz score: <strong>{selectedNode.quiz_score}/3</strong></span>
                          {selectedNode.quiz_score < 2 && (
                            <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">Needs review</Badge>
                          )}
                          {selectedNode.quiz_score >= 2 && (
                            <CheckCircle className="ml-auto w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      )}

                      <Link to={`${createPageUrl('SATPractice')}`}>
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-full text-white">
                          <Target className="w-3 h-3 mr-1" />
                          Practice: {selectedNode.title}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
