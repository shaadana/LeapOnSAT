import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BookOpen, Target, Sparkles, CheckCircle, TrendingUp, PenTool, Lock, BarChart2, Zap } from "lucide-react";
import EnglishConceptGraph from "@/components/english/EnglishConceptGraph";
import { ENGLISH_GRAPH_NODES, ENGLISH_DOMAIN_COLORS } from "@/data/englishKnowledgeGraph";
import { GRAMMAR_DOMAINS } from "@/data/englishGrammarRules";

const MASTERY_CONFIG = {
  not_started: { label: "Not Started",  color: "bg-stone-200 text-stone-600", icon: "○" },
  learning:    { label: "Seen Once",    color: "bg-sky-50 text-sky-600 border border-sky-200", icon: "◔" },
  practiced:   { label: "In Progress",  color: "bg-amber-100 text-amber-700", icon: "◑" },
  mastered:    { label: "Proficient",   color: "bg-emerald-100 text-emerald-800", icon: "◕" },
};

export default function EnglishKnowledgeGraph() {
  const [user, setUser] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch all English practice sessions for this user
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["englishSessions", user?.id],
    queryFn: () => base44.entities.EnglishPracticeSession.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Fetch user profile to check if English diagnostic was done
  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const userProfile = profiles[0];

  const englishDiagScores = userProfile?.english_performance?.domain_scores || {};
  const englishOverallAcc = userProfile?.english_performance?.diagnostic_accuracy;

  const SCORE_TO_MASTERY = (score) => {
    if (score >= 85) return 'mastered';
    if (score >= 65) return 'practiced';
    if (score >= 40) return 'learning';
    return 'not_started';
  };

  const hasEnglishData =
    sessions.length > 0 ||
    (userProfile?.english_performance?.total_questions_attempted > 0) ||
    Object.keys(englishDiagScores).length > 0 ||
    (englishOverallAcc != null && englishOverallAcc > 0);

  // Map question domain keys → ALL related knowledge graph node IDs.
  // The diagnostic uses high-level domains (e.g. "commas") while the graph
  // breaks each into multiple nodes (commas_series, commas_intro, …).
  // A single diagnostic score should seed ALL related nodes so the graph
  // visibly reflects the diagnostic.
  const DOMAIN_TO_NODES = {
    apostrophes:           ["apostrophes_possess", "apostrophes_contract"],
    semicolons_periods:    ["semicolons", "boundaries", "comma_splice"],
    commas:                ["commas_series", "commas_intro", "commas_nonessential", "commas_fanboys"],
    colons:                ["colons"],
    dashes:                ["dashes"],
    conciseness:           ["conciseness", "eliminating_redundancy", "wordiness_fix"],
    parallel_structure:    ["parallel", "parallel_correlative"],
    subject_verb_agreement:["sva_basic", "sva_tricky", "sva_collective"],
    pronoun_agreement:     ["pronoun_agree"],
    pronoun_case:          ["pronoun_case", "pronoun_reference"],
    verb_tense:            ["verb_tense", "perfect_tenses", "subjunctive"],
    adjectives_adverbs:    ["idioms"],
    word_pairs:            ["parallel_correlative"],
    who_which_whom:        ["pronoun_case"],
    modifiers:             ["modifiers", "misplaced_modifiers"],
    idioms_diction:        ["idioms"],
    transitions:           ["transitions_basic", "transitions_cause", "transitions_contrast", "transitions_sequence"],
    vocabulary:            ["words_in_context", "connotation", "register_formality"],
    reading_comprehension: ["reading_basics", "central_ideas", "inference_close", "inference_vs_stated"],
    main_idea:             ["central_ideas", "topic_vs_main", "supporting_details"],
    inference:             ["inference_close", "inference_vs_stated", "logical_flaws"],
    evidence_support:      ["command_evidence_textual", "command_evidence_quant", "evidence_pairs"],
    tone_purpose:          ["text_structure", "tone_single", "tone_shift", "authors_purpose"],
  };

  // Build mastery map from session history + diagnostic scores
  const masteryMap = useMemo(() => {
    const map = {};
    const MASTERY_LIST = ['not_started','learning','practiced','mastered'];
    const setIfBetter = (nodeId, mastery) => {
      if (!map[nodeId] || MASTERY_LIST.indexOf(mastery) > MASTERY_LIST.indexOf(map[nodeId])) {
        map[nodeId] = mastery;
      }
    };

    const hasPerDomain = Object.keys(englishDiagScores).length > 0;

    // Dynamically calculate domain scores from diagnostic responses if domainScores are empty
    const computedDomainScores = { ...englishDiagScores };
    const latestDiagSession = sessions.find(s => s.session_type === 'diagnostic');
    const diagResponses = latestDiagSession?.question_history?.length > 0
      ? latestDiagSession.question_history
      : (userProfile?.english_performance?.responses || []);

    if (diagResponses.length > 0) {
      const dCounts = {};
      diagResponses.forEach(r => {
        if (!r.domain) return;
        if (!dCounts[r.domain]) dCounts[r.domain] = { correct: 0, total: 0 };
        dCounts[r.domain].total++;
        if (r.correct) dCounts[r.domain].correct++;
      });
      Object.keys(dCounts).forEach(d => {
        computedDomainScores[d] = (dCounts[d].correct / dCounts[d].total) * 100;
      });
    }

    const hasComputedDomainScores = Object.keys(computedDomainScores).length > 0;

    // Seed EVERY node from the diagnostic if a per-domain score exists
    if (hasComputedDomainScores) {
      Object.entries(computedDomainScores).forEach(([domain, score]) => {
        const nodeIds = DOMAIN_TO_NODES[domain] || [domain];
        nodeIds.forEach(nodeId => {
          setIfBetter(nodeId, SCORE_TO_MASTERY(score));
        });
      });
    }

    // Layer in session data (wins if higher mastery)
    const domainStats = {};
    sessions.forEach(session => {
      (session.question_history || []).forEach(q => {
        if (!q.domain) return;
        const nodeIds = DOMAIN_TO_NODES[q.domain] || [q.domain];
        nodeIds.forEach(nodeId => {
          if (!domainStats[nodeId]) domainStats[nodeId] = { correct: 0, total: 0 };
          domainStats[nodeId].total++;
          if (q.correct) domainStats[nodeId].correct++;
        });
      });
    });
    Object.entries(domainStats).forEach(([nodeId, stats]) => {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      let sessionMastery;
      if (stats.total >= 25 && accuracy >= 0.85) sessionMastery = 'mastered';
      else if (stats.total >= 10 && accuracy >= 0.75) sessionMastery = 'practiced';
      else if (stats.total >= 3) sessionMastery = 'learning';
      if (sessionMastery) setIfBetter(nodeId, sessionMastery);
    });

    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, userProfile]);

  // Merge static nodes with mastery
  const mergedNodes = ENGLISH_GRAPH_NODES.map(n => ({
    ...n,
    mastery_level: masteryMap[n.id] || "not_started",
  }));

  const total = mergedNodes.length;
  const mastered = mergedNodes.filter(n => n.mastery_level === "mastered").length;
  const inProgress = mergedNodes.filter(n => n.mastery_level === "practiced" || n.mastery_level === "learning").length;
  // Note: "mastered" internally = "Proficient" in UI labels
  const ready = mergedNodes.filter(n => {
    if (n.mastery_level === "mastered" || n.mastery_level === "practiced") return false;
    return (n.prerequisites || []).every(pid => {
      const prereq = mergedNodes.find(x => x.id === pid);
      return !prereq || prereq.mastery_level === "mastered" || prereq.mastery_level === "practiced";
    });
  });

  // Data sources summary
  const hasSessionData = sessions.length > 0;
  const hasDiagData = Object.keys(englishDiagScores).length > 0 || (userProfile?.english_performance?.diagnostic_accuracy > 0);

  const domainGroups = mergedNodes.reduce((acc, node) => {
    const d = node.domain || "General";
    if (!acc[d]) acc[d] = [];
    acc[d].push(node);
    return acc;
  }, {});

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!isLoading && !hasEnglishData && !hasDiagData) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <PenTool className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl md:text-3xl font-bold text-white">SAT English Knowledge Graph</h1>
              <p className="text-white/80 text-sm">{total} grammar skills · Complete practice to unlock your graph</p>
            </div>
          </div>
        </div>

        <Card className="border-4 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/40">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-100 flex items-center justify-center">
              <Lock className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">No English data yet</h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              Complete an English practice session or the English diagnostic to start tracking your grammar skills on this knowledge graph.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link to={createPageUrl("SATEnglishPractice")}>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                  <PenTool className="w-4 h-4 mr-2" />Start English Practice
                </Button>
              </Link>
              <Link to={`${createPageUrl("SATEnglishPractice")}?tab=blitz`}>
                <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full">
                  <Sparkles className="w-4 h-4 mr-2" />Try a Blitz Session
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <PenTool className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl md:text-3xl font-bold text-white">SAT English Knowledge Graph</h1>
            <p className="text-white/80 text-sm">{total} skills · {mastered} proficient · {inProgress} in progress</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {hasSessionData && <span className="text-white/60 text-xs flex items-center gap-1"><Zap className="w-3 h-3" />{sessions.length} session{sessions.length!==1?'s':''} tracked</span>}
              {hasDiagData && <span className="text-white/60 text-xs flex items-center gap-1"><BarChart2 className="w-3 h-3" />Diagnostic included</span>}
            </div>
          </div>
          <div className="sm:ml-auto flex gap-3 flex-wrap">
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{mastered}</div>
              <div className="text-xs text-white/80">Proficient</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-white">{inProgress}</div>
              <div className="text-xs text-white/80">In Progress</div>
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
                  Skill Progress
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
                    const count = mergedNodes.filter(n => (n.mastery_level || "not_started") === key).length;
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
                        <BookOpen className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-800 truncate">{node.title}</p>
                          <p className="text-xs" style={{ color: ENGLISH_DOMAIN_COLORS[node.domain]?.base || "#6b7280" }}>{node.domain}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* By Domain */}
            <Card className="border-4 border-white rounded-3xl shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-stone-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  By Domain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {Object.entries(domainGroups).map(([domain, dNodes]) => {
                  const domainMastered = dNodes.filter(n => n.mastery_level === "mastered").length;
                  const colors = ENGLISH_DOMAIN_COLORS[domain] || { base: "#6b7280", light: "#f3f4f6" };
                  return (
                    <div key={domain} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium" style={{ color: colors.base }}>{domain}</span>
                                <span className="text-stone-400">{domainMastered} proficient</span>
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
            <Card className="border-4 border-white rounded-3xl shadow-xl overflow-hidden" style={{ height: "600px" }}>
              <EnglishConceptGraph
                masteryMap={masteryMap}
                onNodeClick={setSelectedNode}
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
                          <BookOpen className="w-7 h-7 text-stone-500" />
                          <div>
                            <CardTitle className="text-lg text-stone-900">{selectedNode.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs" style={{ borderColor: ENGLISH_DOMAIN_COLORS[selectedNode.domain]?.base, color: ENGLISH_DOMAIN_COLORS[selectedNode.domain]?.base }}>
                                {selectedNode.domain || "General"}
                              </Badge>
                              <Badge className={`text-xs ${MASTERY_CONFIG[selectedNode.mastery_level || "not_started"].color}`}>
                                {MASTERY_CONFIG[selectedNode.mastery_level || "not_started"].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} className="rounded-full">✕</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-stone-600">{selectedNode.description}</p>

                      {/* Grammar rules preview — try both node id and domain field */}
                      {(GRAMMAR_DOMAINS[selectedNode.id] || GRAMMAR_DOMAINS[selectedNode.domain]) && (
                        <div className="bg-stone-50 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-semibold text-stone-500 mb-2">Key Rules:</p>
                          {(GRAMMAR_DOMAINS[selectedNode.id] || GRAMMAR_DOMAINS[selectedNode.domain])?.rules?.slice(0, 3).map((rule, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                              <span className="text-emerald-500 flex-shrink-0 mt-0.5">•</span>
                              <span>{rule}</span>
                            </div>
                          ))}
                        </div>
                      )}

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
                                      prereq.mastery_level === "mastered"
                                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                        : "bg-stone-100 border-stone-300 text-stone-600 hover:border-stone-400"
                                    }`}
                                  >
                                    {prereq.mastery_level === "mastered" ? "✓ Proficient " : ""}{prereq.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Show accuracy hint from sessions */}
                      {masteryMap[selectedNode.id] && masteryMap[selectedNode.id] !== 'not_started' && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm text-emerald-700">
                            {masteryMap[selectedNode.id] === 'mastered' ? 'Proficient from practice data' :
                             masteryMap[selectedNode.id] === 'practiced' ? 'In progress — keep practicing!' :
                             'Seen in practice — more reps needed'}
                          </span>
                        </div>
                      )}
                      <Link to={createPageUrl("SATEnglishPractice")}>
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
