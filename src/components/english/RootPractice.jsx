import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { ENGLISH_ROOTS } from "@/data/englishRoots";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Curated prefix + base root pairs for inference questions.
// Students must combine root meanings to infer what a word means.
const INFERENCE_PAIRS = [
  { prefix: "pro", prefixMeaning: "forward", base: "ject", baseMeaning: "throw", word: "project", meaning: "to throw forward" },
  { prefix: "re", prefixMeaning: "back", base: "tract", baseMeaning: "pull", word: "retract", meaning: "to pull back" },
  { prefix: "ex", prefixMeaning: "out", base: "port", baseMeaning: "carry", word: "export", meaning: "to carry out" },
  { prefix: "de", prefixMeaning: "down", base: "tract", baseMeaning: "pull", word: "detract", meaning: "to pull down" },
  { prefix: "con", prefixMeaning: "together", base: "ven", baseMeaning: "come", word: "convene", meaning: "to come together" },
  { prefix: "sub", prefixMeaning: "under", base: "merg", baseMeaning: "dip", word: "submerge", meaning: "to dip under" },
  { prefix: "pre", prefixMeaning: "before", base: "dict", baseMeaning: "say", word: "predict", meaning: "to say before" },
  { prefix: "dis", prefixMeaning: "apart", base: "rupt", baseMeaning: "break", word: "disrupt", meaning: "to break apart" },
  { prefix: "ab", prefixMeaning: "away", base: "duct", baseMeaning: "lead", word: "abduct", meaning: "to lead away" },
  { prefix: "in", prefixMeaning: "into", base: "ject", baseMeaning: "throw", word: "inject", meaning: "to throw into" },
  { prefix: "trans", prefixMeaning: "across", base: "port", baseMeaning: "carry", word: "transport", meaning: "to carry across" },
  { prefix: "ob", prefixMeaning: "against", base: "struct", baseMeaning: "build", word: "obstruct", meaning: "to build against" },
  { prefix: "re", prefixMeaning: "back", base: "port", baseMeaning: "carry", word: "report", meaning: "to carry back" },
  { prefix: "ex", prefixMeaning: "out", base: "tract", baseMeaning: "pull", word: "extract", meaning: "to pull out" },
  { prefix: "con", prefixMeaning: "together", base: "struct", baseMeaning: "build", word: "construct", meaning: "to build together" },
  { prefix: "pro", prefixMeaning: "forward", base: "ceed", baseMeaning: "go", word: "proceed", meaning: "to go forward" },
  { prefix: "re", prefixMeaning: "back", base: "ject", baseMeaning: "throw", word: "reject", meaning: "to throw back" },
  { prefix: "sub", prefixMeaning: "under", base: "sid", baseMeaning: "sit", word: "subside", meaning: "to sit under" },
  { prefix: "de", prefixMeaning: "down", base: "scend", baseMeaning: "climb", word: "descend", meaning: "to climb down" },
  { prefix: "se", prefixMeaning: "apart", base: "clud", baseMeaning: "close", word: "seclude", meaning: "to close apart" },
  { prefix: "sur", prefixMeaning: "over", base: "pass", baseMeaning: "go", word: "surpass", meaning: "to go over" },
  { prefix: "counter", prefixMeaning: "against", base: "act", baseMeaning: "do", word: "counteract", meaning: "to do against" },
  { prefix: "super", prefixMeaning: "above", base: "ven", baseMeaning: "come", word: "supervene", meaning: "to come above" },
  { prefix: "anti", prefixMeaning: "against", base: "thesis", baseMeaning: "place", word: "antithesis", meaning: "to place against" },
];

