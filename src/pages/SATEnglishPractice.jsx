import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen, Zap, Target, Brain, ChevronRight, CheckCircle, XCircle,
  RotateCcw, Sparkles, Star, ArrowLeft, Award, Clock, Filter, AlertTriangle, Pencil, Upload, Loader2
} from "lucide-react";
import EnglishTutorChat from "@/components/english/EnglishTutorChat";
import QuestionDissector from "@/components/english/QuestionDissector";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ENGLISH_QUESTIONS, ENGLISH_DOMAIN_LABELS } from "@/data/englishQuestions";
import { ENGLISH_QUESTIONS_PARAGRAPH_STYLE } from "@/data/englishQuestionsParagraphStyle";
import { GRAMMAR_DOMAINS } from "@/data/englishGrammarRules";
import VocabTrainer from "@/components/english/VocabTrainer";
import RealWorldApplications from "@/components/english/RealWorldApplications";
import WritingPractice from "@/components/english/WritingPractice";
import CustomPassagePractice from "@/components/english/CustomPassagePractice";
import GrammarLessons from "@/components/english/GrammarLessons";
import EnglishLessonViewer from "@/components/english/EnglishLessonViewer";
import RulesReference from "@/components/english/RulesReference";
import ReverseModeSession from "@/components/english/ReverseModeSession";
import SATWordle from "@/components/english/SATWordle";
import RootPractice from "@/components/english/RootPractice";
import PassageRevision from "@/components/english/PassageRevision";
import { motion, AnimatePresence } from "framer-motion";
import { awardForSession } from "@/utils/gamification";
import SessionRewardModal from "@/components/gamification/SessionRewardModal";
import MistakesReviewMode from "@/components/review/MistakesReviewMode";
import { useQueryClient } from "@tanstack/react-query";
import IDontKnowButton from "@/components/sat/IDontKnowButton";
import { IDK_ANSWER, isIdkEntry } from "@/utils/idk";
import BookmarkButton from "@/components/review/BookmarkButton";
import ReportQuestionModal from "@/components/teacher/ReportQuestionModal";
import { resolveQuestionIds } from "@/utils/questionResolver";

// ─── helpers ────────────────────────────────────────────────────────────────

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ─── QuestionCard ────────────────────────────────────────────────────────────

