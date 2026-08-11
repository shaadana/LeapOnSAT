import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Send, Loader2, CheckCircle, ChevronRight, RotateCcw, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_QUESTIONS = [
  {
    id: "rev-1",
    question_text: "When writing The Other Black Girl (2021), novelist Zakiya Dalila Harris drew on her own experiences working at a publishing office. The award-winning book is Harris's first novel, but her writing _______ honored before. At the age of twelve, she entered a contest to have a story published in American Girl magazine—and won.\n\nWhich choice completes the text so that it conforms to the conventions of Standard English?",
    options: [{ label: "A", text: "were" }, { label: "B", text: "have been" }, { label: "C", text: "has been" }, { label: "D", text: "are" }],
    correct_answer: "C",
    explanation: "The subject 'her writing' is singular, so we need a singular verb form. 'Has been' (present perfect, singular) is correct. 'Have been' and 'were' are plural.",
    domain: "verb_tense",
    difficulty: "easy"
  },
  {
    id: "rev-2",
    question_text: "Kelp forests grow underwater along the eastern Pacific Coast. These underwater forests are important to fish and other marine animals. Ocean currents can be powerful and rough, making it difficult for animals to find safe places to hide from predators. The underwater forests slow down the currents. This creates a more _______ environment with calmer waters where animals can take shelter.\n\nWhich choice completes the text with the most logical and precise word or phrase?",
    options: [{ label: "A", text: "tranquil" }, { label: "B", text: "dangerous" }, { label: "C", text: "imaginative" }, { label: "D", text: "surprising" }],
    correct_answer: "A",
    explanation: "'Tranquil' means calm and peaceful, which matches 'calmer waters where animals can take shelter.' The passage is describing a safer, quieter environment.",
    domain: "vocabulary",
    difficulty: "easy"
  },
  {
    id: "rev-3",
    question_text: "During the English neoclassical period (1660–1789), many writers imitated the epic poetry and satires of ancient Greece and Rome. They were not the first in England to adopt the literary modes of classical _______ some of the most prominent figures of the earlier Renaissance period were also influenced by ancient Greek and Roman literature.\n\nWhich choice completes the text so that it conforms to the conventions of Standard English?",
    options: [{ label: "A", text: "antiquity, however" }, { label: "B", text: "antiquity, however," }, { label: "C", text: "antiquity, however;" }, { label: "D", text: "antiquity; however," }],
    correct_answer: "D",
    explanation: "Two independent clauses connected by the conjunctive adverb 'however' require a semicolon before 'however' and a comma after it: 'antiquity; however,'",
    domain: "semicolons_periods",
    difficulty: "medium"
  }
];

