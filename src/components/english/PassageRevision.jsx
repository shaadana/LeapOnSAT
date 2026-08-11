import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, Check } from "lucide-react";
import { PASSAGE_REVISIONS } from "@/data/passageRevisions";
import { motion, AnimatePresence } from "framer-motion";

export default function PassageRevision({ onBack, onComplete }) {
  const [passage, setPassage] = useState(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const questionStart = useRef(Date.now());

  useEffect(() => {
    // Pick a random passage
    const randomPassage = PASSAGE_REVISIONS[Math.floor(Math.random() * PASSAGE_REVISIONS.length)];
    setPassage(randomPassage);
    
    // Find the first error segment to select automatically
    const firstErrorIdx = randomPassage.segments.findIndex(s => s.isError);
    if (firstErrorIdx !== -1) {
      setSelectedSegmentIndex(firstErrorIdx);
    }
  }, []);

  const handleSegmentClick = (index) => {
    if (passage.segments[index].isError) {
      setSelectedSegmentIndex(index);
      questionStart.current = Date.now();
    }
  };

  const handleAnswer = (optionLabel) => {
    if (answers[selectedSegmentIndex]) return; // already answered

    const segment = passage.segments[selectedSegmentIndex];
    const isCorrect = optionLabel === segment.correct_answer;

    setAnswers(prev => ({ ...prev, [selectedSegmentIndex]: optionLabel }));

    setResults(prev => [
      ...prev,
      {
        question_id: `${passage.id}_${selectedSegmentIndex}`,
        user_answer: optionLabel,
        correct: isCorrect,
        domain: segment.domain || "grammar",
        difficulty: "medium",
        time_spent_seconds: Math.round((Date.now() - questionStart.current) / 1000),
        question_text: segment.text,
        options: segment.options,
        correct_answer: segment.correct_answer,
        explanation: segment.explanation
      }
    ]);
  };

  const handleNext = () => {
    // Find next unanswered error segment
    const nextUnanswered = passage.segments.findIndex((s, idx) => s.isError && !answers[idx]);
    if (nextUnanswered !== -1) {
      setSelectedSegmentIndex(nextUnanswered);
      questionStart.current = Date.now();
    }
  };

  if (!passage) return null;

  const totalErrors = passage.segments.filter(s => s.isError).length;
  const answeredCount = Object.keys(answers).length;
  const isFinished = answeredCount === totalErrors && totalErrors > 0;

  const currentSegment = selectedSegmentIndex !== null ? passage.segments[selectedSegmentIndex] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
          <div className="font-bold text-lg text-emerald-800">Passage Revision</div>
        </div>
        <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Progress: {answeredCount} / {totalErrors}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Passage */}
        <Card className="border-2 border-emerald-100 shadow-xl rounded-3xl overflow-hidden h-[600px] flex flex-col">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100">
            <h3 className="font-bold text-emerald-900 text-lg">{passage.title}</h3>
            <p className="text-xs text-emerald-600 uppercase tracking-widest mt-1">Read and correct the passage</p>
          </div>
          <CardContent className="p-6 overflow-y-auto flex-1 text-lg leading-relaxed text-gray-800">
            {passage.segments.map((segment, idx) => {
              if (!segment.isError) {
                return <span key={idx}>{segment.text}</span>;
              }

              const isAnswered = !!answers[idx];
              const isSelected = selectedSegmentIndex === idx;
              
              // If answered, show the chosen text if correct, or keep original if wrong
              let displayText = segment.text;
              if (isAnswered) {
                const userChoice = segment.options.find(o => o.label === answers[idx]);
                const correctChoice = segment.options.find(o => o.label === segment.correct_answer);
                
                if (answers[idx] === segment.correct_answer) {
                  displayText = correctChoice.text === "NO CHANGE" ? segment.text : correctChoice.text;
                } else {
                  displayText = userChoice.text === "NO CHANGE" ? segment.text : userChoice.text;
                }
              }

              let styles = "cursor-pointer transition-all duration-200 px-1 mx-0.5 rounded ";
              if (isSelected) {
                styles += "bg-emerald-200 text-emerald-900 shadow-sm border-b-2 border-emerald-500";
              } else if (isAnswered) {
                if (answers[idx] === segment.correct_answer) {
                  styles += "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-300";
                } else {
                  styles += "bg-red-50 text-red-700 border-b-2 border-red-300 line-through decoration-red-400";
                }
              } else {
                styles += "bg-amber-100 text-amber-900 hover:bg-amber-200 border-b-2 border-amber-400 border-dotted";
              }

              return (
                <span 
                  key={idx} 
                  className={styles} 
                  onClick={() => handleSegmentClick(idx)}
                >
                  {displayText}
                </span>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Question & Feedback */}
        <div className="flex flex-col h-[600px]">
          {currentSegment ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSegmentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                <Card className="border-2 border-emerald-100 shadow-xl rounded-3xl overflow-hidden flex-1 flex flex-col">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-widest">
                      How should this be revised?
                    </p>
                  </div>
                  <CardContent className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                    <p className="text-gray-800 font-medium bg-white p-4 rounded-xl border border-gray-200 shadow-sm italic">
                      "{currentSegment.text.trim()}"
                    </p>

                    <div className="space-y-3 mt-2 flex-1">
                      {currentSegment.options.map((opt, i) => {
                        const isAnswered = !!answers[selectedSegmentIndex];
                        const isSelectedOption = answers[selectedSegmentIndex] === opt.label;
                        const isCorrectOption = currentSegment.correct_answer === opt.label;

                        let btnStyle = "border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:bg-emerald-50";
                        
                        if (isAnswered) {
                          if (isCorrectOption) {
                            btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                          } else if (isSelectedOption) {
                            btnStyle = "border-red-400 bg-red-50 text-red-800 font-bold";
                          } else {
                            btnStyle = "border-gray-200 bg-gray-50 opacity-50";
                          }
                        }

                        return (
                          <button
                            key={i}
                            onClick={() => handleAnswer(opt.label)}
                            disabled={isAnswered}
                            className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${btnStyle}`}
                          >
                            <div className="flex gap-3">
                              <span className="font-bold w-6">{opt.label})</span>
                              <span>{opt.text}</span>
                            </div>
                            {isAnswered && isCorrectOption && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                            {isAnswered && isSelectedOption && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {answers[selectedSegmentIndex] && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl border-2 mt-4 ${
                          answers[selectedSegmentIndex] === currentSegment.correct_answer 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {answers[selectedSegmentIndex] === currentSegment.correct_answer ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-stone-500" />
                          )}
                          <span className={`font-semibold ${
                            answers[selectedSegmentIndex] === currentSegment.correct_answer ? "text-emerald-700" : "text-stone-700"
                          }`}>
                            {answers[selectedSegmentIndex] === currentSegment.correct_answer ? "Correct!" : "Not quite"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{currentSegment.explanation}</p>
                        
                        {!isFinished && (
                          <Button 
                            onClick={handleNext} 
                            className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md"
                          >
                            Next Error <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          ) : (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50 shadow-none rounded-3xl flex-1 flex items-center justify-center text-center p-8">
              <div>
                <Check className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Select a highlighted section in the passage to revise it.</p>
              </div>
            </Card>
          )}

          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Button 
                onClick={() => onComplete(results)} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
              >
                Complete Passage &amp; View Results <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