function QuestionCard({ question, onAnswer, onIDontKnow, answered, selectedAnswer, toolsOff = [] }) {
  const [showDissector, setShowDissector] = useState(false);
  const isCorrect = selectedAnswer === question.correct_answer;
  const isIdk = selectedAnswer === IDK_ANSWER;
  const isDissectorEnabled = !toolsOff.includes('dissector');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-emerald-100 text-emerald-800">
          {ENGLISH_DOMAIN_LABELS[question.domain] || question.domain}
        </Badge>
        <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
        <div className="ml-auto flex items-center gap-1">
          <BookmarkButton questionData={{ ...question, subject: 'english' }} />
        </div>
      </div>

      <Card className="border-2 border-emerald-100">
        <CardContent className="p-6">
          <p className="text-base font-medium text-gray-800 whitespace-pre-line leading-relaxed">
            {question.question_text}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3 max-h-96 overflow-y-auto">
         {question.options?.map((option) => {
           let style = "border-2 border-gray-200 hover:border-emerald-400 bg-white cursor-pointer";
           if (answered) {
             if (option.label === question.correct_answer) style = "border-2 border-emerald-500 bg-emerald-50";
             else if (option.label === selectedAnswer) style = "border-2 border-red-400 bg-red-50";
             else style = "border-2 border-gray-200 bg-gray-50 opacity-60";
           } else if (selectedAnswer === option.label) {
             style = "border-2 border-emerald-500 bg-emerald-50";
           }
           return (
             <button
               key={option.label}
               onClick={() => !answered && onAnswer(option.label)}
               className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${style}`}
             >
               <div className="flex items-start gap-3">
                 <span className="font-bold text-emerald-700 w-6 flex-shrink-0">{option.label})</span>
                 <span className="text-gray-800 text-sm leading-relaxed flex-1">{option.text}</span>
                 {answered && option.label === question.correct_answer && (
                   <CheckCircle className="w-5 h-5 text-emerald-600 ml-auto flex-shrink-0" />
                 )}
                 {answered && option.label === selectedAnswer && option.label !== question.correct_answer && (
                   <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />
                 )}
               </div>
             </button>
           );
         })}
       </div>

      {!answered && onIDontKnow && (
        <IDontKnowButton onClick={onIDontKnow} className="w-full" />
      )}

      <div className="flex justify-end mb-4">
        <ReportQuestionModal 
          question={question} 
          source={question.source || question.source_pdf}
          triggerElement={
            <button className="text-xs font-medium text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Faulty Question
            </button>
          }
        />
      </div>

      {answered && (
        <Card className={`border-l-4 ${isCorrect ? "border-emerald-500 bg-emerald-50" : isIdk ? "bg-amber-50 border-amber-300" : "bg-stone-50 border-stone-300"}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {isCorrect
                ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                : <XCircle className={`w-5 h-5 ${isIdk ? "text-amber-500" : "text-stone-500"}`} />}
              <span className={`font-semibold ${isCorrect ? "text-emerald-700" : isIdk ? "text-amber-700" : "text-stone-700"}`}>
                {isCorrect ? "Correct!" : isIdk ? 'You marked "I Don\'t Know"' : "Not quite"}
              </span>
            </div>
            <p className="text-sm text-gray-700">{question.explanation}</p>
            {question.rule_reference && (
              <p className="text-xs text-gray-500 italic">Rule: {question.rule_reference}</p>
            )}

            {isDissectorEnabled && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full mt-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/30"
                  onClick={() => setShowDissector(true)}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Launch Question Dissector
                </Button>

                {showDissector && (
                  <QuestionDissector 
                    question={question} 
                    onClose={() => setShowDissector(false)} 
                  />
                )}
              </>
            )}

            <EnglishTutorChat context={{
              questionText: question.question_text,
              correctAnswer: question.correct_answer,
              correctAnswerText: question.options?.find(o => o.label === question.correct_answer)?.text || '',
              studentAnswer: selectedAnswer,
              studentAnswerText: question.options?.find(o => o.label === selectedAnswer)?.text || '',
              explanation: question.explanation,
              ruleReference: question.rule_reference,
              skill: question.domain,
              isCorrect,
            }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Active Session (Blitz or Topic) ────────────────────────────────────────

function ActiveSession({ questions, sessionType, domainLabel, onBack, onComplete, toolsOff = [] }) {
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const [timer, setTimer] = useState(0);
  const questionStart = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAnswer = (label) => {
    setSelected(label);
    setAnswered(true);
    const currentQ = questions[current];
    const correct = label === currentQ.correct_answer;
    setResults(r => [...r, {
      question_id: currentQ.id,
      user_answer: label,
      correct,
      domain: currentQ.domain,
      difficulty: currentQ.difficulty || 'medium',
      time_spent_seconds: Math.round((Date.now() - questionStart.current) / 1000),
      question_text: currentQ.question_text,
      options: currentQ.options,
      correct_answer: currentQ.correct_answer,
      explanation: currentQ.explanation
    }]);
  };

  const handleIDontKnow = () => {
    setSelected(IDK_ANSWER);
    setAnswered(true);
    const currentQ = questions[current];
    setResults(r => [...r, {
      question_id: currentQ.id,
      user_answer: IDK_ANSWER,
      idk: true,
      correct: false,
      domain: currentQ.domain,
      difficulty: currentQ.difficulty || 'medium',
      time_spent_seconds: Math.round((Date.now() - questionStart.current) / 1000),
      question_text: currentQ.question_text,
      options: currentQ.options,
      correct_answer: currentQ.correct_answer,
      explanation: currentQ.explanation
    }]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      onComplete(results);
    } else {
      setCurrent(c => c + 1);
      setAnswered(false);
      setSelected(null);
      questionStart.current = Date.now();
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = ((current) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
            {sessionType === "blitz" ? "Blitz" : domainLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="font-mono">{formatTime(timer)}</span>
          <span>{current + 1} / {questions.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-2 mb-6 bg-gray-100" />

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="bg-white border-2 border-emerald-200 shadow-lg mb-4">
            <CardContent className="p-6">
              <QuestionCard
                question={questions[current]}
                onAnswer={handleAnswer}
                onIDontKnow={handleIDontKnow}
                answered={answered}
                selectedAnswer={selected}
                toolsOff={toolsOff}
              />
            </CardContent>
          </Card>

          {answered && (
            <div className="flex justify-end">
              <Button onClick={handleNext} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {current + 1 >= questions.length ? "See Results" : "Next Question"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Session Complete ────────────────────────────────────────────────────────

function SessionComplete({ results, onNewSession, onDashboard }) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const idkCount = results.filter(isIdkEntry).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgTime = total > 0 ? Math.round(results.reduce((s, r) => s + (r.time_spent_seconds || r.time || 0), 0) / total) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center"
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
        <Award className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h1>
      <p className="text-gray-600 mb-8">
        {accuracy >= 80 ? "Outstanding work! Your skills are really showing." : "Good effort — every practice session builds your skills."}
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-emerald-50 border-2 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-800">{correct}/{total}</p>
            <p className="text-sm text-gray-600">Correct</p>
            {idkCount > 0 && <p className="text-xs text-amber-600 font-semibold mt-1">{idkCount} not known</p>}
          </CardContent>
        </Card>
        <Card className="bg-stone-50 border-2 border-stone-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-stone-800">{accuracy}%</p>
            <p className="text-sm text-gray-600">Accuracy</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-2 border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-800">{avgTime}s</p>
            <p className="text-sm text-gray-600">Avg Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Domain Breakdown */}
      {(() => {
        const domainMap = {};
        results.forEach(r => {
          if (!r.domain) return;
          if (!domainMap[r.domain]) domainMap[r.domain] = { correct: 0, total: 0 };
          domainMap[r.domain].total++;
          if (r.correct) domainMap[r.domain].correct++;
        });
        const entries = Object.entries(domainMap).sort((a, b) => (b[1].correct/b[1].total) - (a[1].correct/a[1].total));
        if (entries.length <= 1) return null;
        return (
          <div className="text-left space-y-2 mb-4">
            <p className="text-sm font-semibold text-gray-700 text-center">Domain Breakdown</p>
            {entries.map(([domain, { correct: c, total: t }]) => {
              const pct = Math.round((c / t) * 100);
              return (
                <div key={domain} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-36 flex-shrink-0 truncate">
                    {ENGLISH_DOMAIN_LABELS[domain] || domain.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-stone-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="outline" onClick={onNewSession} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <RotateCcw className="w-4 h-4 mr-2" />New Session
        </Button>
        <Button onClick={onDashboard} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          Back to Dashboard
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Domain metadata helper ──────────────────────────────────────────────────

const READING_DOMAIN_META = {
  reading_comprehension: { label: "Reading Comprehension", emoji: "📖", description: "Passages + comprehension questions", category: "reading" },
  main_idea: { label: "Main Idea", emoji: "🎯", description: "Identify central claims and arguments", category: "reading" },
  inference: { label: "Inference", emoji: "🔍", description: "Draw conclusions from passages", category: "reading" },
  evidence_support: { label: "Evidence & Support", emoji: "📝", description: "Writing and rhetoric questions", category: "reading" },
  tone_purpose: { label: "Tone & Purpose", emoji: "🎭", description: "Author's tone and intent", category: "reading" },
  vocabulary: { label: "Vocabulary", emoji: "📚", description: "Word meaning in context", category: "vocabulary" },
};

function getDomainMeta(key) {
  if (READING_DOMAIN_META[key]) return READING_DOMAIN_META[key];
  if (GRAMMAR_DOMAINS[key]) return { ...GRAMMAR_DOMAINS[key], category: "grammar" };
  return { label: key.replace(/_/g, ' '), emoji: "📚", description: "", category: "grammar" };
}

// ─── Topic Selector ──────────────────────────────────────────────────────────

function TopicSelector({ onSelect, onBack, weakDomains = [] }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const allDomains = [...new Set(ENGLISH_QUESTIONS.map(q => q.domain))];
  const domainEntries = allDomains
    .filter(key => ENGLISH_QUESTIONS.some(q => q.domain === key))
    .map(key => [key, getDomainMeta(key)]);

  const filtered = categoryFilter === "all"
    ? domainEntries
    : domainEntries.filter(([, meta]) => meta.category === categoryFilter);

  const categories = [
    { id: "all", label: "All Topics" },
    { id: "grammar", label: "Grammar" },
    { id: "reading", label: "Reading" },
    { id: "vocabulary", label: "Vocabulary" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <h2 className="font-bold text-gray-800 text-lg">Choose a Topic</h2>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
              categoryFilter === cat.id
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Focus area banner if weak domains exist */}
      {weakDomains.length > 0 && categoryFilter === "all" && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Your focus areas:</p>
            <div className="flex flex-wrap gap-1">
              {weakDomains.slice(0, 5).map(d => (
                <button
                  key={d}
                  onClick={() => onSelect(d)}
                  className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-xs text-amber-800 hover:bg-amber-200 font-medium"
                >
                  {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(([key, domain]) => {
          const count = ENGLISH_QUESTIONS.filter(q => q.domain === key).length;
          if (count === 0) return null;
          const isWeak = weakDomains.includes(key);
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(key)}
              className={`text-left p-4 rounded-xl border-2 transition-all group bg-white ${
                isWeak
                  ? 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
                  : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{domain.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-gray-800 group-hover:text-emerald-700 ${isWeak ? 'group-hover:text-amber-700' : ''}`}>
                      {domain.label}
                    </p>
                    {isWeak && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Focus</span>}
                  </div>
                  <p className="text-xs text-gray-500">{count} questions · {domain.description}</p>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isWeak ? 'text-amber-400' : 'text-gray-400 group-hover:text-emerald-600'}`} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session Selection (home screen) ────────────────────────────────────────

function SessionSelection({ onStartBlitz, onStartTopic, onStartFocused, onStartVocab, onStartRoots, onStartPassageRevision, onStartRules, onStartRealWorld, onStartWriting, onStartCustom, onStartLessons, onStartReverse, onStartKnowledgeLessons, onStartMistakes, onStartParagraphStyle, onStartWordle, weakDomains }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl md:text-3xl font-bold text-white">
              SAT English Practice
            </h1>
            <p className="text-white/80 text-sm">Grammar, Vocabulary &amp; Reading</p>
          </div>
        </div>
      </div>

      {/* Focus Areas panel — only if we have weak domain data */}
      {!selectedCategory && weakDomains.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">Your Focus Areas</p>
              <span className="text-xs text-amber-600">— based on your practice history</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {weakDomains.slice(0, 6).map(d => (
                <button
                  key={d}
                  onClick={() => onStartFocused(d)}
                  className="px-3 py-1.5 bg-white border-2 border-amber-300 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-100 hover:border-amber-500 transition-all"
                >
                  {ENGLISH_DOMAIN_LABELS[d] || d.replace(/_/g, ' ')} →
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedCategory && (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-emerald-600 border-4 border-emerald-500 shadow-xl hover:shadow-2xl hover:border-emerald-400 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('practice')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Practice</h3>
                  <p className="text-sm text-emerald-50">Take full tests, adaptive blitzes, diagnostics, and review your mistakes.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-stone-600 border-4 border-stone-500 shadow-xl hover:shadow-2xl hover:border-stone-400 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('vocabulary')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Vocabulary</h3>
                  <p className="text-sm text-stone-50">Master SAT words through trainers, games like SATWordle, and word roots.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-emerald-700 border-4 border-emerald-600 shadow-xl hover:shadow-2xl hover:border-emerald-500 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('grammar')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Learn Grammar</h3>
                  <p className="text-sm text-emerald-50">Study grammar rules and take hyper-focused, AI-generated concept lessons.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer bg-stone-700 border-4 border-stone-600 shadow-xl hover:shadow-2xl hover:border-stone-500 transition-all rounded-3xl h-full" onClick={() => setSelectedCategory('extended')}>
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "Righteous, sans-serif" }} className="text-2xl font-bold text-white mb-2">Extended Practice</h3>
                  <p className="text-sm text-slate-50">Deepen your skills with literature, writing practice, custom passages, and more.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {selectedCategory && (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="mb-2 hover:bg-white text-stone-600 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Categories
          </Button>
          
          {selectedCategory === 'practice' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Full Practice Tests */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Simulate the Real Exam</p>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mb-6">
                  <Link to={createPageUrl("SATEnglishPracticeTest")} className="block">
                    <Card className="cursor-pointer bg-gradient-to-r from-[#005a9c] to-blue-800 border-4 border-white shadow-xl hover:shadow-2xl transition-all rounded-3xl h-full overflow-hidden relative">
                      <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <CardContent className="p-6 md:p-8 flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg backdrop-blur-sm">
                          <Target className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-xl md:text-2xl font-bold text-white mb-2">Full English Practice Tests</h3>
                          <p className="text-sm text-blue-100 mb-3 max-w-lg">Take a full-length, 2-module adaptive Digital SAT English practice test. Get an accurate 200-800 score and domain breakdowns.</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-900">
                            <Badge className="bg-white hover:bg-white text-blue-900 border-0">54 Questions</Badge>
                            <Badge className="bg-white hover:bg-white text-blue-900 border-0">64 min</Badge>
                            <Badge className="bg-white hover:bg-white text-blue-900 border-0">Adaptive</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Practice Drills</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Adaptive Blitz */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartBlitz}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg"><Zap className="w-6 h-6 text-white" /></div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">Adaptive Blitz</h3>
                          <p className="text-sm text-gray-500">15 mixed questions weighted toward your weak areas, with escalating difficulty</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Clock className="w-3 h-3" /><span>~12 min · Adaptive</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Choose Topic */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-stone-200 transition-all rounded-3xl h-full" onClick={onStartTopic}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-stone-500 flex items-center justify-center flex-shrink-0 shadow-lg"><Target className="w-6 h-6 text-white" /></div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">Choose a Topic</h3>
                          <p className="text-sm text-gray-500">Pick any grammar, reading, or vocab domain to drill specifically</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Filter className="w-3 h-3" /><span>Grammar · Reading · Vocab</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Passage Revision */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartPassageRevision}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><Pencil className="w-6 h-6 text-white" /></div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">Passage Revision <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span></h3>
                          <p className="text-sm text-gray-500">Correct grammatical errors directly inside a passage</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>In-Context Grammar</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Mistakes Review */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Card className="cursor-pointer bg-red-50/60 border-4 border-red-200 shadow-xl hover:shadow-2xl hover:border-red-400 transition-all rounded-3xl h-full" onClick={onStartMistakes}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center flex-shrink-0 shadow-lg"><RotateCcw className="w-6 h-6 text-white" /></div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-1">Your Mistakes</h3>
                          <p className="text-sm text-gray-500">Review past incorrect answers and practice targeted questions to refine your skills</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-red-600"><RotateCcw className="w-3 h-3" /><span>Targeted Review</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Diagnostic */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Link to={createPageUrl("SATEnglishDiagnostic")} className="block h-full">
                      <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full">
                        <CardContent className="p-5 flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg"><Brain className="w-6 h-6 text-white" /></div>
                          <div>
                            <h3 className="font-bold text-gray-900 mb-1">English Diagnostic</h3>
                            <p className="text-sm text-gray-500">Adaptive 27-question baseline test across all College Board domains</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Clock className="w-3 h-3" /><span>~15 min · Sets your baseline</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {selectedCategory === 'vocabulary' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Vocabulary</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Vocabulary Trainer */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartVocab}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><Star className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Vocabulary Trainer</h3>
                        <p className="text-sm text-gray-500">Flashcards, quizzes, and write-it-out practice for 400 SAT words</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Clock className="w-3 h-3" /><span>Flashcards · Quiz · Write</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* SATWordle */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartWordle}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><BookOpen className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">SATWordle <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span></h3>
                        <p className="text-sm text-gray-500">Guess the SAT vocabulary word in 6 tries, Wordle-style. Includes hints!</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>Fun daily practice</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Root Practice */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartRoots}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><Star className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Root Practice <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span></h3>
                        <p className="text-sm text-gray-500">Practice word roots to better infer the meanings of unknown vocabulary words</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>Word Roots · Multiple Choice</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}

          {selectedCategory === 'grammar' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Learn Grammar</p>
              <p className="text-xs text-gray-400 mb-3">Study rules first, then test yourself — these don't count toward your practice stats</p>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Concept Lessons */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-200 transition-all rounded-3xl h-full" onClick={onStartKnowledgeLessons}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg"><BookOpen className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Concept Lessons <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span></h3>
                        <p className="text-sm text-gray-500">80+ micro-concept lessons — pick any concept, get a focused lesson, worked example, and 3 SAT practice problems</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>AI-generated · Hyper-focused</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Grammar Lessons */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-stone-200 transition-all rounded-3xl h-full" onClick={onStartRules}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-stone-600 flex items-center justify-center flex-shrink-0 shadow-lg"><BookOpen className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Rules Reference</h3>
                        <p className="text-sm text-gray-500">All 17 grammar rule categories — expandable with 2 practice questions each to test your understanding</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-stone-500"><BookOpen className="w-3 h-3" /><span>17 categories · Rules + Quick Quiz</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}

          {selectedCategory === 'extended' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Extended Practice</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Real-World Applications */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full" onClick={onStartRealWorld}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg"><BookOpen className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Classic Literature</h3>
                        <p className="text-sm text-gray-500">Excerpts from classic texts with inference, tone, and AI-graded written responses</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>AI-graded responses</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Writing Practice */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full" onClick={onStartWriting}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center flex-shrink-0 shadow-lg"><Pencil className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Writing Practice</h3>
                        <p className="text-sm text-gray-500">Write a short passage, then answer AI-generated SAT questions based on your own writing</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>Questions generated from your text</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Custom Passage Upload */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full" onClick={onStartCustom}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg"><Upload className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Custom Passage</h3>
                        <p className="text-sm text-gray-500">Upload any PDF, .txt, or .docx — get adaptive SAT-style questions instantly</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>Adaptive difficulty · Your material</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Reverse Mode */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="cursor-pointer bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full" onClick={onStartReverse}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg"><RotateCcw className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Reverse Mode <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">New</span></h3>
                        <p className="text-sm text-gray-500">See the correct answer — then explain WHY it's right. AI grades your reasoning and debates with you</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600"><Sparkles className="w-3 h-3" /><span>AI-graded · Debate mode</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Paragraph Style (Real SAT Fatigue) */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Card className="bg-white border-4 border-white shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all rounded-3xl h-full flex flex-col">
                    <CardContent className="p-5 flex items-start gap-4 flex-1 cursor-pointer" onClick={() => onStartParagraphStyle(false)}>
                      <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-lg"><AlertTriangle className="w-6 h-6 text-white" /></div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Real SAT Format <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Challenge</span></h3>
                        <p className="text-sm text-gray-500">Paragraph-length passages with extremely similar answer choices on technical/scientific topics — mirrors real SAT fatigue</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-600"><Zap className="w-3 h-3" /><span>High difficulty · Focus required</span></div>
                      </div>
                    </CardContent>
                    <div className="px-5 pb-5 mt-auto pt-3 border-t border-stone-100">
                      <Button variant="outline" size="sm" className="w-full py-2 h-auto text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); onStartParagraphStyle(true); }}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate Infinite New Questions (AI)
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Seen-question deduplication (persisted across sessions) ─────────────────

function getEnglishSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem('eng_seen_ids') || '[]')); }
  catch { return new Set(); }
}
function markEnglishSeenIds(ids) {
  try {
    const existing = getEnglishSeenIds();
    ids.forEach(id => existing.add(id));
    localStorage.setItem('eng_seen_ids', JSON.stringify([...existing]));
  } catch {}
}

// ─── Adaptive Blitz question builder ─────────────────────────────────────────

function buildAdaptiveBlitz(domainScores) {
  // domainScores: { domain: accuracyPct } or {}
  const TOTAL = 15;
  const difficulties = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard', 'hard', 'expert', 'expert', 'expert'];

  // Compute domain weights: weak domains get more questions
  const allDomains = [...new Set(ENGLISH_QUESTIONS.map(q => q.domain))];
  const weights = {};
  allDomains.forEach(d => {
    const score = domainScores[d];
    if (score === undefined) weights[d] = 3; // unseen = high priority
    else if (score < 50) weights[d] = 4;
    else if (score < 70) weights[d] = 2;
    else weights[d] = 1;
  });

  // Prefer questions the student hasn't seen across sessions
  const seenIds = getEnglishSeenIds();
  const usedIds = new Set();
  const result = [];

  for (let i = 0; i < TOTAL; i++) {
    const difficulty = difficulties[i] || 'medium';

    // Build weighted domain pool (prefer unseen questions)
    const weightedDomains = [];
    allDomains.forEach(d => {
      const available = ENGLISH_QUESTIONS.filter(q =>
        q.domain === d && q.difficulty === difficulty && !usedIds.has(q.id) && !seenIds.has(q.id)
      );
      if (available.length > 0) {
        for (let w = 0; w < weights[d]; w++) weightedDomains.push(d);
      }
    });

    let domain = weightedDomains.length > 0
      ? weightedDomains[Math.floor(Math.random() * weightedDomains.length)]
      : null;

    // Candidates: prefer unseen, then unseen-in-session, then any
    let candidates = domain
      ? ENGLISH_QUESTIONS.filter(q => q.domain === domain && q.difficulty === difficulty && !usedIds.has(q.id) && !seenIds.has(q.id))
      : ENGLISH_QUESTIONS.filter(q => q.difficulty === difficulty && !usedIds.has(q.id) && !seenIds.has(q.id));

    // Fallback 1: same difficulty, any domain, unseen cross-session
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS.filter(q => q.difficulty === difficulty && !usedIds.has(q.id) && !seenIds.has(q.id));
    // Fallback 2: any unseen-in-session question, unseen cross-session
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS.filter(q => !usedIds.has(q.id) && !seenIds.has(q.id));
    // Fallback 3: allow repeats only as absolute last resort
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS.filter(q => !usedIds.has(q.id));
    if (candidates.length === 0) candidates = ENGLISH_QUESTIONS;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(pick.id);
    result.push(pick);
  }

  return result;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SATEnglishPractice() {
  const [user, setUser] = useState(null);
  const [weakDomains, setWeakDomains] = useState([]);
  const [domainScores, setDomainScores] = useState({});
  // view: "home" | "topic_select" | "session" | "vocab" | "rules" | "complete" | "realworld" | "writing" | "custom" | "lessons" | "reverse" | "knowledge_lessons" | "knowledge_lesson_domain"
  const [view, setView] = useState("home");
  const [sessionType, setSessionType] = useState(null); // "blitz" | "topic" | "writing"
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [activeDomain, setActiveDomain] = useState(null);
  const [lessonDomain, setLessonDomain] = useState(null);
  const [lessonSubtopic, setLessonSubtopic] = useState(null);
  const [sessionReward, setSessionReward] = useState(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [toolsOff, setToolsOff] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Load english performance to surface weak domains
      const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
      const perf = profiles[0]?.english_performance || {};
      const scores = perf.domain_scores || {};
      setDomainScores(scores);
      // Weak = score < 60 or unseen
      const allDomains = [...new Set(ENGLISH_QUESTIONS.map(q => q.domain))];
      const weak = allDomains
        .filter(d => scores[d] === undefined || scores[d] < 60)
        .sort((a, b) => (scores[a] ?? -1) - (scores[b] ?? -1));
      setWeakDomains(weak);
    }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const toolsOffParam = params.get('toolsOff');
    if (toolsOffParam) {
      setToolsOff(toolsOffParam.split(','));
    }

    if (params.get("mode") === "lesson") {
      // Direct link to English lesson with AI tutor
      const subtopic = params.get("subtopic") ? decodeURIComponent(params.get("subtopic")) : null;
      const domain = params.get("domain") || null;
      if (subtopic && domain) {
        setLessonDomain(domain);
        setLessonSubtopic(subtopic);
        setView("knowledge_lesson_domain");
      } else if (domain) {
        setLessonDomain(domain);
        setView("knowledge_lesson_domain");
      } else {
        setView("knowledge_lessons");
      }
    } else if (params.get("mode") === "vocab") {
      setView("vocab");
    } else if (params.get("tab") === "blitz") {
      const qs = buildAdaptiveBlitz({});
      setSessionQuestions(qs);
      setSessionType("blitz");
      setActiveDomain(null);
      setView("session");
    } else if (params.get("autoStart") === "1") {
      const source = params.get("source");
      const qids = (params.get("qids") || '').split(',').filter(Boolean);
      if (source === "specific" && qids.length > 0) {
        (async () => {
          const resolved = await resolveQuestionIds(qids, "EnglishQuestion");
          if (resolved.length > 0) {
            setSessionQuestions(resolved);
            setSessionType("blitz");
            setActiveDomain(null);
            setView("session");
          }
        })();
      } else {
        const type = params.get("type") || "blitz";
        if (type === "blitz") {
          startBlitz();
        } else {
          const topics = params.get("topic");
          if (topics) {
            const firstTopic = topics.split(',')[0];
            startTopic(firstTopic, type);
          } else {
            startBlitz();
          }
        }
      }
    }
  }, []);

  const startBlitz = () => {
    const qs = buildAdaptiveBlitz(domainScores);
    setSessionQuestions(qs);
    setSessionType("blitz");
    setActiveDomain(null);
    setView("session");
  };

  const startSimilarSession = async (mistakeText, domain, difficulty) => {
    setIsGeneratingQuestion(true);
    try {
      // Fetch the first question quickly to start the session immediately
      const res = await base44.functions.invoke('generateSATQuestion', {
        domain, difficulty, similarToQuestionText: mistakeText, subject: 'english', count: 1
      });
      const aiQs = res.data?.questions || [];
      if (aiQs.length > 0) {
        setSessionQuestions(aiQs);
        setSessionType("similar");
        setActiveDomain(domain);
        setView("session");

        // Fetch remaining questions in the background
        base44.functions.invoke('generateSATQuestion', {
          domain, difficulty, similarToQuestionText: mistakeText, subject: 'english', count: 2
        }).then(moreRes => {
          const moreQs = moreRes.data?.questions || [];
          if (moreQs.length > 0) {
            setSessionQuestions(prev => [...prev, ...moreQs]);
          }
        }).catch(err => console.error('Failed to stream remaining questions:', err));
      }
    } catch (e) {
      console.error(e);
    }
    setIsGeneratingQuestion(false);
  };

  const startTopic = (domainKey, overrideType = "topic") => {
    const seenIds = getEnglishSeenIds();
    const allDomain = ENGLISH_QUESTIONS.filter(q => q.domain === domainKey);
    // Prefer unseen questions first
    const unseen = shuffle(allDomain.filter(q => !seenIds.has(q.id)));
    const seen = shuffle(allDomain.filter(q => seenIds.has(q.id)));
    // Use strictly unseen if we have them, only fallback to seen if empty
    const pool = unseen.length > 0 ? unseen : seen;
    if (pool.length === 0) return;
    
    // For recall, limit to fewer questions, like math does
    const qsLength = overrideType === 'recall' ? 4 : 15;
    let qs = pool.slice(0, qsLength);
    
    setSessionQuestions(qs);
    setSessionType(overrideType);
    setActiveDomain(domainKey);
    setView("session");
  };

  const startParagraphStyle = async (useAI = false) => {
    if (useAI) {
      setIsGeneratingQuestion(true);
      try {
        const res = await base44.functions.invoke('generateParagraphQuestions', { count: 5 });
        const aiQs = res.data?.questions || [];
        if (aiQs.length > 0) {
          setSessionQuestions(aiQs);
          setSessionType("paragraph_style");
          setActiveDomain("paragraph_style");
          setView("session");
        }
      } catch (e) {
        console.error(e);
      }
      setIsGeneratingQuestion(false);
      return;
    }

    const seenIds = getEnglishSeenIds();
    const unseen = shuffle(ENGLISH_QUESTIONS_PARAGRAPH_STYLE.filter(q => !seenIds.has(q.id)));
    const seen = shuffle(ENGLISH_QUESTIONS_PARAGRAPH_STYLE.filter(q => seenIds.has(q.id)));
    const pool = unseen.length > 0 ? unseen : seen;
    if (pool.length === 0) return;
    
    let qs = pool.slice(0, 5);
    setSessionQuestions(qs);
    setSessionType("paragraph_style");
    setActiveDomain("paragraph_style");
    setView("session");
  };

  const handleSessionComplete = async (results) => {
    setSessionResults(results);

    // Persist to EnglishPracticeSession entity
    if (user) {
      const correct = results.filter(r => r.correct).length;
      const domainCounts = {};
      results.forEach(r => {
        if (!domainCounts[r.domain]) domainCounts[r.domain] = { correct: 0, total: 0 };
        domainCounts[r.domain].total++;
        if (r.correct) domainCounts[r.domain].correct++;
      });
      const sorted = Object.entries(domainCounts).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));
      const accuracy = Math.round((correct / results.length) * 100);

      const params = new URLSearchParams(window.location.search);
      const assignmentId = params.get('assignmentId');
      const fromStudyPlan = params.get('studyPlan') === 'true';

      // Map session types consistently
      let finalSessionType = sessionType;
      if (sessionType === "topic") finalSessionType = "choice";
      
      await base44.entities.EnglishPracticeSession.create({
        user_id: user.id,
        session_type: finalSessionType,
        status: "completed",
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: Math.max(1, Math.round(results.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / 60)),
        questions_attempted: results.length,
        questions_correct: correct,
        domains_covered: [...new Set(results.map(r => r.domain))],
        question_history: results,
        from_study_plan: fromStudyPlan,
        ...(assignmentId ? { assignment_id: assignmentId } : {}),
        performance_summary: {
          accuracy_percentage: accuracy,
          avg_time_per_question: results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.time_spent_seconds || 0), 0) / results.length) : 0,
          strongest_domain: sorted[0]?.[0] || "",
          weakest_domain: sorted[sorted.length - 1]?.[0] || "",
        }
      });

      // Update StudentAssignmentProgress if this was an assignment
      if (assignmentId) {
        const progressEntries = await base44.entities.StudentAssignmentProgress.filter({
          student_id: user.id,
          assignment_id: assignmentId,
        });
        if (progressEntries?.[0]) {
          await base44.entities.StudentAssignmentProgress.update(progressEntries[0].id, {
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            score: accuracy,
            question_history: results
          });
        } else {
          await base44.entities.StudentAssignmentProgress.create({
            student_id: user.id,
            assignment_id: assignmentId,
            status: 'completed',
            progress_percentage: 100,
            completed_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            score: accuracy,
            question_history: results
          });
        }
      }

      // Update UserProfile english_performance
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profile = profiles[0];
      if (profile) {
        const prev = profile.english_performance || {};
        const newTotalAttempted = (prev.total_questions_attempted || 0) + results.length;
        const newTotalCorrect = (prev.total_correct || 0) + correct;
        const cumulativeAccuracy = newTotalAttempted > 0
          ? Math.round((newTotalCorrect / newTotalAttempted) * 100) : 0;

        // Merge domain counts for persistent strongest/weakest tracking
        const prevDomainScores = prev.domain_scores || {};
        const mergedDomainScores = { ...prevDomainScores };
        Object.entries(domainCounts).forEach(([domain, { correct: dc, total: dt }]) => {
          const prev = mergedDomainScores[domain] || { correct: 0, total: 0 };
          mergedDomainScores[domain] = {
            correct: (prev.correct || 0) + dc,
            total: (prev.total || 0) + dt,
          };
        });
        const domainAccuracies = Object.entries(mergedDomainScores)
          .filter(([, v]) => v.total > 0)
          .map(([domain, { correct: dc, total: dt }]) => [domain, Math.round((dc / dt) * 100)])
          .sort((a, b) => b[1] - a[1]);

        await base44.entities.UserProfile.update(profile.id, {
          english_performance: {
            ...prev,
            total_questions_attempted: newTotalAttempted,
            total_correct: newTotalCorrect,
            diagnostic_accuracy: cumulativeAccuracy,
            domain_scores: Object.fromEntries(
              domainAccuracies.map(([d, acc]) => [d, acc])
            ),
            strongest_domain: domainAccuracies[0]?.[0] || prev.strongest_domain,
            weakest_domain: domainAccuracies[domainAccuracies.length - 1]?.[0] || prev.weakest_domain,
            last_session_date: new Date().toISOString(),
          }
        });
      }
    }

    // Mark all questions from this session as seen (cross-session deduplication)
    const questionIds = sessionQuestions.map(q => q.id).filter(Boolean);
    markEnglishSeenIds(questionIds);

    // Award XP / coins / badges so English sessions count toward gamification
    if (user?.id) {
      try {
        const correct = results.filter(r => r.correct).length;
        // Use median difficulty across the session for the reward bucket
        const difficulties = sessionQuestions.map(q => q.difficulty).filter(Boolean);
        const sessionDifficulty = difficulties.includes('expert') ? 'expert'
                                 : difficulties.includes('hard') ? 'hard'
                                 : difficulties.includes('medium') ? 'medium' : 'easy';
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        const ef = profiles[0]?.executive_functioning || null;
        const reward = await awardForSession(user.id, {
          questions_correct: correct,
          questions_attempted: results.length,
          current_difficulty: sessionDifficulty,
        }, ef);
        if (reward) setSessionReward(reward);
        queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user.id] });
      } catch (e) { /* never block session completion */ }
    }

    setView("complete");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === "session") {
    return (
      <ActiveSession
        questions={sessionQuestions}
        sessionType={sessionType}
        domainLabel={activeDomain ? GRAMMAR_DOMAINS[activeDomain]?.label : ""}
        onBack={() => setView(sessionType === "topic" ? "topic_select" : "home")}
        onComplete={handleSessionComplete}
        toolsOff={toolsOff}
      />
    );
  }

  if (view === "complete") {
    return (
      <>
        <SessionComplete
          results={sessionResults}
          onNewSession={() => setView("home")}
          onDashboard={() => window.location.href = createPageUrl("Dashboard")}
        />
        {sessionReward && <SessionRewardModal reward={sessionReward} onClose={() => setSessionReward(null)} />}
      </>
    );
  }

  if (view === "topic_select") {
    return (
      <TopicSelector
        onSelect={startTopic}
        onBack={() => setView("home")}
        weakDomains={weakDomains}
      />
    );
  }

  if (view === "vocab") {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setView("home")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />Back to Practice
        </Button>
        <VocabTrainer user={user} />
      </div>
    );
  }

  if (view === "roots") {
    return <RootPractice onBack={() => setView("home")} />;
  }

  if (view === "passage_revision") {
    return <PassageRevision onBack={() => setView("home")} onComplete={(results) => {
      setSessionType("passage_revision");
      handleSessionComplete(results);
    }} />;
  }

  if (view === "realworld") {
    return <RealWorldApplications onBack={() => setView("home")} />;
  }

  if (view === "writing") {
    return <WritingPractice onBack={() => setView("home")} user={user} />;
  }

  if (view === "custom") {
    return <CustomPassagePractice onBack={() => setView("home")} />;
  }

  if (view === "lessons") {
    return <GrammarLessons onBack={() => setView("home")} />;
  }

  if (view === "rules") {
    return <RulesReference onBack={() => setView("home")} />;
  }

  if (view === "mistakes") {
    return (
      <div className="relative">
        {isGeneratingQuestion && (
           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl min-h-[400px]">
             <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
             <p className="text-emerald-700 font-medium">Generating similar practice questions...</p>
           </div>
        )}
        <MistakesReviewMode
          user={user}
          subject="english"
          allQuestionsLookup={ENGLISH_QUESTIONS}
          onBack={() => setView("home")}
          onPracticeSimilar={(domain, difficulty, mistakeText) => {
            startSimilarSession(mistakeText, domain, difficulty);
          }}
        />
      </div>
    );
  }

  if (view === "reverse") {
    const reverseQs = shuffle(ENGLISH_QUESTIONS.filter(q => q.options && q.options.length > 0)).slice(0, 8);
    return <ReverseModeSession questions={reverseQs} onBack={() => setView("home")} />;
  }

  if (view === "knowledge_lessons") {
    const domains = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'];
    const domainEmojis = { 'Information and Ideas': '💡', 'Craft and Structure': '🏗️', 'Expression of Ideas': '✍️', 'Standard English Conventions': '📚' };
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-emerald-500 border-4 border-white rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl mb-6">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SAT English Lessons</h1>
              <p className="text-white/80 text-sm">Hyper-focused concept lessons across all 4 SAT domains</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Choose a domain</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {domains.map(d => (
              <button
                key={d}
                onClick={() => { setLessonDomain(d); setView('knowledge_lesson_domain'); }}
                className="text-left p-4 rounded-2xl border-2 border-white bg-white shadow-md hover:border-emerald-300 hover:shadow-emerald-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{domainEmojis[d]}</span>
                  <div className="flex-1">
                    <p className="font-bold text-stone-800 group-hover:text-emerald-700 text-sm">{d}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-500" />
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setView('home')} className="text-sm text-stone-400 hover:text-stone-600 underline mt-2">
            ← Back to Practice
          </button>
        </div>
      </div>
    );
  }

  if (view === 'knowledge_lesson_domain' && lessonDomain) {
    return (
      <EnglishLessonViewer
        domain={lessonDomain}
        subtopic={lessonSubtopic || ''}
        onBack={() => { setLessonSubtopic(null); setView('knowledge_lessons'); }}
      />
    );
  }

  if (view === 'wordle') {
    return <SATWordle onBack={() => setView("home")} />;
  }

  // Home
  return (
    <div className="relative">
      {isGeneratingQuestion && (
         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl min-h-[400px]">
           <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
           <p className="text-emerald-700 font-medium">Generating dense paragraph-style questions with AI...</p>
         </div>
      )}
    <SessionSelection
      onStartBlitz={startBlitz}
      onStartTopic={() => setView("topic_select")}
      onStartFocused={(domain) => startTopic(domain)}
      onStartVocab={() => setView("vocab")}
      onStartRoots={() => setView("roots")}
      onStartPassageRevision={() => setView("passage_revision")}
      onStartRules={() => setView("rules")}
      onStartRealWorld={() => setView("realworld")}
      onStartWriting={() => setView("writing")}
      onStartCustom={() => setView("custom")}
      onStartLessons={() => setView("lessons")}
      onStartReverse={() => setView("reverse")}
      onStartKnowledgeLessons={() => setView("knowledge_lessons")}
      onStartMistakes={() => setView("mistakes")}
      onStartParagraphStyle={startParagraphStyle}
      onStartWordle={() => setView("wordle")}
      weakDomains={weakDomains}
    />
    </div>
  );
}
