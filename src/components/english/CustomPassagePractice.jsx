import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Upload, FileText, CheckCircle, XCircle,
  ChevronRight, RotateCcw, Award, Loader2, AlertTriangle, BookOpen, Sparkles
} from "lucide-react";
import EnglishTutorChat from "@/components/english/EnglishTutorChat";
import QuestionDissector from "@/components/english/QuestionDissector";
import BookmarkButton from "@/components/review/BookmarkButton";
import { motion, AnimatePresence } from "framer-motion";

// ─── SAT question skill labels ───────────────────────────────────────────────
const SKILL_LABELS = {
  central_ideas: "Central Ideas & Details",
  inference: "Inferences",
  command_of_evidence: "Command of Evidence",
  craft_structure: "Craft & Structure",
  cross_text_connections: "Cross-Text Connections",
  vocabulary_context: "Words in Context",
  text_structure: "Text Structure & Purpose",
  transitions: "Transitions",
  rhetorical_synthesis: "Rhetorical Synthesis",
};

// ─── File extraction helper ───────────────────────────────────────────────────
async function extractTextFromFile(file) {
  if (file.type === "text/plain") {
    return await file.text();
  }

  // For PDF and Google Doc exports — use the LLM's vision/file reading via UploadFile
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  const extracted = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract ALL readable text from this document. Return only the raw text content with no commentary, no formatting markers, and no extra notes. Preserve paragraphs.`,
    file_urls: [file_url],
  });

  return extracted;
}

// ─── Generate adaptive questions ──────────────────────────────────────────────
async function generateQuestions(passageText, sessionHistory, totalQuestions) {
  const previousSkills = sessionHistory.map(q => q.skill);
  const previousCorrect = sessionHistory.map(q => q.correct);

  // Compute which skills the student is struggling with
  const skillPerf = {};
  sessionHistory.forEach((h) => {
    if (!skillPerf[h.skill]) skillPerf[h.skill] = { correct: 0, total: 0 };
    skillPerf[h.skill].total++;
    if (h.correct) skillPerf[h.skill].correct++;
  });
  const struggleSkills = Object.entries(skillPerf)
    .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
    .map(([s]) => s);

  // Adaptive difficulty: start medium, escalate if doing well
  const recentAcc = sessionHistory.length > 0
    ? sessionHistory.slice(-4).filter(h => h.correct).length / Math.min(4, sessionHistory.length)
    : 0.5;
  const difficulty = recentAcc >= 0.8 ? "hard" : recentAcc >= 0.5 ? "medium" : "easy";

  const skillHint = struggleSkills.length > 0
    ? `Prioritize questions about: ${struggleSkills.join(", ")}.`
    : "Cover a range of SAT Reading & Writing skills.";

  const response = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `You are an elite SAT Reading & Writing question generator. Given the passage below, generate exactly 5 SAT-style multiple-choice questions.

PASSAGE:
"""
${passageText.slice(0, 4000)}
"""

REQUIREMENTS:
- Difficulty level: ${difficulty} (${difficulty === "hard" ? "college-level reasoning, subtle distinctions" : difficulty === "medium" ? "moderate inference required" : "direct text comprehension"})
- ${skillHint}
- Each question must be directly answerable from the passage above
- Questions must mirror College Board SAT Reading & Writing format exactly
- Each question has exactly 4 answer choices (A, B, C, D)
- Only ONE answer is correct
- Include a brief rationale for the correct answer

Return ONLY valid JSON (no markdown, no code blocks):
{
  "questions": [
    {
      "skill": "one of: central_ideas | inference | command_of_evidence | craft_structure | vocabulary_context | text_structure | transitions | rhetorical_synthesis",
      "question_text": "The full question text",
      "options": [
        {"label": "A", "text": "..."},
        {"label": "B", "text": "..."},
        {"label": "C", "text": "..."},
        {"label": "D", "text": "..."}
      ],
      "correct_answer": "A",
      "rationale": "Brief explanation of why this is correct"
    }
  ]
}`,
    response_json_schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skill: { type: "string" },
              question_text: { type: "string" },
              options: { 
                type: "array", 
                items: { 
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    text: { type: "string" }
                  },
                  required: ["label", "text"]
                } 
              },
              correct_answer: { type: "string" },
              rationale: { type: "string" },
            },
            required: ["skill", "question_text", "options", "correct_answer", "rationale"]
          },
        },
      },
      required: ["questions"]
    },
  });

  return (response?.questions || []).map((q, i) => ({
    ...q,
    id: `custom_${Date.now()}_${i}`,
  }));
}

// ─── Upload Stage ─────────────────────────────────────────────────────────────
function UploadStage({ onExtracted, onBack }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const isAllowed = allowed.includes(file.type) || file.name.endsWith(".txt") || file.name.endsWith(".pdf") || file.name.endsWith(".docx");
    if (!isAllowed) {
      setError("Please upload a .txt, .pdf, or .docx file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB). Try a shorter excerpt.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 100) {
        setError("Couldn't extract enough text. Please try a different file or paste text directly.");
        setLoading(false);
        return;
      }
      onExtracted(text.trim(), file.name);
    } catch (e) {
      setError("Failed to extract text from file. Please try a .txt file.");
    }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <h2 className="font-bold text-gray-800 text-lg">Custom Passage Practice</h2>
      </div>

      <Card className="border-2 border-emerald-100 rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 text-sm text-stone-700">
            <BookOpen className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>Upload any chapter, article, or excerpt and get <strong>SAT-style questions generated instantly</strong> — adaptive difficulty that adjusts as you answer.</p>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-3xl border-4 border-dashed cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-emerald-400 bg-emerald-50 scale-[1.01]"
            : "border-stone-200 bg-stone-50 hover:border-emerald-300 hover:bg-emerald-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-emerald-700 font-semibold">Extracting text &amp; preparing questions…</p>
            <p className="text-stone-500 text-sm">This takes a few seconds</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-lg">Drop your file here</p>
              <p className="text-stone-500 text-sm mt-1">or click to browse</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {[".txt", ".pdf", ".docx"].map(ext => (
                <Badge key={ext} variant="outline" className="text-stone-600">{ext}</Badge>
              ))}
            </div>
            <p className="text-xs text-stone-400">Max 10MB · Chapters, articles, excerpts all work</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: "📚", title: "Any subject", desc: "History, science, literature, news articles" },
          { icon: "🎯", title: "Adaptive difficulty", desc: "Questions get harder as you perform better" },
          { icon: "🤖", title: "Real SAT format", desc: "Questions mirror actual College Board style" },
        ].map(tip => (
          <div key={tip.title} className="bg-white border border-stone-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">{tip.icon}</p>
            <p className="font-semibold text-stone-800 text-sm">{tip.title}</p>
            <p className="text-stone-500 text-xs mt-0.5">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Practice Stage ───────────────────────────────────────────────────────────
function PracticeStage({ passageText, fileName, onComplete, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showDissector, setShowDissector] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [history, setHistory] = useState([]); // { skill, correct }
  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const TOTAL_QUESTIONS = 15;

  // Load first batch of questions
  React.useEffect(() => {
    loadQuestions([]);
  }, []);

  const loadQuestions = async (currentHistory) => {
    setLoading(true);
    try {
      const qs = await generateQuestions(passageText, currentHistory, TOTAL_QUESTIONS);
      setQuestions(qs);
    } catch (e) {
      setQuestions([]);
    }
    setLoading(false);
  };

  const handleAnswer = (label) => {
    if (answered) return;
    setSelected(label);
    setAnswered(true);
    const q = questions[currentIdx];
    const correct = label === q.correct_answer;
    setHistory(h => [...h, { skill: q.skill, correct }]);
  };

  const handleNext = async () => {
    const nextIdx = currentIdx + 1;

    if (history.length >= TOTAL_QUESTIONS) {
      onComplete(history);
      return;
    }

    if (nextIdx >= questions.length) {
      // Need more questions — generate next adaptive batch
      setLoadingNext(true);
      const newHistory = history;
      const qs = await generateQuestions(passageText, newHistory, TOTAL_QUESTIONS);
      setQuestions(prev => [...prev, ...qs]);
      setLoadingNext(false);
    }

    setCurrentIdx(nextIdx);
    setSelected(null);
    setAnswered(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
        <p className="text-emerald-700 font-bold text-lg">Generating SAT questions…</p>
        <p className="text-stone-500 text-sm mt-1">Analyzing your passage with AI</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-amber-700 font-bold text-lg">Couldn't generate questions</p>
        <p className="text-stone-500 text-sm mt-1 mb-6">The passage may be too short or unclear. Try a different file.</p>
        <Button onClick={onBack} variant="outline">Try Again</Button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isCorrect = selected === q?.correct_answer;
  const progress = Math.min((history.length / TOTAL_QUESTIONS) * 100, 100);
  const answeredCount = history.length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-500" />
            <span className="text-sm text-stone-600 font-medium truncate max-w-48">{fileName}</span>
          </div>
        </div>
        <span className="text-sm text-stone-500 font-mono">{answeredCount}/{TOTAL_QUESTIONS}</span>
      </div>

      <Progress value={progress} className="h-2 bg-stone-100" />

      {/* Passage toggle */}
      <button
        onClick={() => setShowPassage(p => !p)}
        className="flex items-center gap-2 text-xs text-emerald-700 font-medium hover:text-emerald-900 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        {showPassage ? "Hide passage" : "Show passage"}
      </button>

      <AnimatePresence>
        {showPassage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-2 border-stone-100 rounded-2xl">
              <CardContent className="p-4 max-h-52 overflow-y-auto">
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{passageText}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="space-y-4"
        >
          {loadingNext ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-emerald-700 font-medium">Generating next adaptive questions…</p>
            </div>
          ) : (
            <>
              {/* Skill badge */}
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {SKILL_LABELS[q.skill] || q.skill}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  Q{answeredCount + 1}
                </Badge>
              </div>

              {/* Question text */}
              <Card className="border-2 border-emerald-100 rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-base font-medium text-gray-800 leading-relaxed">{q.question_text}</p>
                </CardContent>
              </Card>

              {/* Options */}
              <div className="space-y-3">
                {q.options?.map((opt) => {
                  let cls = "border-2 border-gray-200 hover:border-emerald-400 bg-white cursor-pointer";
                  if (answered) {
                    if (opt.label === q.correct_answer) cls = "border-2 border-emerald-500 bg-emerald-50";
                    else if (opt.label === selected) cls = "border-2 border-red-400 bg-red-50";
                    else cls = "border-2 border-gray-200 bg-gray-50 opacity-60";
                  } else if (selected === opt.label) {
                    cls = "border-2 border-emerald-500 bg-emerald-50";
                  }
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleAnswer(opt.label)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${cls}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-emerald-700 w-6 flex-shrink-0">{opt.label})</span>
                        <span className="text-gray-800 flex-1">{opt.text}</span>
                        {answered && opt.label === q.correct_answer && (
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}
                        {answered && opt.label === selected && opt.label !== q.correct_answer && (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback panel */}
              {answered && (
                <Card className={`border-l-4 ${isCorrect ? "border-emerald-500 bg-emerald-50" : "border-stone-300 bg-stone-50"} relative`}>
                  <div className="absolute top-3 right-3 z-10">
                     <BookmarkButton questionData={q} />
                  </div>
                  <CardContent className="p-4 space-y-3 pt-8">
                    <div className="flex items-center gap-2">
                      {isCorrect
                        ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                        : <XCircle className="w-5 h-5 text-stone-500" />}
                      <span className={`font-semibold ${isCorrect ? "text-emerald-700" : "text-stone-700"}`}>
                        {isCorrect ? "Correct!" : "Not quite"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{q.rationale}</p>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/30"
                      onClick={() => setShowDissector(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Launch Question Dissector
                    </Button>

                    {showDissector && (
                      <QuestionDissector 
                        question={{ ...q, correct_answer: q.correct_answer }} 
                        onClose={() => setShowDissector(false)} 
                      />
                    )}

                    <EnglishTutorChat context={{
                      questionText: q.question_text,
                      correctAnswer: q.correct_answer,
                      correctAnswerText: q.options?.find(o => o.label === q.correct_answer)?.text || '',
                      studentAnswer: selected,
                      studentAnswerText: q.options?.find(o => o.label === selected)?.text || '',
                      explanation: q.rationale,
                      skill: SKILL_LABELS[q.skill] || q.skill,
                      isCorrect,
                      passageExcerpt: passageText,
                    }} />

                    <div className="flex justify-end">
                      <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                        {history.length >= TOTAL_QUESTIONS ? "See Results" : "Next Question"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Results Stage ────────────────────────────────────────────────────────────
function ResultsStage({ history, fileName, onBack, onRetry }) {
  const correct = history.filter(h => h.correct).length;
  const total = history.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Skill breakdown
  const skillMap = {};
  history.forEach(h => {
    if (!skillMap[h.skill]) skillMap[h.skill] = { correct: 0, total: 0 };
    skillMap[h.skill].total++;
    if (h.correct) skillMap[h.skill].correct++;
  });
  const skillEntries = Object.entries(skillMap).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center space-y-6"
    >
      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
        <Award className="w-12 h-12 text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Session Complete!</h2>
        <p className="text-stone-500 text-sm flex items-center justify-center gap-1">
          <FileText className="w-4 h-4" /> {fileName}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 border-2 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-800">{correct}/{total}</p>
            <p className="text-sm text-gray-600">Correct</p>
          </CardContent>
        </Card>
        <Card className="bg-stone-50 border-2 border-stone-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-stone-800">{accuracy}%</p>
            <p className="text-sm text-gray-600">Accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill breakdown */}
      {skillEntries.length > 0 && (
        <Card className="border-2 border-stone-100 rounded-2xl text-left">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-stone-700">SAT Skill Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {skillEntries.map(([skill, { correct: c, total: t }]) => {
              const pct = Math.round((c / t) * 100);
              return (
                <div key={skill}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-stone-700">{SKILL_LABELS[skill] || skill}</span>
                    <span className={`font-bold ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {c}/{t} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="outline" onClick={onRetry} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <RotateCcw className="w-4 h-4 mr-2" />Upload Another
        </Button>
        <Button onClick={onBack} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          Back to Practice
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function CustomPassagePractice({ onBack }) {
  const [stage, setStage] = useState("upload"); // upload | practice | results
  const [passageText, setPassageText] = useState("");
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState([]);

  const handleExtracted = (text, name) => {
    setPassageText(text);
    setFileName(name);
    setStage("practice");
  };

  const handleComplete = (hist) => {
    setHistory(hist);
    setStage("results");

    // Track session
    base44.auth.me().then(user => {
      if (user) {
        const correctCount = hist.filter(h => h.correct).length;
        base44.entities.EnglishPracticeSession.create({
          user_id: user.id,
          session_type: "choice",
          status: "completed",
          start_time: new Date(Date.now() - hist.length * 60000).toISOString(), // rough 1 min per Q
          end_time: new Date().toISOString(),
          duration_minutes: Math.max(1, hist.length),
          questions_attempted: hist.length,
          questions_correct: correctCount,
          domains_covered: ["custom_passage"]
        });
      }
    });
  };

  const handleRetry = () => {
    setPassageText("");
    setFileName("");
    setHistory([]);
    setStage("upload");
  };

  if (stage === "upload") return <UploadStage onExtracted={handleExtracted} onBack={onBack} />;
  if (stage === "practice") return (
    <PracticeStage
      passageText={passageText}
      fileName={fileName}
      onComplete={handleComplete}
      onBack={() => setStage("upload")}
    />
  );
  return (
    <ResultsStage
      history={history}
      fileName={fileName}
      onBack={onBack}
      onRetry={handleRetry}
    />
  );
}
