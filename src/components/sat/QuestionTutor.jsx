import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2, Bot, User, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import GraphingCalculator from './GraphingCalculator';
import MathText from './MathText';

const DESMOS_DOMAINS = ['algebra', 'advanced_algebra', 'quadratics', 'systems_of_equations', 'polynomials', 'exponentials', 'trigonometry', 'geometry', 'circles'];

export default function QuestionTutor({ question, userAnswer, isCorrect, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const bottomRef = useRef(null);

  const questionText = question.question_text || question.question || '';
  const correctAnswer = question.correct_answer || question.correct || '';
  const explanation = question.explanation || '';
  const domain = question.domain || '';
  const canGraph = DESMOS_DOMAINS.includes(domain);

  // Auto-send initial message based on whether correct or wrong
  useEffect(() => {
    const initialPrompt = isCorrect
      ? `The student just answered this SAT Math question correctly.

Respond following these steps naturally (don't label them):
1. Celebrate genuinely — name the specific skill they demonstrated.
2. Briefly explain WHY the approach works (the underlying reasoning, not just the procedure).
3. Ask a quick transfer question to deepen their understanding — e.g. "What would change if the equation was [variation]?" or "Can you explain in your own words when you'd use this technique?"
4. Offer to go deeper${canGraph ? ' or visualize it with a graph' : ''}.

Question: ${questionText}
Correct answer: ${correctAnswer}
Explanation: ${explanation}`
      : `The student answered this SAT Math question incorrectly. They chose "${userAnswer}" but the correct answer is "${correctAnswer}".

Respond following these steps naturally (don't label them):
1. Normalize the mistake warmly — frame it as valuable learning ("This is actually a really useful mistake because...").
2. Name the specific SAT skill being tested.
3. Mine the mistake: explain what misconception likely led to choosing "${userAnswer}" — be specific and compassionate.
4. Before giving the full solution, ask one guiding question or give a hint to let the student try to reason toward the answer. ("Here's a hint — what happens if you...?")
5. If the student doesn't engage with the hint in follow-up, walk through the full solution step-by-step, narrating your thinking process.
6. End with a brief suggestion of what to practice next based on the gap this mistake revealed.
${canGraph ? '7. If a graph would help visualize, suggest one using GRAPH: expression' : ''}

Question: ${questionText}
Explanation: ${explanation}`;

    sendMessage(null, initialPrompt);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-load all suggestions when graph panel is opened
  useEffect(() => {
    if (showGraph && graphSuggestions.length > 0 && loadedExpressions.length === 0) {
      setLoadedExpressions(graphSuggestions);
    }
  }, [showGraph]);

  const sendMessage = async (userMsg, systemOverride) => {
    const isInitial = !userMsg;
    if (!isInitial) {
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    }
    setLoading(true);
    setInput('');

    const contextBlock = `You are a warm, encouraging, expert SAT Math tutor who believes every student can learn. Use LaTeX for ALL math — inline math with $...$ and display/block equations with $$...$$ on their own line. Never write raw math as plain text.

PEDAGOGICAL FRAMEWORK — Follow these steps naturally in conversation (don't label them explicitly). Adapt depth based on how the student is doing:

1. SKILL TARGET: Name the specific SAT skill being tested (e.g. "This is testing your ability to solve systems of equations by substitution"). Help the student see what the SAT is really measuring.

2. CONCEPT EXPLANATION: Explain *why* the method works, not just *how*. Connect to underlying math reasoning ("The reason we set these equal is because..."). Build real understanding, not just procedure.

3. WORKED EXAMPLE: Model your thinking step-by-step, narrating your inner thought process ("First I notice… so I think about… which tells me…"). Use numbered steps. Show the reasoning, not just the mechanics.

4. GUIDED PRACTICE: Instead of just telling the answer, ask the student a guiding question to get them to think. ("Before I show you the next step, what do you think happens if we substitute $x = 3$ here?"). Give hints rather than full solutions when possible. Let them struggle productively.

5. MISTAKE MINING: When the student makes an error, treat it as valuable learning data. Say things like: "This is actually a really common and useful mistake — here's what your brain was probably doing…" Explain the specific misconception behind their wrong answer. Reframe mistakes as a sign the brain is building new connections.

6. TRANSFER CHECK: Occasionally ask the student to explain the pattern back to you in their own words. ("Can you tell me in your own words — when would you use this approach vs. the other one?"). This is retrieval practice — it strengthens long-term memory.

7. NEXT-STEP PLAN: After resolving the question, suggest what to practice next based on the gap revealed. ("Since this tripped you up, I'd recommend practicing a few more [domain] problems focused on [specific skill].").

FUSE TEACHING PRACTICES (use subtly — weave in naturally):
- Culture of learning: Use language that normalizes struggle ("This is one of those concepts that clicks after you see it a few times — totally normal").
- Prediction: Ask students to predict answers or next steps before revealing them ("What do you think will happen when we…?").
- Memory encoding: Tie concepts to memorable analogies or patterns ("Think of distributing like delivering mail to every house on the street").
- Reframe mistakes: Always frame errors as informative, never as failure ("Your answer actually shows you understood [X part] — the gap is just in [Y part]").
- Engaged retrieval: Prompt the student to recall related concepts before explaining ("Do you remember what we do when we see a squared term?").

TONE: Warm, patient, mentor-like. Speak as someone who genuinely believes in the student. Never condescending. Keep responses focused — 2–6 sentences unless the student asks for more detail. Be concise but thorough.

IMPORTANT — Desmos Graphing: When a graph would help understanding, output one or more lines formatted EXACTLY as:
GRAPH: <valid Desmos LaTeX expression>

Rules for GRAPH expressions:
- Use valid Desmos LaTeX only (e.g. y=x^2+3x-4, y=2x+1, x^2+y^2=25, y=\\sin(x))
- Do NOT wrap in $...$ or $$...$$
- Each expression on its own GRAPH: line
- These will be loaded directly into the live Desmos API — they must be syntactically correct

Question context:
- Question: ${questionText}
- Correct answer: ${correctAnswer}
- Domain: ${domain}
- Explanation: ${explanation}
- Student's answer: ${userAnswer}
- Was correct: ${isCorrect}`;

    const history = messages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
    const prompt = systemOverride
      ? `${contextBlock}\n\n${systemOverride}`
      : `${contextBlock}\n\nConversation so far:\n${history}\n\nStudent: ${userMsg}\n\nTutor:`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt });
    const reply = typeof res === 'string' ? res : res?.text || res?.content || JSON.stringify(res);

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const handleSend = (textOverride) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;
    sendMessage(textToSend.trim());
  };

  // Extract GRAPH: ... suggestions from assistant messages (valid Desmos LaTeX)
  const graphSuggestions = messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => [...(m.content.matchAll(/GRAPH:\s*([^\n]+)/g))].map(match => match[1].trim()));

  // Track which expressions are currently loaded into Desmos
  const [loadedExpressions, setLoadedExpressions] = useState([]);

  return (
    <div className="mt-4 border-2 border-blue-200 rounded-2xl overflow-hidden bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">AI Math Tutor</span>
          {!isCorrect && <span className="text-xs bg-red-400/80 text-white px-2 py-0.5 rounded-full">Let's fix this!</span>}
          {isCorrect && <span className="text-xs bg-emerald-400/80 text-white px-2 py-0.5 rounded-full">Great work!</span>}
        </div>
        <div className="flex items-center gap-2">
          {canGraph && (
            <button
              onClick={() => setShowGraph(g => !g)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${showGraph ? 'bg-white text-blue-700 border-white' : 'text-white border-white/40 hover:bg-white/10'}`}
            >
              <TrendingUp className="w-3 h-3" />
              Graph
            </button>
          )}
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph panel */}
      {showGraph && canGraph && (
        <div className="border-b border-blue-100 bg-slate-50">
          {graphSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 items-center">
              <span className="text-xs text-slate-500 font-medium">AI Suggested:</span>
              {graphSuggestions.map((expr, i) => {
                const isLoaded = loadedExpressions.includes(expr);
                return (
                  <button
                    key={i}
                    onClick={() => setLoadedExpressions([expr])}
                    title="Load into Desmos"
                    className={`text-xs font-mono px-2 py-1 rounded border transition-all ${
                      isLoaded
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {expr}
                  </button>
                );
              })}
              {graphSuggestions.length > 1 && (
                <button
                  onClick={() => setLoadedExpressions(graphSuggestions)}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-all"
                >
                  Load All
                </button>
              )}
            </div>
          )}
          <div className="p-3 pt-1">
            <GraphingCalculator onClose={() => setShowGraph(false)} expressionsToLoad={loadedExpressions} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-800'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => (
                      <p className="my-1 leading-relaxed">
                        {React.Children.map(children, child =>
                          typeof child === 'string' ? <MathText>{child}</MathText> : child
                        )}
                      </p>
                    ),
                    li: ({ children }) => (
                      <li className="my-0.5">
                        {React.Children.map(children, child =>
                          typeof child === 'string' ? <MathText>{child}</MathText> : child
                        )}
                      </li>
                    ),
                    code: ({ inline, children }) => inline
                      ? <code className="bg-slate-100 px-1 rounded text-xs font-mono">{children}</code>
                      : <pre className="bg-slate-100 rounded p-2 text-xs font-mono overflow-x-auto">{children}</pre>,
                    strong: ({ children }) => <strong className="font-semibold text-blue-700">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions (shown only before first user message) */}
      {messages.filter(m => m.role === 'user').length === 0 && !loading && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap bg-slate-50 border-t border-slate-100 pt-2">
          {[
            "Why are the other choices wrong?",
            "Explain this rule more",
            "How will this appear on the SAT?",
            "Predict Next Step: break down a solution step-by-step",
            "Find the Mistake: give me a flawed solution to fix"
          ].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); handleSend(q); }}
              className="text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1 hover:bg-blue-50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-slate-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a follow-up question..."
          className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 outline-none focus:border-blue-400"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center transition-all"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
