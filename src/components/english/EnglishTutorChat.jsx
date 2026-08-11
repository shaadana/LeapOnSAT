import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Loader2, MessageCircle, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * EnglishTutorChat — reusable conversational AI English tutor.
 *
 * Props:
 *   context: {
 *     questionText: string,      // the question that was answered
 *     correctAnswer: string,     // e.g. "B"
 *     correctAnswerText: string, // the text of the correct option
 *     studentAnswer: string,     // student's chosen label
 *     studentAnswerText: string, // the text of what the student chose
 *     explanation: string,       // the built-in explanation
 *     ruleReference?: string,    // optional grammar rule
 *     skill?: string,            // e.g. "Transitions"
 *     isCorrect: boolean,
 *     passageExcerpt?: string,   // optional passage text for context
 *   }
 */
export default function EnglishTutorChat({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const buildSystemContext = () => {
    const { questionText, correctAnswer, correctAnswerText, studentAnswer, studentAnswerText, explanation, ruleReference, skill, isCorrect, passageExcerpt } = context;
    return `You are a warm, encouraging, expert SAT English tutor who believes every student can learn. A student just ${isCorrect ? "correctly answered" : "incorrectly answered"} a question.

${passageExcerpt ? `Passage excerpt: "${passageExcerpt.slice(0, 600)}"\n` : ""}
Skill being tested: ${skill || "SAT English"}
Question: ${questionText}
Correct answer: (${correctAnswer}) ${correctAnswerText}
Student's answer: (${studentAnswer}) ${studentAnswerText}
Built-in explanation: ${explanation}
${ruleReference ? `Rule reference: ${ruleReference}` : ""}

PEDAGOGICAL FRAMEWORK — Follow these steps naturally in conversation (don't label them). Adapt depth to the student's level:

1. SKILL TARGET: Name the specific SAT English skill being tested. Help the student understand what the SAT is measuring.

2. CONCEPT EXPLANATION: Explain *why* the rule or pattern works, not just *what* it is. Build understanding ("Semicolons work here because both sides are complete thoughts — that's the test: could each side stand alone as a sentence?").

3. WORKED EXAMPLE: Model your thinking process ("When I read this sentence, I first notice… then I check… which tells me…"). Show reasoning, not just the answer.

4. GUIDED PRACTICE: Ask a guiding question rather than giving the full answer. ("Before I explain further — looking at the sentence, what clue tells you whether this needs a comma or a semicolon?"). Let the student think.

5. MISTAKE MINING: When the student erred, treat the mistake as valuable. Explain the specific misconception ("Your choice suggests you might have been thinking about [X], which makes sense — but the key distinction here is [Y]"). Reframe mistakes as the brain building new connections.

6. TRANSFER CHECK: Ask the student to explain the pattern back ("In your own words, when would you use a colon vs. a semicolon?"). This retrieval practice strengthens memory.

7. NEXT-STEP PLAN: Suggest what to practice next based on the gap ("Since transitions tripped you up, I'd suggest doing a few more transition-focused questions").

FUSE TEACHING PRACTICES (weave in subtly):
- Culture of learning: Normalize struggle ("This rule catches almost everyone at first — you're in good company").
- Prediction: Ask students to predict before revealing ("Before I explain — which word in the sentence gives you the biggest clue?").
- Memory encoding: Use memorable anchors ("Think of commas as gentle pauses and semicolons as stop signs between two complete ideas").
- Reframe mistakes: Always frame errors as informative, never failure.
- Engaged retrieval: Prompt recall of related rules before explaining new ones.

TONE: Warm, patient, mentor-like. Concise: 2–5 sentences unless the student asks for more. Never condescending. Be accurate — don't let wrong answers slide, but always explain with care.
If they ask about something unrelated, gently redirect to the English concept at hand.`;
  };

  const openAndInit = async () => {
    setOpen(true);
    if (initialized) return;
    setInitialized(true);
    setLoading(true);

    const { isCorrect, skill, explanation, studentAnswer, correctAnswer, correctAnswerText } = context;
    const greeting = isCorrect
      ? `Nice work on this ${skill || "question"}! 🎯 You showed strong understanding of ${skill ? `how **${skill}** works` : "this concept"}. A quick challenge — can you explain in your own words *why* (${correctAnswer}) is correct here? That kind of self-explanation is what makes knowledge stick for the real SAT. Or ask me anything — why other choices were wrong, how this rule shows up in other contexts, etc.`
      : `This is actually a really useful mistake — let's turn it into a win. The SAT is testing your **${skill || "English"}** skills here. Before I walk you through it, here's a hint: look at the relationship between the ideas in the sentence. What do you notice about how they connect? \n\nIf you'd rather I just explain it, say "show me" and I'll walk through my full thinking step by step.`;

    setMessages([{ role: "assistant", content: greeting }]);
    setLoading(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemContext = buildSystemContext();
      const conversationHistory = newMessages
        .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
        .join("\n\n");

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemContext}\n\n---\nConversation so far:\n${conversationHistory}\n\nTutor (respond to the student's last message):`,
      });

      setMessages(prev => [...prev, { role: "assistant", content: res }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again!" }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      {!open && (
        <button
          onClick={openAndInit}
          className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-all"
        >
          <MessageCircle className="w-4 h-4 flex-shrink-0" />
          <span>Ask AI English Tutor</span>
          <ChevronDown className="w-3.5 h-3.5 ml-auto" />
        </button>
      )}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="border-2 border-emerald-200 rounded-2xl bg-white shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-sm">AI English Tutor</span>
                <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">Ask anything</span>
              </div>
              <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-lg p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-56 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-white border border-emerald-100 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">Tutor</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-emerald-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggested questions (shown only before first user message) */}
            {messages.filter(m => m.role === "user").length === 0 && !loading && (
              <div className="px-4 pb-2 flex gap-2 flex-wrap bg-gray-50 border-t border-gray-100 pt-2">
                {[
                  "Why are the other choices wrong?",
                  "Explain this rule more",
                  "How will this appear on the SAT?",
                  "Predict Next Step: break down a solution step-by-step",
                  "Find the Mistake: give me a flawed solution to fix"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 hover:bg-emerald-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-gray-100 bg-white">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask a follow-up question..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-gray-50"
                disabled={loading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
