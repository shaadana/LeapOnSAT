import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GRAMMAR_DOMAINS } from "@/data/englishGrammarRules";
import { ENGLISH_QUESTIONS } from "@/data/englishQuestions";
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle, XCircle, Sparkles, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Domain category groupings ──────────────────────────────────────────────────

const LESSON_CATEGORIES = [
  {
    id: "punctuation",
    label: "Punctuation",
    emoji: "✍️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    accentColor: "bg-blue-500",
    domains: ["apostrophes", "semicolons_periods", "commas", "colons", "dashes"],
  },
  {
    id: "sentence_structure",
    label: "Sentence Structure",
    emoji: "⚖️",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    accentColor: "bg-purple-500",
    domains: ["parallel_structure", "modifiers", "conciseness"],
  },
  {
    id: "agreement",
    label: "Agreement & Pronouns",
    emoji: "🔗",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    accentColor: "bg-emerald-500",
    domains: ["subject_verb_agreement", "pronoun_agreement", "pronoun_case", "who_which_whom"],
  },
  {
    id: "verbs_words",
    label: "Verbs & Word Choice",
    emoji: "⏰",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    accentColor: "bg-amber-500",
    domains: ["verb_tense", "adjectives_adverbs", "word_pairs", "idioms_diction"],
  },
  {
    id: "reading_rhetoric",
    label: "Reading & Rhetoric",
    emoji: "🌉",
    color: "bg-rose-50 border-rose-200 text-rose-800",
    accentColor: "bg-rose-500",
    domains: ["transitions", "vocabulary"],
  },
];

// ── Lesson View: rule study + mini quiz ───────────────────────────────────────

