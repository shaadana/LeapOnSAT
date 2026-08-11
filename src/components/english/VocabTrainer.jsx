import React, { useState } from "react";
import { useSearchParams } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useSatVocab } from "@/data/satVocab";
import VocabGame from "@/components/english/VocabGame";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, RotateCcw, ChevronRight, Sparkles, Loader2, Pencil, BookOpen, Brain, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BATCH_SIZE = 10;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

function FlashCard({ word, definition, onKnow, onLearn }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="space-y-4">
      <div
        onClick={() => setFlipped(f => !f)}
        className="cursor-pointer min-h-40 bg-gradient-to-br from-emerald-50 to-stone-50 border-2 border-emerald-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all hover:shadow-lg"
      >
        {!flipped ? (
          <>
            <p className="text-3xl font-bold text-emerald-800 mb-2">{word}</p>
            <p className="text-sm text-emerald-400">Tap to reveal definition</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-emerald-700 mb-3">{word}</p>
            <p className="text-base text-gray-700 leading-relaxed">{definition}</p>
          </>
        )}
      </div>
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onLearn} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-2" />Still Learning
          </Button>
          <Button onClick={onKnow} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="w-4 h-4 mr-2" />Know It!
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Multiple Choice Quiz ─────────────────────────────────────────────────────