export default function RootPractice({ onBack }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Initialize questions
  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = () => {
    const shuffledRoots = shuffle(ENGLISH_ROOTS).slice(0, 20);
    const generated = shuffledRoots.map((rootObj) => {
      const typeOptions = ["root_to_meaning", "meaning_to_root", "example_to_root", "root_to_example", "example_to_meaning"];
      const questionType = typeOptions[Math.floor(Math.random() * typeOptions.length)];

      if (questionType === "root_to_meaning") {
        const correctMeaning = rootObj.meaning;
        const incorrectMeanings = shuffle(ENGLISH_ROOTS).filter(r => r.meaning !== correctMeaning).slice(0, 3).map(r => r.meaning);
        return {
          type: questionType,
          prompt: "What does this root mean?",
          target: rootObj.root,
          examples: rootObj.examples,
          correct_answer: correctMeaning,
          options: shuffle([correctMeaning, ...incorrectMeanings]),
          revealTitle: "Words with this root:"
        };
      } else if (questionType === "meaning_to_root") {
        const correctRoot = rootObj.root;
        const incorrectRoots = shuffle(ENGLISH_ROOTS).filter(r => r.root !== correctRoot).slice(0, 3).map(r => r.root);
        return {
          type: questionType,
          prompt: "Which root means:",
          target: rootObj.meaning,
          examples: rootObj.examples,
          correct_answer: correctRoot,
          options: shuffle([correctRoot, ...incorrectRoots]),
          revealTitle: "Words with this root:"
        };
      } else if (questionType === "root_to_example") {
        const correctExample = rootObj.examples[0];
        const incorrectExamples = shuffle(ENGLISH_ROOTS).filter(r => r.root !== rootObj.root).slice(0, 3).map(r => r.examples[0]);
        return {
          type: questionType,
          prompt: "Which of these words uses this root?",
          target: `${rootObj.root} (${rootObj.meaning})`,
          examples: rootObj.examples,
          correct_answer: correctExample,
          options: shuffle([correctExample, ...incorrectExamples]),
          revealTitle: "Words with this root:"
        };
      } else if (questionType === "example_to_meaning") {
        const example = rootObj.examples[Math.floor(Math.random() * rootObj.examples.length)];
        const correctMeaning = rootObj.meaning;
        const incorrectMeanings = shuffle(ENGLISH_ROOTS).filter(r => r.meaning !== correctMeaning).slice(0, 3).map(r => r.meaning);
        return {
          type: questionType,
          prompt: "Based on its root, what does this word relate to?",
          target: example,
          examples: rootObj.examples,
          correct_answer: correctMeaning,
          options: shuffle([correctMeaning, ...incorrectMeanings]),
          revealTitle: `Root: ${rootObj.root}`
        };
      } else {
        const correctRoot = rootObj.root;
        const incorrectRoots = shuffle(ENGLISH_ROOTS).filter(r => r.root !== correctRoot).slice(0, 3).map(r => r.root);
        return {
          type: questionType,
          prompt: "Which root is found in these words?",
          target: rootObj.examples.slice(0, 3).join(", "),
          examples: [rootObj.meaning],
          correct_answer: correctRoot,
          options: shuffle([correctRoot, ...incorrectRoots]),
          revealTitle: "Root Meaning:"
        };
      }
    });

    // Generate novel-word inference questions from curated prefix + root pairs.
    // Students must combine both root meanings to infer what the word means.
    const shuffledPairs = shuffle(INFERENCE_PAIRS).slice(0, 6);
    const allDirections = [...new Set(INFERENCE_PAIRS.map(p => p.prefixMeaning))];
    const inferenceQuestions = shuffledPairs.map(pair => {
      const wrongDirs = shuffle(allDirections.filter(d => d !== pair.prefixMeaning)).slice(0, 3);
      return {
        type: "novel_word_inference",
        prompt: "Using its roots, what does this word most likely mean?",
        target: pair.word,
        subtitle: `${pair.prefix} (${pair.prefixMeaning}) + ${pair.base} (${pair.baseMeaning})`,
        examples: [pair.meaning],
        correct_answer: pair.meaning,
        options: shuffle([pair.meaning, ...wrongDirs.map(d => `to ${pair.baseMeaning} ${d}`)]),
        revealTitle: "Root Breakdown:"
      };
    });

    const allQuestions = shuffle([...generated, ...inferenceQuestions]).slice(0, 20);
    setQuestions(allQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsFinished(false);
    setScore(0);
  };

  const handleAnswer = (option) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    if (option === questions[currentQuestionIndex].correct_answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      setIsFinished(true);
      // Log session
      base44.auth.me().then((user) => {
        if (user) {
          base44.entities.EnglishPracticeSession.create({
            user_id: user.id,
            session_type: "vocabulary", // treating roots as vocabulary
            status: "completed",
            start_time: new Date(Date.now() - questions.length * 15000).toISOString(), // rough estimate
            end_time: new Date().toISOString(),
            duration_minutes: Math.max(1, Math.round((questions.length * 15) / 60)), // assume 15s per question
            questions_attempted: questions.length,
            questions_correct: score,
            domains_covered: ["vocabulary", "roots"]
          });
        }
      });
    } else {
      setCurrentQuestionIndex(c => c + 1);
      setSelectedAnswer(null);
    }
  };

  if (questions.length === 0) return null;

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 mt-10">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Quiz Complete!</h2>
        <p className="text-xl text-gray-600">You scored {score} out of {questions.length}.</p>
        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={generateQuestions} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full">
            <RefreshCw className="w-4 h-4 mr-2" /> Play Again
          </Button>
          <Button onClick={onBack} variant="outline" className="rounded-full">
            Back to Practice
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Score: {score}
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 px-2">
        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${(currentQuestionIndex / questions.length) * 100}%` }}></div>
      </div>

      <Card className="border-2 border-emerald-100 shadow-xl rounded-3xl overflow-hidden">
        <CardContent className="p-8 text-center space-y-6">
          <p className="text-sm text-gray-500 font-semibold uppercase tracking-widest">{currentQ.prompt}</p>
          <h3 className="text-3xl md:text-5xl font-bold text-emerald-800 py-6 capitalize">{currentQ.target}</h3>
          {currentQ.subtitle && (
            <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2">
              {currentQ.subtitle}
            </p>
          )}
          
          <div className="space-y-3 mt-8">
            {currentQ.options.map((opt, i) => {
              let style = "border-gray-200 hover:border-emerald-400 bg-white text-gray-700 hover:bg-emerald-50";
              if (selectedAnswer) {
                if (opt === currentQ.correct_answer) {
                  style = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                } else if (opt === selectedAnswer) {
                  style = "border-red-400 bg-red-50 text-red-800 font-bold";
                } else {
                  style = "border-gray-200 bg-gray-50 opacity-50";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${style}`}
                >
                  <span className="text-lg">{opt}</span>
                  {selectedAnswer && opt === currentQ.correct_answer && <CheckCircle className="w-6 h-6 text-emerald-600" />}
                  {selectedAnswer === opt && opt !== currentQ.correct_answer && <XCircle className="w-6 h-6 text-red-500" />}
                </button>
              );
            })}
          </div>

          {selectedAnswer && (
            <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-left">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 mb-4">
                <p className="text-sm font-bold text-emerald-800 uppercase tracking-widest mb-3">{currentQ.revealTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {currentQ.examples.map(ex => (
                    <span key={ex} className="px-3 py-1.5 bg-white shadow-sm border border-emerald-100 rounded-lg text-emerald-700 font-medium">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
              <Button onClick={handleNext} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-14 text-lg font-semibold shadow-md">
                {currentQuestionIndex + 1 >= questions.length ? "See Results" : "Next Question"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
