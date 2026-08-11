import React, { useState, useEffect, useRef } from "react";
import { useSatVocab } from "@/data/satVocab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Zap, Flame, XCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function VocabGame({ onComplete }) {
  const SAT_VOCAB = useSatVocab();
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [stats, setStats] = useState({ attempted: 0, correct: 0 });

  const timerRef = useRef(null);
  const statsRef = useRef({ attempted: 0, correct: 0 });

  const startGame = () => {
    if (SAT_VOCAB.length === 0) return;
    setIsPlaying(true);
    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setTimeLeft(60);
    setGameOver(false);
    setStats({ attempted: 0, correct: 0 });
    statsRef.current = { attempted: 0, correct: 0 };
    nextWord();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          setIsPlaying(false);
          
          // Log session
          base44.auth.me().then(user => {
            if (user) {
              base44.entities.EnglishPracticeSession.create({
                user_id: user.id,
                session_type: "vocabulary",
                status: "completed",
                start_time: new Date(Date.now() - 60000).toISOString(),
                end_time: new Date().toISOString(),
                duration_minutes: 1,
                questions_attempted: statsRef.current.attempted,
                questions_correct: statsRef.current.correct,
                domains_covered: ["vocabulary", "game"]
              });
            }
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const nextWord = () => {
    const wordObj = SAT_VOCAB[Math.floor(Math.random() * SAT_VOCAB.length)];
    const distractors = shuffle(SAT_VOCAB.filter(w => w.word !== wordObj.word)).slice(0, 3).map(w => w.definition);
    setCurrentWord(wordObj);
    setOptions(shuffle([wordObj.definition, ...distractors]));
  };

  const handleAnswer = (selectedDef) => {
    statsRef.current.attempted += 1;
    setStats(prev => ({ ...prev, attempted: prev.attempted + 1 }));

    if (selectedDef === currentWord.definition) {
      statsRef.current.correct += 1;
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      const pts = 10 * multiplier;
      setScore(s => s + pts);
      setStreak(s => s + 1);
      if (streak + 1 >= 3) setMultiplier(2);
      if (streak + 1 >= 7) setMultiplier(3);
      if (streak + 1 >= 12) setMultiplier(5);
      nextWord();
    } else {
      setStreak(0);
      setMultiplier(1);
      setTimeLeft(prev => Math.max(0, prev - 3)); // 3 second penalty
      nextWord();
    }
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (!isPlaying && !gameOver) {
    if (SAT_VOCAB.length === 0) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      );
    }
    return (
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-indigo-900">Vocab Blitz</h2>
          <p className="text-indigo-700 max-w-md mx-auto">
            Race against the clock! You have 60 seconds to define as many words as possible. 
            Build your streak to increase your score multiplier. Incorrect answers cost you 3 seconds!
          </p>
          <Button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-6 rounded-2xl">
            Start Game
          </Button>
          <Button variant="ghost" onClick={onComplete} className="mt-2 block mx-auto">Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (gameOver) {
    return (
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardContent className="p-8 text-center space-y-6">
          <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
          <div>
            <h2 className="text-3xl font-bold text-indigo-900 mb-2">Time's Up!</h2>
            <p className="text-indigo-700 text-lg">Final Score</p>
            <p className="text-5xl font-black text-indigo-600">{score}</p>
          </div>
          <div className="flex justify-center gap-4">
            <Button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700">Play Again</Button>
            <Button variant="outline" onClick={onComplete}>Back to Menu</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Clock className={`w-6 h-6 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`} />
          </div>
          <span className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>0:{timeLeft.toString().padStart(2, '0')}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Score</span>
          <span className="text-3xl font-black text-indigo-600">{score}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-sm font-bold text-orange-500 block">Streak: {streak}</span>
            <span className="text-xs text-gray-400">Multiplier</span>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-full font-black text-lg ${multiplier > 1 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
            x{multiplier}
          </div>
        </div>
      </div>

      <Progress value={(timeLeft / 60) * 100} className="h-3" />

      <Card className="border-2 border-indigo-100 shadow-md">
        <CardContent className="p-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord.word}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <h2 className="text-4xl font-black text-gray-800 mb-6">{currentWord.word}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => handleAnswer(opt)}
                    className="h-auto py-6 px-4 text-left whitespace-normal border-2 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 text-sm font-medium"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