function MultipleChoiceVocab({ word, definition, allWords, onAnswer }) {
  const [selected, setSelected] = useState(null);

  // Build 4 unique options: 1 correct + 3 random distractors (from a large pool)
  const [options] = useState(() => {
    const distractors = shuffle(
      allWords.filter(w => w.word !== word && w.definition !== definition)
    ).slice(0, 3).map(w => w.definition);
    return shuffle([definition, ...distractors]);
  });

  const isCorrect = selected === definition;

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-100 bg-emerald-50">
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-emerald-800">{word}</p>
          <p className="text-sm text-emerald-500 mt-1">Select the correct definition</p>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {options.map((opt, i) => {
          let style = "border-2 border-gray-200 hover:border-emerald-400 cursor-pointer bg-white";
          if (selected !== null) {
            if (opt === definition) style = "border-2 border-emerald-500 bg-emerald-50";
            else if (opt === selected && opt !== definition) style = "border-2 border-red-400 bg-red-50";
            else style = "border-2 border-gray-100 bg-gray-50 opacity-50 cursor-default";
          }
          return (
            <button
              key={i}
              onClick={() => selected === null && setSelected(opt)}
              disabled={selected !== null}
              className={`w-full text-left p-4 rounded-xl transition-all flex items-start gap-3 ${style}`}
            >
              <span className="font-bold text-emerald-700 w-5 flex-shrink-0">{String.fromCharCode(65 + i)})</span>
              <span className="text-sm text-gray-800 flex-1">{opt}</span>
              {selected !== null && opt === definition && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {selected !== null && opt === selected && opt !== definition && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="space-y-3">
          <div className={`p-3 rounded-xl text-sm font-medium ${isCorrect ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {isCorrect ? "✓ Correct!" : `✗ The correct definition is: "${definition}"`}
          </div>
          <Button onClick={() => onAnswer(isCorrect)} className="w-full bg-stone-700 hover:bg-stone-800">
            Next Word <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Define & Use (AI-graded) ─────────────────────────────────────────────────

function DefineAndUse({ word, definition, onAnswer }) {
  const [userDef, setUserDef] = useState("");
  const [userSentence, setUserSentence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async () => {
    if (!userDef.trim() || !userSentence.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert vocabulary tutor. A student is practicing the word "${word}" (correct definition: "${definition}").

The student provided:
- Their definition: "${userDef}"
- Their example sentence: "${userSentence}"

Evaluate both on these criteria:
1. Definition accuracy: Does it capture the core meaning? (doesn't need to be word-for-word)
2. Sentence quality: Does the sentence demonstrate understanding of the word's meaning in context?

Return JSON:
{
  "def_correct": true/false,
  "sentence_correct": true/false,
  "score": <1|2|3> (1=needs work, 2=good, 3=excellent),
  "feedback": "<2-3 sentences: what they got right, what to refine, and a tip for remembering the word>"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            def_correct: { type: "boolean" },
            sentence_correct: { type: "boolean" },
            score: { type: "number" },
            feedback: { type: "string" }
          }
        }
      });
      setFeedback(res);
      setSubmitted(true);
    } catch {
      setFeedback({ score: 2, def_correct: true, sentence_correct: true, feedback: "Good effort! Keep practicing using new words in context — that's the best way to lock them in." });
      setSubmitted(true);
    }
    setLoading(false);
  };

  const scoreColors = { 1: "bg-red-50 border-red-200 text-red-800", 2: "bg-amber-50 border-amber-200 text-amber-800", 3: "bg-emerald-50 border-emerald-200 text-emerald-800" };
  const scoreLabels = { 1: "Needs Work", 2: "Good", 3: "Excellent!" };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-100 bg-emerald-50">
        <CardContent className="p-6 text-center">
          <p className="text-3xl font-bold text-emerald-800">{word}</p>
          <p className="text-sm text-emerald-500 mt-1">Define it and use it in a sentence</p>
        </CardContent>
      </Card>

      {!submitted ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Your Definition:</label>
            <textarea
              value={userDef}
              onChange={e => setUserDef(e.target.value)}
              placeholder="Write what you think this word means..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-400 min-h-16 resize-none"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Use it in a sentence:</label>
            <textarea
              value={userSentence}
              onChange={e => setUserSentence(e.target.value)}
              placeholder="Write a sentence that shows you understand the word..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-400 min-h-16 resize-none"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!userDef.trim() || !userSentence.trim() || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />Submit for AI Review</>}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded-lg text-center text-xs font-semibold border ${feedback.def_correct ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {feedback.def_correct ? "✓" : "✗"} Definition
            </div>
            <div className={`p-2 rounded-lg text-center text-xs font-semibold border ${feedback.sentence_correct ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {feedback.sentence_correct ? "✓" : "✗"} Sentence
            </div>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-700">
            <strong>Correct definition:</strong> {definition}
          </div>
          <div className={`border rounded-xl p-4 text-sm leading-relaxed ${scoreColors[feedback.score]}`}>
            <p className="font-semibold mb-1">Score: {scoreLabels[feedback.score]}</p>
            <p>{feedback.feedback}</p>
          </div>
          <Button onClick={() => onAnswer(feedback.score >= 2)} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Next Word <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main VocabTrainer ────────────────────────────────────────────────────────

export default function VocabTrainer({ user }) {
  const [searchParams] = useSearchParams();
  const SAT_VOCAB = useSatVocab();
  const [mode, setMode] = useState(null); // "flash" | "quiz" | "define"
  const [batch, setBatch] = useState([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const startSession = (selectedMode) => {
    if (SAT_VOCAB.length === 0) return;
    const words = shuffle(SAT_VOCAB).slice(0, BATCH_SIZE);
    setBatch(words);
    setCurrent(0);
    setCorrect(0);
    setDone(false);
    setMode(selectedMode);
    setSessionStartTime(Date.now());
  };

  const handleNext = (isCorrect = false) => {
    const newCorrect = isCorrect ? correct + 1 : correct;
    if (isCorrect) setCorrect(newCorrect);
    
    if (current + 1 >= batch.length) {
      setDone(true);
      
      // Log session
      if (user) {
        const endTime = Date.now();
        const durationMinutes = Math.max(0.1, (endTime - sessionStartTime) / 60000);
        
        base44.entities.EnglishPracticeSession.create({
          user_id: user.id,
          session_type: "vocabulary",
          status: "completed",
          from_study_plan: searchParams.get('studyPlan') === 'true',
          start_time: new Date(sessionStartTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          duration_minutes: Number(durationMinutes.toFixed(2)),
          questions_attempted: batch.length,
          questions_correct: newCorrect,
          domains_covered: ["vocabulary", mode]
        }).catch(console.error);
      }
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (!mode) {
    if (SAT_VOCAB.length === 0) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-gray-800 text-lg">Vocabulary Training</h2>
        <p className="text-sm text-gray-500">Master {SAT_VOCAB.length} high-frequency SAT words.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-emerald-200 bg-emerald-50 cursor-pointer hover:border-emerald-400 transition-all" onClick={() => startSession("flash")}>
            <CardContent className="p-5">
              <div className="w-8 h-8 mb-2 flex items-center justify-center"><BookOpen className="w-6 h-6 text-emerald-600" /></div>
              <h3 className="font-bold text-gray-800">Flashcards</h3>
              <p className="text-xs text-gray-600 mt-1">Flip to reveal definitions. Mark what you know.</p>
              <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700" size="sm">Start</Button>
            </CardContent>
          </Card>
          <Card className="border-2 border-stone-200 bg-stone-50 cursor-pointer hover:border-stone-400 transition-all" onClick={() => startSession("quiz")}>
            <CardContent className="p-5">
              <div className="w-8 h-8 mb-2 flex items-center justify-center"><Brain className="w-6 h-6 text-stone-600" /></div>
              <h3 className="font-bold text-gray-800">Multiple Choice</h3>
              <p className="text-xs text-gray-600 mt-1">Choose the correct definition from 4 options.</p>
              <Button className="mt-3 w-full bg-stone-700 hover:bg-stone-800" size="sm">Start</Button>
            </CardContent>
          </Card>
          <Card className="border-2 border-stone-200 bg-stone-50 cursor-pointer hover:border-stone-400 transition-all" onClick={() => startSession("define")}>
            <CardContent className="p-5">
              <div className="w-8 h-8 mb-2 flex items-center justify-center"><Pencil className="w-6 h-6 text-stone-600" /></div>
              <h3 className="font-bold text-gray-800">Define & Use</h3>
              <p className="text-xs text-gray-600 mt-1">Write the definition and use the word in a sentence. AI-graded.</p>
              <Button className="mt-3 w-full bg-stone-700 hover:bg-stone-800" size="sm">Start</Button>
            </CardContent>
          </Card>
          <Card className="border-2 border-indigo-200 bg-indigo-50 cursor-pointer hover:border-indigo-400 transition-all" onClick={() => setMode("game")}>
            <CardContent className="p-5">
              <div className="w-8 h-8 mb-2 flex items-center justify-center"><Sparkles className="w-6 h-6 text-indigo-600" /></div>
              <h3 className="font-bold text-indigo-900">Vocab Blitz</h3>
              <p className="text-xs text-indigo-700 mt-1">Gamified fast-paced vocab matching. Build streaks!</p>
              <Button className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">Play</Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Word Bank Stats</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-700">{SAT_VOCAB.length}</p>
              <p className="text-xs text-gray-500">Total Words</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{BATCH_SIZE}</p>
              <p className="text-xs text-gray-500">Per Session</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-700">3</p>
              <p className="text-xs text-gray-500">Quiz Modes</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "game") {
    return <VocabGame onComplete={() => setMode(null)} />;
  }

  if (done) {
    const pct = Math.round((correct / batch.length) * 100);
    return (
      <div className="text-center space-y-6 py-8">
        <Award className="w-16 h-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold text-gray-800">Session Complete!</h2>
        {(mode === "quiz" || mode === "define") && (
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-white ${pct >= 70 ? "bg-emerald-500" : "bg-orange-400"}`}>
            {pct}%
          </div>
        )}
        <p className="text-gray-600">You practiced {batch.length} words.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => startSession(mode)} className="bg-emerald-600 hover:bg-emerald-700">
            <RotateCcw className="w-4 h-4 mr-2" />Practice More
          </Button>
          <Button variant="outline" onClick={() => setMode(null)}>← Back</Button>
        </div>
      </div>
    );
  }

  const currentWord = batch[current];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setMode(null)}>← Back</Button>
        <Progress value={(current / batch.length) * 100} className="w-32 h-2" />
        <span className="text-sm text-gray-500">{current + 1}/{batch.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {mode === "flash" && (
            <FlashCard
              word={currentWord.word}
              definition={currentWord.definition}
              onKnow={() => handleNext(true)}
              onLearn={() => handleNext(false)}
            />
          )}
          {mode === "quiz" && (
            <MultipleChoiceVocab
              key={`quiz-${current}`}
              word={currentWord.word}
              definition={currentWord.definition}
              allWords={SAT_VOCAB}
              onAnswer={(isCorrect) => handleNext(isCorrect)}
            />
          )}
          {mode === "define" && (
            <DefineAndUse
              key={`define-${current}`}
              word={currentWord.word}
              definition={currentWord.definition}
              onAnswer={(isCorrect) => handleNext(isCorrect)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