export default function ReverseModeSession({ questions, onBack }) {
  const questionsToUse = (questions && questions.length > 0) ? questions : SAMPLE_QUESTIONS;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stage, setStage] = useState("explain"); // "explain" | "chat" | "done"
  const [userExplanation, setUserExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { score, comment }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [scores, setScores] = useState([]);
  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  const q = questionsToUse[currentIdx];
  const correctOption = q?.options?.find(o => o.label === q.correct_answer);

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const submitExplanation = async () => {
    if (!userExplanation.trim()) return;
    setSubmitting(true);
    try {
      const prompt = `You are an expert SAT tutor grading a student's explanation of why a particular answer is correct.

Question: "${q.question_text}"

The correct answer is (${q.correct_answer}) "${correctOption?.text}"

The official explanation is: "${q.explanation}"

The student's explanation: "${userExplanation}"

Evaluate the student's explanation on a scale of 1-5:
- 5: Perfect. Student clearly understands the rule and explains it accurately.
- 4: Good. Mostly correct with minor gaps.
- 3: Partial. Gets the gist but misses key reasoning.
- 2: Weak. Shows some attempt but fundamental misunderstanding.
- 1: Incorrect. Does not understand why the answer is correct.

Respond in this JSON format exactly:
{
  "score": <1-5>,
  "comment": "<2-3 sentences of warm, specific feedback explaining what the student got right and what they could improve. Be encouraging but precise.>"
}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            comment: { type: "string" }
          }
        }
      });

      setFeedback(res);
      setScores(prev => [...prev, res.score]);
      // Initialize chat with AI's feedback as first message
      setChatMessages([
        {
          role: "assistant",
          content: `**Score: ${res.score}/5**\n\n${res.comment}\n\nFeel free to ask me questions, push back on my feedback, or ask me to explain the rule further!`
        }
      ]);
      setStage("chat");
    } catch {
      setFeedback({ score: 3, comment: "Unable to grade right now. Let's move to discussion!" });
      setStage("chat");
    }
    setSubmitting(false);
  };

  const sendChatMessage = async (overrideText) => {
    const text = (overrideText || chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const userMsg = { role: "user", content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const history = newMessages.map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`).join("\n\n");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert, encouraging SAT tutor helping a student understand an SAT question.

Context:
- Question: "${q.question_text}"
- Correct answer: (${q.correct_answer}) "${correctOption?.text}"
- Official explanation: "${q.explanation}"
- Student's original explanation: "${userExplanation}"
- AI feedback score: ${feedback?.score}/5

The student is now debating or asking follow-up questions. Be warm, engaging, and pedagogically effective. If the student pushes back with a valid point, acknowledge it. If they are wrong, gently correct them with clear reasoning. Keep responses to 3-5 sentences unless more detail is truly needed.

Conversation so far:
${history}

Tutor response:`
      });
      setChatMessages(prev => [...prev, { role: "assistant", content: res }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again!" }]);
    }
    setChatLoading(false);
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questionsToUse.length) {
      setStage("done");
    } else {
      setCurrentIdx(prev => prev + 1);
      setStage("explain");
      setUserExplanation("");
      setFeedback(null);
      setChatMessages([]);
      setChatInput("");
    }
  };

  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  if (stage === "done") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-emerald-500 rounded-3xl p-8 text-white text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Reverse Mode Complete!</h2>
          <p className="text-white/80 mb-4">You explained {questionsToUse.length} questions</p>
          <div className="bg-white/20 rounded-2xl p-4 inline-block">
            <p className="text-3xl font-bold">{avgScore}<span className="text-lg">/5</span></p>
            <p className="text-white/80 text-sm">Average explanation score</p>
          </div>
        </div>
        <div className="space-y-3 mb-6">
          {scores.map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${s >= 4 ? 'bg-emerald-500' : s >= 3 ? 'bg-amber-400' : 'bg-stone-400'}`}>
                {s}/5
              </div>
              <p className="text-sm text-gray-700 flex-1">Question {i + 1}</p>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <div key={star} className={`w-3 h-3 rounded-full ${star <= s ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={onBack} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          Back to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">Q {currentIdx + 1} of {questionsToUse.length}</span>
        <div className="flex gap-1">
          {questionsToUse.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < currentIdx ? 'bg-emerald-500' : i === currentIdx ? 'bg-emerald-300' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Mode badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-100 border border-emerald-300 rounded-full px-3 py-1 flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">Reverse Mode</span>
        </div>
        <span className="text-xs text-gray-400">The correct answer is shown — explain WHY it's correct</span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-100 p-6 mb-4">
        <p className="text-sm font-semibold text-emerald-600 mb-3 uppercase tracking-wide">
          {q.domain?.replace(/_/g, ' ')} · {q.difficulty}
        </p>
        <p className="text-gray-800 leading-relaxed mb-5 whitespace-pre-wrap text-sm">{q.question_text}</p>

        {/* Options — correct one highlighted */}
        <div className="space-y-2 mb-5">
          {q.options?.map(opt => (
            <div
              key={opt.label}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all ${
                opt.label === q.correct_answer
                  ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                  : 'bg-gray-50 border-transparent opacity-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                opt.label === q.correct_answer ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {opt.label}
              </div>
              <p className={`text-sm leading-relaxed ${opt.label === q.correct_answer ? 'text-emerald-800 font-semibold' : 'text-gray-500'}`}>
                {opt.text}
                {opt.label === q.correct_answer && (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" /> Correct Answer
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Challenge prompt */}
        <div className="bg-emerald-600 rounded-2xl p-4 text-white">
          <p className="text-sm font-bold mb-1">Your Challenge:</p>
          <p className="text-sm text-white/90">Explain in your own words why <strong>({q.correct_answer})</strong> is the correct answer. What rule or concept does this question test?</p>
        </div>
      </div>

      {/* Explain Stage */}
      {stage === "explain" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-3xl shadow border-2 border-gray-100 p-5">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Explanation</label>
            <textarea
              ref={textareaRef}
              value={userExplanation}
              onChange={e => setUserExplanation(e.target.value)}
              placeholder="Example: 'The subject is singular so...' or 'This question tests whether you know that...'"
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm resize-none focus:outline-none focus:border-emerald-400 min-h-[120px] bg-gray-50"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">{userExplanation.length} characters</p>
              <Button
                onClick={submitExplanation}
                disabled={!userExplanation.trim() || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {submitting ? "Grading..." : "Submit for AI Feedback"}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Stage */}
      {stage === "chat" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-3xl shadow border-2 border-gray-100 overflow-hidden">
            {/* Score banner */}
            {feedback && (
              <div className={`p-4 border-b ${feedback.score >= 4 ? 'bg-emerald-50 border-emerald-100' : feedback.score >= 3 ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${feedback.score >= 4 ? 'bg-emerald-500' : feedback.score >= 3 ? 'bg-amber-400' : 'bg-stone-400'}`}>
                    {feedback.score}/5
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">AI Feedback on Your Explanation</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Keep chatting to debate or ask follow-up questions</p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-white border border-emerald-100 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">AI Tutor</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-emerald-100 rounded-2xl px-3 py-2 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {chatMessages.filter(m => m.role === "user").length === 0 && !chatLoading && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap bg-stone-50 border-t border-stone-100 pt-2">
                {[
                  "Predict Next Step: break down a solution step-by-step",
                  "Find the Mistake: give me a flawed solution to fix"
                ].map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setChatInput(opt); sendChatMessage(opt); }}
                    className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 hover:bg-emerald-50 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Chat input */}
            <div className="p-3 border-t bg-white flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder="Debate, ask questions, or request a clearer explanation..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-gray-50"
                disabled={chatLoading}
              />
              <Button
                onClick={() => sendChatMessage()}
                disabled={!chatInput.trim() || chatLoading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Next Question */}
          <Button
            onClick={nextQuestion}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2"
          >
            {currentIdx + 1 >= questionsToUse.length ? "Finish Session" : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
