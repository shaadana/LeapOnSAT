import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock, CheckCircle, XCircle, Send, Loader2, Bot, User, Lightbulb, AlertTriangle
} from 'lucide-react';
import MathText from '@/components/sat/MathText';
import ExplanationText from '@/components/sat/ExplanationText';
import CalculatorPanel from '@/components/sat/CalculatorPanel';
import BookmarkButton from '@/components/review/BookmarkButton';
import ReactMarkdown from 'react-markdown';
import ReportQuestionModal from '@/components/teacher/ReportQuestionModal';
import { sanitizeMathInput } from '@/utils/mathUtils';

const PHASES = { SOLVE: 'solve', EXPLAIN: 'explain', TUTOR: 'tutor', GRADED: 'graded' };

export default function ChallengeQuestion({
  question, questionIndex, totalQuestions, onComplete
}) {
  const [phase, setPhase] = useState(PHASES.SOLVE);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [userExplanation, setUserExplanation] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages, tutorLoading]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const correctAnswers = (question.correct_answer || '').split(',').map(a => a.trim().toUpperCase());
  const isCorrect = correctAnswers.includes(selectedAnswer.toUpperCase());

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;
    setPhase(PHASES.EXPLAIN);
  };

  const handleSubmitExplanation = async () => {
    if (userExplanation.trim().length < 10) return;
    setGrading(true);
    setPhase(PHASES.TUTOR);

    const gradePrompt = `You are an expert SAT Math tutor grading a student's explanation of their answer.

Question: ${question.question_text}
Correct answer: ${question.correct_answer}
Student's answer: ${selectedAnswer}
Answer correct: ${isCorrect}
Student's explanation of their reasoning:
"${userExplanation}"

Grade the EXPLANATION QUALITY on a 0-100 scale. Consider:
- Correctness of mathematical reasoning (even if they got the wrong answer, did they identify the right approach?)
- Clarity and completeness of the explanation
- Use of proper mathematical terminology
- Step-by-step logical progression
- Identification of the key concept being tested

Also provide brief, encouraging feedback (2-3 sentences) on how to improve their explanations.

${isCorrect
  ? "The student got the right answer. Focus feedback on whether their reasoning shows deep understanding vs. lucky guessing."
  : "The student got the wrong answer. Be compassionate — highlight what they DID understand and pinpoint the gap."}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: gradePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number", description: "0-100 explanation quality score" },
          feedback: { type: "string", description: "2-3 sentence feedback" },
          strengths: { type: "string", description: "What the student did well" },
          gap: { type: "string", description: "Key area to improve" }
        },
        required: ["score", "feedback"]
      }
    });

    setGradeResult(res);
    setGrading(false);

    // Auto-start tutor conversation
    const tutorPrompt = isCorrect
      ? `The student answered correctly (${selectedAnswer}) and explained: "${userExplanation}". Their explanation scored ${res.score}/100. ${res.feedback} Now help deepen their understanding. Ask a transfer question or explore an edge case.`
      : `The student answered ${selectedAnswer} (correct: ${question.correct_answer}) and explained: "${userExplanation}". Their explanation scored ${res.score}/100. ${res.feedback} Help them understand their mistake compassionately. Start with what they got right, then guide them to the correct reasoning.`;

    await sendTutorMessage(null, tutorPrompt);
  };

  const sendTutorMessage = async (userMsg, systemOverride) => {
    if (userMsg) {
      setTutorMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    }
    setTutorLoading(true);
    setTutorInput('');

    const context = `You are a warm, expert SAT Math tutor. Use LaTeX for math ($...$ inline, $$...$$ block).
Question: ${question.question_text}
Correct answer: ${question.correct_answer}
Student's answer: ${selectedAnswer}
Student's explanation: "${userExplanation}"
Domain: ${question.domain}
Explanation: ${question.explanation}`;

    const history = tutorMessages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
    const prompt = systemOverride
      ? `${context}\n\n${systemOverride}`
      : `${context}\n\nConversation:\n${history}\n\nStudent: ${userMsg}\n\nTutor:`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    const reply = typeof res === 'string' ? res : res?.text || res?.content || JSON.stringify(res);
    setTutorMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setTutorLoading(false);
  };

  const handleFinishQuestion = () => {
    setIsTimerRunning(false);
    onComplete({
      question_id: question.id,
      question_text: question.question_text,
      domain: question.domain,
      difficulty: question.difficulty,
      options: question.options,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      user_answer: selectedAnswer,
      answer_correct: isCorrect,
      user_explanation: userExplanation,
      explanation_score: gradeResult?.score || 0,
      explanation_feedback: gradeResult?.feedback || '',
      time_spent_seconds: timer,
      tutor_messages: tutorMessages,
    });
  };

  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <Badge className="bg-teal-100 text-teal-800 border border-teal-300">
          Challenge · Q{questionIndex + 1}/{totalQuestions}
        </Badge>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <CalculatorPanel />
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(timer)}</span>
          </div>
        </div>
      </div>

      <Progress value={progress} className="h-2 mb-6 bg-gray-100" />

      {/* Question Card */}
      <Card className="bg-white/70 backdrop-blur-xl border-2 border-teal-200 shadow-lg mb-4">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {(question.domain || '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            <Badge variant="outline" className="text-xs border-teal-300 text-teal-700">
              {question.difficulty}
            </Badge>
            <div className="ml-auto flex items-center gap-1">
              <BookmarkButton questionData={{ ...question, subject: 'math' }} />
            </div>
          </div>
          <p className="text-lg text-gray-800 mb-6 leading-relaxed">
            <MathText>{question.question_text}</MathText>
          </p>

          {/* Answer options — only during SOLVE phase */}
          {Array.isArray(question.options) && question.options.length > 0 && (
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option.label;
                const showResult = phase !== PHASES.SOLVE;
                const isCorrectOpt = correctAnswers.includes(option.label);

                let cls = 'border-gray-200';
                if (showResult) {
                  if (isCorrectOpt) cls = 'border-emerald-500 bg-emerald-50';
                  else if (isSelected && !isCorrectOpt) cls = 'border-red-500 bg-red-50';
                } else if (isSelected) {
                  cls = 'border-teal-400 bg-teal-50/60';
                }

                return (
                  <div
                    key={option.label}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${phase === PHASES.SOLVE ? 'cursor-pointer hover:border-teal-300' : ''} ${cls}`}
                    onClick={() => phase === PHASES.SOLVE && setSelectedAnswer(option.label)}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      showResult && isCorrectOpt ? 'bg-emerald-500 border-emerald-500 text-white' :
                      showResult && isSelected && !isCorrectOpt ? 'bg-red-500 border-red-500 text-white' :
                      isSelected ? 'bg-teal-500 border-teal-500 text-white' :
                      'border-gray-300 text-gray-500'
                    }`}>
                      {option.label}
                    </div>
                    <span className="text-gray-700 flex-1 text-sm"><MathText>{option.text}</MathText></span>
                    {showResult && isCorrectOpt && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {showResult && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Free response */}
          {(!question.options || question.options.length === 0) && phase === PHASES.SOLVE && (
            <input
              type="text"
              value={selectedAnswer}
              onChange={e => setSelectedAnswer(sanitizeMathInput(e.target.value))}
              placeholder="Enter your answer..."
              className="w-full text-lg p-4 border-2 border-gray-200 rounded-xl focus:border-teal-400 outline-none"
            />
          )}
        </CardContent>
      </Card>

      {/* Phase: SOLVE — submit answer */}
      {phase === PHASES.SOLVE && (
        <div className="flex justify-between items-center mt-4">
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
          <Button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            Lock In Answer
          </Button>
        </div>
      )}

      {/* Phase: EXPLAIN — write explanation */}
      {phase === PHASES.EXPLAIN && (
        <Card className="border-2 border-amber-200 bg-amber-50 mb-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900 text-sm">Explain Your Reasoning</h3>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Walk through your thought process step by step. How did you arrive at your answer? What concept did you use? Why did you eliminate other options?
            </p>
            <textarea
              className="w-full rounded-xl border-2 border-amber-200 bg-white p-4 text-sm focus:outline-none focus:border-amber-400 resize-none"
              rows={5}
              placeholder="I started by identifying... then I applied... I chose this answer because..."
              value={userExplanation}
              onChange={e => setUserExplanation(e.target.value)}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-amber-600">
                {userExplanation.trim().length < 10 ? 'Write at least a few sentences' : '✓ Ready to submit'}
              </span>
              <Button
                onClick={handleSubmitExplanation}
                disabled={userExplanation.trim().length < 10}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {grading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Explanation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase: TUTOR — grade result + AI tutor chat */}
      {(phase === PHASES.TUTOR || phase === PHASES.GRADED) && (
        <>
          {/* Grade card */}
          {gradeResult && (
            <Card className={`border-2 mb-4 ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    <span className="font-bold text-sm">{isCorrect ? 'Correct Answer!' : `Incorrect — Answer: ${question.correct_answer}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">Explanation Score</span>
                    <Badge className={`text-sm font-bold ${
                      gradeResult.score >= 80 ? 'bg-emerald-500 text-white' :
                      gradeResult.score >= 60 ? 'bg-amber-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {gradeResult.score}/100
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-stone-700 mb-2">{gradeResult.feedback}</p>
                {gradeResult.strengths && (
                  <p className="text-xs text-emerald-700"><span className="font-bold">Strengths:</span> {gradeResult.strengths}</p>
                )}
                {gradeResult.gap && (
                  <p className="text-xs text-amber-700 mt-1"><span className="font-bold">To improve:</span> {gradeResult.gap}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Solution */}
          {question.explanation && (
            <Card className="border-2 border-blue-100 bg-blue-50/50 mb-4">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Full Solution</h4>
                <ExplanationText isCorrect={isCorrect}>{question.explanation}</ExplanationText>
              </CardContent>
            </Card>
          )}

          {/* Tutor chat */}
          <Card className="border-2 border-blue-200 overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">AI Tutor</span>
              </div>
            </div>
            <div className="h-52 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {tutorMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                        components={{
                          p: ({ children }) => <p className="my-1 leading-relaxed">{React.Children.map(children, c => typeof c === 'string' ? <MathText>{c}</MathText> : c)}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-blue-700">{children}</strong>,
                        }}
                      >{msg.content}</ReactMarkdown>
                    ) : <p>{msg.content}</p>}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              {tutorLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-white" /></div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3"><Loader2 className="w-4 h-4 text-blue-500 animate-spin" /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {tutorMessages.filter(m => m.role === 'user').length === 0 && !tutorLoading && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap bg-slate-50 border-t border-slate-100 pt-2">
                {[
                  "Predict Next Step: break down a solution step-by-step",
                  "Find the Mistake: give me a flawed solution to fix"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setTutorInput(q); sendTutorMessage(q); }}
                    className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1 hover:bg-blue-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
              <input
                type="text"
                value={tutorInput}
                onChange={e => setTutorInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && tutorInput.trim() && !tutorLoading && sendTutorMessage(tutorInput.trim())}
                placeholder="Ask the tutor..."
                className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 outline-none focus:border-blue-400"
                disabled={tutorLoading}
              />
              <button
                onClick={() => tutorInput.trim() && sendTutorMessage(tutorInput.trim())}
                disabled={!tutorInput.trim() || tutorLoading}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </Card>

          {/* Next question button */}
          <div className="flex justify-end">
            <Button onClick={handleFinishQuestion} className="bg-teal-500 hover:bg-teal-600 text-white">
              {questionIndex < totalQuestions - 1 ? 'Next Challenge Question →' : 'Finish Challenge Session'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
