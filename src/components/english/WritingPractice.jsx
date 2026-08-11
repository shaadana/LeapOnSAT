import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import EnglishTutorChat from "@/components/english/EnglishTutorChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sparkles, CheckCircle, XCircle, ChevronRight,
  Pencil, RefreshCw, Trophy, Loader2, FileText, AlertTriangle
} from "lucide-react";

const GENRE_PROMPTS = [
  {
    id: "argumentative",
    label: "Argumentative",
    prompt: "Write a short argumentative paragraph (5–8 sentences) taking a clear stance on any topic that matters to you. Include a claim, at least two pieces of reasoning, and a concluding sentence.",
    example: "e.g., Should schools require community service? Should social media be regulated?"
  },
  {
    id: "informative",
    label: "Informative / Explanatory",
    prompt: "Write a short informative paragraph (5–8 sentences) explaining a concept, process, or topic you know well. Be precise and organized.",
    example: "e.g., How does photosynthesis work? What caused the Great Depression?"
  },
  {
    id: "narrative",
    label: "Narrative",
    prompt: "Write a short narrative paragraph (5–8 sentences) describing a meaningful moment or experience. Use specific details and vivid language.",
    example: "e.g., A moment you overcame a challenge, a place that feels important to you."
  },
  {
    id: "analytical",
    label: "Literary Analysis",
    prompt: "Write a short analytical paragraph (5–8 sentences) analyzing a theme, character, or literary device from any book, poem, or story you've read.",
    example: "e.g., Symbolism in The Great Gatsby, conflict in Romeo and Juliet."
  }
];

const SAT_SKILL_LABELS = {
  central_idea: "Central Ideas & Details",
  command_evidence: "Command of Evidence",
  craft_structure: "Craft & Structure",
  cross_text: "Cross-Text Connections",
  inferences: "Inferences",
  rhetorical_synthesis: "Rhetorical Synthesis",
  transitions: "Transitions",
  boundaries: "Sentence Boundaries",
  form_structure: "Form, Structure & Sense"
};