function LessonView({ domainKey, onBack, onComplete }) {
  const [phase, setPhase] = useState("study"); // study | quiz
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);

  const domain = GRAMMAR_DOMAINS[domainKey];
  if (!domain) return null;

  // Pull up to 5 questions for this domain, sorted easy-first
  const questions = ENGLISH_QUESTIONS
    .filter(q => q.domain === domainKey)
    .sort((a, b) => {
      const order = { easy: 0, medium: 1, hard: 2, expert: 3 };
      return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1);
    })
    .slice(0, 5);

  const handleAnswer = (label) => {
    if (answered) return;
    setSelected(label);
    setAnswered(true);
    const q = questions[quizIndex];
    setResults(r => [...r, { correct: label === q.correct_answer, domain: domainKey }]);
  };

  const handleNext = () => {
    if (quizIndex + 1 >= questions.length) {
      // results already has the current answer recorded from handleAnswer
      const correct = results.filter(r => r.correct).length;
      onComplete({ domain: domainKey, correct, total: questions.length });
    } else {
      setQuizIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  // ── Study Phase ──────────────────────────────────────────────────────────────
  if (phase === "study") {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <h2 className="font-bold text-gray-800 text-lg">{domain.emoji} {domain.label}</h2>
        </div>

        <Card className="border-2 border-emerald-100 rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-stone-600 font-medium">{domain.description}</p>

            <div className="space-y-2">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Rules</p>
              {domain.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-stone-700 leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>

            {domain.tips && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">💡 SAT Tip</p>
                <p className="text-sm text-amber-800">{domain.tips}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <p className="text-sm text-stone-500">
            {questions.length > 0 ? `${questions.length} practice questions ready` : "No practice questions yet"}
          </p>
          {questions.length > 0 && (
            <Button onClick={() => setPhase("quiz")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
              Start Practice Quiz <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {questions.length === 0 && (
            <Button onClick={onBack} variant="outline">Back to Lessons</Button>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz Phase ───────────────────────────────────────────────────────────────
  const q = questions[quizIndex];
  const isCorrect = selected === q.correct_answer;
  const progress = (quizIndex / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPhase("study")}>
            <ArrowLeft className="w-4 h-4 mr-1" />Back to Rules
          </Button>
          <Badge className="bg-emerald-100 text-emerald-800">{domain.label}</Badge>
        </div>
        <span className="text-sm text-stone-500 font-mono">{quizIndex + 1} / {questions.length}</span>
      </div>

      <Progress value={progress} className="h-2 bg-stone-100" />

      <AnimatePresence mode="wait">
        <motion.div key={quizIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="border-2 border-emerald-100 rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="capitalize text-xs">{q.difficulty}</Badge>
              </div>
              <p className="text-base font-medium text-gray-800 whitespace-pre-line leading-relaxed mb-4">
                {q.question_text}
              </p>
              <div className="space-y-2">
                {q.options?.map(opt => {
                  let cls = "border-2 border-gray-200 hover:border-emerald-400 bg-white cursor-pointer";
                  if (answered) {
                    if (opt.label === q.correct_answer) cls = "border-2 border-emerald-500 bg-emerald-50";
                    else if (opt.label === selected) cls = "border-2 border-red-400 bg-red-50";
                    else cls = "border-2 border-gray-200 bg-gray-50 opacity-60";
                  } else if (selected === opt.label) {
                    cls = "border-2 border-emerald-400 bg-emerald-50";
                  }
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleAnswer(opt.label)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${cls}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-emerald-700 w-5 flex-shrink-0">{opt.label})</span>
                        <span className="text-gray-800 text-sm">{opt.text}</span>
                        {answered && opt.label === q.correct_answer && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
                        {answered && opt.label === selected && opt.label !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {answered && (
            <Card className={`border-l-4 rounded-2xl ${isCorrect ? "border-emerald-500 bg-emerald-50" : "border-stone-300 bg-stone-50"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-stone-500" />}
                  <span className={`font-semibold text-sm ${isCorrect ? "text-emerald-700" : "text-stone-700"}`}>
                    {isCorrect ? "Correct!" : "Not quite"}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{q.explanation}</p>
                {q.rule_reference && (
                  <p className="text-xs text-gray-500 italic">Rule: {q.rule_reference}</p>
                )}
                <div className="flex justify-end pt-1">
                  <Button onClick={handleNext} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
                    {quizIndex + 1 >= questions.length ? "See Summary" : "Next"} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Quiz Summary ──────────────────────────────────────────────────────────────

function LessonSummary({ domainKey, correct, total, onRetry, onBack }) {
  const domain = GRAMMAR_DOMAINS[domainKey];
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const message = pct >= 80 ? "Great work on this lesson!" : pct >= 60 ? "Good effort — review the rules and try again." : "Keep studying the rules — practice makes perfect.";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center space-y-5">
      <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-lg ${pct >= 80 ? "bg-emerald-100" : pct >= 60 ? "bg-amber-100" : "bg-stone-100"}`}>
        {domain?.emoji}
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{domain?.label} Complete</h2>
        <p className="text-stone-500 text-sm mt-1">{message}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className={`border-2 ${pct >= 70 ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50"}`}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{correct}/{total}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${pct >= 70 ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50"}`}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{pct}%</p>
            <p className="text-xs text-gray-500">Score</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="outline" onClick={onRetry} className="rounded-full border-emerald-200 text-emerald-700">
          <RotateCcw className="w-4 h-4 mr-2" />Retry Quiz
        </Button>
        <Button onClick={onBack} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
          All Lessons
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Grammar Lessons Component ────────────────────────────────────────────

export default function GrammarLessons({ onBack }) {
  const [view, setView] = useState("browse"); // browse | lesson | summary
  const [activeDomain, setActiveDomain] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [completedDomains, setCompletedDomains] = useState(() => {
    try { return JSON.parse(localStorage.getItem("grammar_lesson_completions") || "{}"); }
    catch { return {}; }
  });

  const handleLessonComplete = ({ domain, correct, total }) => {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const updated = { ...completedDomains, [domain]: pct };
    setCompletedDomains(updated);
    try { localStorage.setItem("grammar_lesson_completions", JSON.stringify(updated)); } catch {}
    setSummaryData({ domain, correct, total });
    setView("summary");
  };

  if (view === "lesson") {
    return (
      <LessonView
        domainKey={activeDomain}
        onBack={() => setView("browse")}
        onComplete={handleLessonComplete}
      />
    );
  }

  if (view === "summary") {
    return (
      <LessonSummary
        domainKey={summaryData.domain}
        correct={summaryData.correct}
        total={summaryData.total}
        onRetry={() => { setView("lesson"); }}
        onBack={() => setView("browse")}
      />
    );
  }

  // ── Browse View ───────────────────────────────────────────────────────────────
  const totalDomains = Object.keys(GRAMMAR_DOMAINS).length;
  const completedCount = Object.keys(completedDomains).filter(d => completedDomains[d] >= 60).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back to Practice
        </Button>
        <h2 className="font-bold text-gray-800 text-lg">Grammar Lessons</h2>
      </div>

      {/* Progress Banner */}
      <Card className="border-2 border-emerald-100 rounded-2xl bg-emerald-50">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-900">{completedCount} of {totalDomains} lessons completed</p>
            <Progress value={totalDomains > 0 ? (completedCount / totalDomains) * 100 : 0} className="h-2 mt-1.5 bg-emerald-200" />
          </div>
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        </CardContent>
      </Card>

      {/* Lesson Categories */}
      {LESSON_CATEGORIES.map(cat => {
        const catDomains = cat.domains.filter(d => GRAMMAR_DOMAINS[d]);
        if (catDomains.length === 0) return null;
        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{cat.emoji}</span>
              <h3 className="font-bold text-stone-700 text-sm tracking-wide uppercase">{cat.label}</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {catDomains.map(domainKey => {
                const domain = GRAMMAR_DOMAINS[domainKey];
                const score = completedDomains[domainKey];
                const qCount = ENGLISH_QUESTIONS.filter(q => q.domain === domainKey).length;
                const isCompleted = score !== undefined && score >= 60;
                const isAttempted = score !== undefined;

                return (
                  <motion.button
                    key={domainKey}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActiveDomain(domainKey); setView("lesson"); }}
                    className={`text-left p-4 rounded-2xl border-2 transition-all bg-white group ${
                      isCompleted
                        ? "border-emerald-300 hover:border-emerald-400"
                        : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isCompleted ? "bg-emerald-100" : "bg-stone-100"}`}>
                        {domain.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-800 group-hover:text-emerald-700">{domain.label}</p>
                          {isCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5">✓ Done</Badge>
                          )}
                          {isAttempted && !isCompleted && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5">In Progress</Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{domain.rules.length} rules · {qCount} practice questions</p>
                        {isAttempted && (
                          <div className="mt-1.5">
                            <Progress value={score} className="h-1 bg-stone-100" />
                            <p className="text-xs text-stone-400 mt-0.5">Last score: {score}%</p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500 flex-shrink-0 mt-1" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