export default function WritingPractice({ onBack, user }) {
  const [stage, setStage] = useState("genre"); // genre | write | generating | questions | results
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [passage, setPassage] = useState("");
  const [passageError, setPassageError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  

  const handleGenerate = async () => {
    if (passage.trim().split(/\s+/).length < 30) {
      setPassageError("Please write at least 30 words so we can generate meaningful SAT questions.");
      return;
    }
    setPassageError("");
    setStage("generating");

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert SAT Reading and Writing question writer. A student has written the following passage:

---
${passage}
---

Generate exactly 5 SAT-style multiple-choice questions about this passage. The questions should reflect the REAL SAT Reading and Writing section skills:
- At least 1 question on "Central Ideas & Details" (identifying the main claim or key supporting detail)
- At least 1 question on "Command of Evidence" (which choice best supports a claim, or how does the evidence support the argument)
- At least 1 question on "Craft & Structure" (word choice, author's purpose, structure, tone)
- At least 1 question on "Inferences" (what can be inferred from the text)
- 1 question on "Transitions" or "Rhetorical Synthesis" (what word/phrase best connects ideas, or how to integrate information)

For each question:
- Reference specific words, phrases, or sentences from the student's passage
- Make all 4 answer choices plausible (not obviously wrong)
- The correct answer should require careful reading, not guessing
- Write a clear 2-sentence explanation for why the correct answer is right and the main distractor is wrong

Also generate a 3–4 sentence writing quality feedback paragraph that evaluates: clarity of claim, organization, use of evidence, word choice, and sentence variety. Be encouraging but specific about 1–2 areas to improve.

Return ONLY valid JSON in this exact structure:
{
  "questions": [
    {
      "skill": "central_idea",
      "question_text": "...",
      "options": [
        {"label": "A", "text": "..."},
        {"label": "B", "text": "..."},
        {"label": "C", "text": "..."},
        {"label": "D", "text": "..."}
      ],
      "correct_answer": "A",
      "explanation": "..."
    }
  ],
  "writing_feedback": "..."
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
                  options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } } } },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" }
                }
              }
            },
            writing_feedback: { type: "string" }
          }
        }
      });

      setQuestions(res.questions || []);
      setFeedback(res.writing_feedback || "");
      setCurrentQ(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setResults([]);
      setStage("questions");
    } catch (e) {
      setStage("write");
      setPassageError("Something went wrong generating questions. Please try again.");
    }
  };

  const handleAnswer = (label) => {
    if (answered) return;
    setSelectedAnswer(label);
    setAnswered(true);
    const q = questions[currentQ];
    setResults(prev => [...prev, { skill: q.skill, correct: label === q.correct_answer }]);
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setStage("results");
    } else {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  const correctCount = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  const q = questions[currentQ];
  const isCorrect = q && selectedAnswer === q.correct_answer;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div>
          <h2 className="font-bold text-stone-800 text-xl">Writing Practice</h2>
          <p className="text-xs text-stone-500">Write a passage → answer SAT questions about your own writing</p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* STAGE: Genre Selection */}
        {stage === "genre" && (
          <motion.div key="genre" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="border-2 border-emerald-100 bg-emerald-50 rounded-2xl">
              <CardContent className="p-4">
                <p className="text-sm text-emerald-800 font-medium">How it works:</p>
                <ol className="text-sm text-emerald-700 mt-1 space-y-1 list-decimal list-inside">
                  <li>Choose a writing type and write a short passage (5–8 sentences)</li>
                  <li>AI generates 5 real SAT-style questions about <em>your</em> passage</li>
                  <li>Answer the questions, get detailed feedback on your writing and comprehension</li>
                </ol>
              </CardContent>
            </Card>
            <p className="text-sm font-semibold text-stone-600">Choose your writing type:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {GENRE_PROMPTS.map(g => (
                <motion.button
                  key={g.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedGenre(g); setStage("write"); }}
                  className="text-left p-4 rounded-2xl border-2 border-stone-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <p className="font-bold text-stone-800 mb-1">{g.label}</p>
                  <p className="text-xs text-stone-500">{g.example}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STAGE: Write */}
        {stage === "write" && selectedGenre && (
          <motion.div key="write" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card className="border-2 border-stone-100 rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-stone-800 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-emerald-600" />
                    {selectedGenre.label}
                  </CardTitle>
                  <button onClick={() => setStage("genre")} className="text-xs text-stone-400 hover:text-stone-600">Change type</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <p className="text-sm text-stone-700">{selectedGenre.prompt}</p>
                  <p className="text-xs text-stone-400 mt-1">{selectedGenre.example}</p>
                </div>
                <textarea
                  value={passage}
                  onChange={e => { setPassage(e.target.value); setPassageError(""); }}
                  placeholder="Write your passage here..."
                  className="w-full h-48 border-2 border-stone-200 rounded-xl p-4 text-sm text-stone-800 focus:border-emerald-400 focus:outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{passage.trim().split(/\s+/).filter(Boolean).length} words</span>
                  {passageError && (
                    <div className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3" />{passageError}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={passage.trim().length < 50}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold h-11"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate SAT Questions About My Writing
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STAGE: Generating */}
        {stage === "generating" && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">Analyzing your writing...</h2>
            <p className="text-stone-500 text-sm">Generating 5 SAT-style questions tailored to your passage</p>
          </motion.div>
        )}

        {/* STAGE: Questions */}
        {stage === "questions" && q && (
          <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {/* Passage preview */}
            <Card className="border-2 border-stone-100 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />Your Passage
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-stone-700 leading-relaxed line-clamp-4">{passage}</p>
              </CardContent>
            </Card>

            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <Badge className="bg-emerald-100 text-emerald-800">{SAT_SKILL_LABELS[q.skill] || q.skill}</Badge>
              <span>Question {currentQ + 1} of {questions.length}</span>
            </div>

            <Card className="border-2 border-emerald-100 rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <p className="text-base font-medium text-stone-800 leading-relaxed">{q.question_text}</p>

                <div className="space-y-2">
                  {q.options?.map(opt => {
                    let cls = "border-2 border-stone-200 bg-white text-stone-700 hover:border-emerald-400 hover:bg-emerald-50";
                    if (answered) {
                      if (opt.label === q.correct_answer) cls = "border-2 border-emerald-500 bg-emerald-50 text-emerald-900";
                      else if (opt.label === selectedAnswer) cls = "border-2 border-red-400 bg-red-50 text-red-800";
                      else cls = "border-2 border-stone-100 bg-stone-50 text-stone-400";
                    } else if (selectedAnswer === opt.label) {
                      cls = "border-2 border-emerald-500 bg-emerald-50";
                    }
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleAnswer(opt.label)}
                        disabled={answered}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${cls}`}
                      >
                        <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{opt.label}</span>
                        <span className="text-sm flex-1">{opt.text}</span>
                        {answered && opt.label === q.correct_answer && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
                        {answered && opt.label === selectedAnswer && opt.label !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <div className={`rounded-xl p-3 border-2 ${isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-stone-50 border-stone-300"}`}>
                      <p className={`text-sm font-bold mb-1 ${isCorrect ? "text-emerald-700" : "text-stone-700"}`}>
                        {isCorrect ? "Correct!" : `Incorrect — Answer: ${q.correct_answer}`}
                      </p>
                      <p className="text-sm text-stone-700">{q.explanation}</p>
                    </div>

                    <EnglishTutorChat context={{
                      questionText: q.question_text,
                      correctAnswer: q.correct_answer,
                      correctAnswerText: q.options?.find(o => o.label === q.correct_answer)?.text || '',
                      studentAnswer: selectedAnswer || '',
                      studentAnswerText: q.options?.find(o => o.label === selectedAnswer)?.text || '',
                      explanation: q.explanation || '',
                      skill: SAT_SKILL_LABELS[q.skill] || q.skill,
                      isCorrect,
                      passageExcerpt: passage,
                    }} />

                    <div className="flex justify-end">
                      <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                        {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STAGE: Results */}
        {stage === "results" && (
          <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 rounded-3xl shadow-2xl">
              <CardContent className="p-7 text-center text-white">
                <Trophy className="w-14 h-14 mx-auto mb-3 opacity-90" />
                <h2 className="text-2xl font-bold mb-1">Writing Practice Complete!</h2>
                <p className="text-emerald-100 text-sm mb-5">You wrote your own passage and answered real SAT questions about it.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/15 rounded-2xl p-4">
                    <p className="text-3xl font-bold">{correctCount}/{results.length}</p>
                    <p className="text-xs text-emerald-100 mt-0.5">Correct</p>
                  </div>
                  <div className="bg-white/15 rounded-2xl p-4">
                    <p className="text-3xl font-bold">{accuracy}%</p>
                    <p className="text-xs text-emerald-100 mt-0.5">Accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Writing feedback */}
            {feedback && (
              <Card className="border-2 border-stone-200 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-stone-700 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-emerald-600" />Writing Quality Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-stone-700 leading-relaxed">{feedback}</p>
                </CardContent>
              </Card>
            )}

            {/* Skill breakdown */}
            <Card className="border-2 border-stone-100 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-stone-700">SAT Skill Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {r.correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <span className="text-sm text-stone-700">{SAT_SKILL_LABELS[r.skill] || r.skill}</span>
                    <span className={`ml-auto text-xs font-semibold ${r.correct ? "text-emerald-600" : "text-red-500"}`}>
                      {r.correct ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => { setStage("genre"); setPassage(""); setSelectedGenre(null); setResults([]); }} variant="outline" className="flex-1 rounded-full border-2">
                <RefreshCw className="w-4 h-4 mr-2" />Write Again
              </Button>
              <Button onClick={onBack} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold">
                Back to Practice
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
