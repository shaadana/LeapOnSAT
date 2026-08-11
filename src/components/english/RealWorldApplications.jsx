import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronRight, Sparkles, ArrowLeft, Loader2, BookOpen, Pencil } from "lucide-react";
import EnglishTutorChat from "@/components/english/EnglishTutorChat";
import { motion, AnimatePresence } from "framer-motion";
import { PASSAGES_1 } from "@/data/classicPassages1";
import { PASSAGES_2 } from "@/data/classicPassages2";
import { PASSAGES_3 } from "@/data/classicPassages3";
import { PASSAGES_4 } from "@/data/classicPassages4";
import { PASSAGES_5 } from "@/data/classicPassages5";

const _ALL_PASSAGES = [...PASSAGES_1, ...PASSAGES_2, ...PASSAGES_3, ...PASSAGES_4, ...PASSAGES_5];
const PASSAGES = _ALL_PASSAGES.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

function normalizeGenre(genre) {
  const g = (genre || "").toLowerCase();
  if (g.includes("poem") || g.includes("poet")) return "Poetry";
  if (g.includes("novella")) return "Novella";
  if (g.includes("short story")) return "Short Story";
  if (g.includes("drama")) return "Drama";
  if (g.includes("speech")) return "Speech";
  if (g.includes("legal")) return "Legal Document";
  if (g.includes("science fiction")) return "Science Fiction";
  if (g.includes("novel")) return "Novel";
  if (g.includes("autobiography") || g.includes("memoir")) return "Autobiography / Memoir";
  if (g.includes("essay") || g.includes("political") || g.includes("letter")) return "Essay";
  if (g.includes("science")) return "Essay";
  return genre || "Other";
}

const GENRES = ["All", ...Array.from(new Set(PASSAGES.map(p => normalizeGenre(p.genre)))).sort()];

// ─── (passages moved to data/classicPassages1.js and data/classicPassages2.js) ─

const _UNUSED_LEGACY = [
  {
    id: "austen_pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    year: 1813,
    genre: "Novel",
    excerpt: `It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."`,
    questions: [
      {
        id: "ap1",
        type: "mc",
        skill: "Tone & Purpose",
        question: "The opening sentence of the passage is best described as:",
        options: [
          { label: "A", text: "A sincere declaration of social fact" },
          { label: "B", text: "An ironic observation critiquing social assumptions" },
          { label: "C", text: "A straightforward description of marriage customs" },
          { label: "D", text: "An optimistic statement about romantic opportunity" },
        ],
        correct_answer: "B",
        explanation: "Austen's famous opening line is deeply ironic. The phrase 'truth universally acknowledged' mocks the society that holds this belief — the narrator does not sincerely endorse it. Austen uses irony throughout to critique the mercenary view of marriage in her era.",
      },
      {
        id: "ap2",
        type: "mc",
        skill: "Characterization",
        question: "Based on the dialogue, Mr. Bennet's character can best be described as:",
        options: [
          { label: "A", text: "Eager and enthusiastic" },
          { label: "B", text: "Dry-witted and detached" },
          { label: "C", text: "Ignorant and unaware" },
          { label: "D", text: "Openly hostile to his wife" },
        ],
        correct_answer: "B",
        explanation: "Mr. Bennet's responses are deliberately minimal and ironic — 'You want to tell me, and I have no objection to hearing it.' He is clearly aware of his wife's excitement but refuses to indulge it directly. This shows a dry, detached wit rather than genuine ignorance or hostility.",
      },
      {
        id: "ap3",
        type: "written",
        skill: "Inference",
        prompt: "What does Austen imply about the status of women in this society through the phrase 'considered as the rightful property of some one or other of their daughters'? Use evidence from the passage to support your answer.",
      },
    ],
  },
  {
    id: "dickens_tale",
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    year: 1859,
    genre: "Novel",
    excerpt: `It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way—in short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only.`,
    questions: [
      {
        id: "dt1",
        type: "mc",
        skill: "Structure & Style",
        question: "The primary rhetorical device used throughout this passage is:",
        options: [
          { label: "A", text: "Hyperbole" },
          { label: "B", text: "Anaphora combined with antithesis" },
          { label: "C", text: "Understatement" },
          { label: "D", text: "Extended metaphor" },
        ],
        correct_answer: "B",
        explanation: "Dickens repeats the structure 'it was the ___ of ___' (anaphora) while pairing opposite concepts — best/worst, wisdom/foolishness, Light/Darkness (antithesis). These two devices work together to convey the contradictory nature of the era.",
      },
      {
        id: "dt2",
        type: "mc",
        skill: "Inference",
        question: "The phrase 'so far like the present period' most likely suggests that Dickens:",
        options: [
          { label: "A", text: "Believes the historical period he describes is uniquely chaotic" },
          { label: "B", text: "Implies his contemporary era shares the same contradictory qualities" },
          { label: "C", text: "Is confused about the difference between past and present" },
          { label: "D", text: "Prefers the present period to the one he is describing" },
        ],
        correct_answer: "B",
        explanation: "The aside 'so far like the present period' is Dickens speaking directly to his readers. He signals that the contradictions of the French Revolution era (the setting) are mirrored in his own Victorian era — making the novel a commentary on his own time as much as history.",
      },
      {
        id: "dt3",
        type: "written",
        skill: "Analysis of Effect",
        prompt: "Explain how Dickens' use of contrasting pairs (e.g., 'best of times'/'worst of times') creates a specific emotional effect on the reader. What feeling does this opening evoke, and how does the structure produce it?",
      },
    ],
  },
  {
    id: "douglass_narrative",
    title: "Narrative of the Life of Frederick Douglass",
    author: "Frederick Douglass",
    year: 1845,
    genre: "Autobiography",
    excerpt: `I have no accurate knowledge of my age, never having seen any authentic record containing it. By far the larger part of the slaves know as little of their ages as horses know of theirs, and it is the wish of most masters within my knowledge to keep their slaves thus ignorant. I do not remember to have ever met a slave who could tell of his birthday. They seldom come nearer to it than planting-time, harvest-time, cherry-time, spring-time, or fall-time. A want of information concerning my own was a source of unhappiness to me even during childhood. The white children could tell their ages. I could not tell why I ought to be deprived of the same privilege.`,
    questions: [
      {
        id: "fd1",
        type: "mc",
        skill: "Purpose",
        question: "Douglass's comparison of slaves to horses is primarily intended to:",
        options: [
          { label: "A", text: "Suggest that slaves had animal-like instincts" },
          { label: "B", text: "Illustrate how slavery systematically dehumanized enslaved people" },
          { label: "C", text: "Criticize the agricultural practices of slaveholders" },
          { label: "D", text: "Acknowledge that horses are treated with more care than slaves" },
        ],
        correct_answer: "B",
        explanation: "Douglass deliberately uses the horse comparison to show that enslavers treated human beings as livestock — denying them basic knowledge of their own existence such as their birthday. The comparison is devastating: it shows the degree to which the institution stripped people of their humanity and self-knowledge.",
      },
      {
        id: "fd2",
        type: "mc",
        skill: "Tone",
        question: "The overall tone of this passage can best be described as:",
        options: [
          { label: "A", text: "Bitter and accusatory" },
          { label: "B", text: "Measured and analytical, with underlying indignation" },
          { label: "C", text: "Resigned and hopeless" },
          { label: "D", text: "Nostalgic and reflective" },
        ],
        correct_answer: "B",
        explanation: "Douglass writes with precision and restraint — 'I do not remember,' 'it is the wish of most masters' — which makes the content more powerful, not less. The controlled, analytical voice makes the horror more striking. The final sentence shows the indignation underneath: 'I could not tell why I ought to be deprived of the same privilege.'",
      },
      {
        id: "fd3",
        type: "written",
        skill: "Evidence & Argument",
        prompt: "How does Douglass use specific details — rather than general statements — to build his argument about the nature of slavery? Identify at least two specific details and explain what each one reveals.",
      },
    ],
  },
  {
    id: "thoreau_walden",
    title: "Walden",
    author: "Henry David Thoreau",
    year: 1854,
    genre: "Essay / Memoir",
    excerpt: `I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived. I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary. I wanted to live deep and suck out all the marrow of life, to live so sturdily and Spartan-like as to put to rout all that was not life, and not, when I had travelled a considerable distance, discover that I had not lived.`,
    questions: [
      {
        id: "tw1",
        type: "mc",
        skill: "Main Idea",
        question: "The central argument Thoreau makes in this passage is that:",
        options: [
          { label: "A", text: "Nature is more beautiful than civilization" },
          { label: "B", text: "One must pursue a deliberately examined, essential life to avoid wasting it" },
          { label: "C", text: "Physical endurance is the highest human virtue" },
          { label: "D", text: "Society teaches people to live fully and without reservation" },
        ],
        correct_answer: "B",
        explanation: "Thoreau's core claim is that most people live unconsciously — 'not life' — and that by going to Walden Pond he wanted to confront existence deliberately. The fear of arriving at death without having truly lived drives the passage. This is an argument for intentional, examined living.",
      },
      {
        id: "tw2",
        type: "mc",
        skill: "Diction & Effect",
        question: "The phrase 'suck out all the marrow of life' is an example of which literary device, and what effect does it create?",
        options: [
          { label: "A", text: "Simile; it makes life seem fragile" },
          { label: "B", text: "Metaphor; it conveys a desperate, visceral hunger for authentic experience" },
          { label: "C", text: "Personification; it gives life human characteristics" },
          { label: "D", text: "Hyperbole; it exaggerates the pleasures of nature" },
        ],
        correct_answer: "B",
        explanation: "This is a metaphor — life is compared to a bone whose marrow (the richest, most essential part) must be actively extracted. The visceral, even violent imagery conveys Thoreau's intensity. He doesn't want a passive or surface-level existence; he wants every essential drop.",
      },
      {
        id: "tw3",
        type: "written",
        skill: "Interpretation",
        prompt: "Thoreau repeats the phrase 'not life' and the fear of discovering 'that I had not lived.' What does he mean by this distinction between 'life' and 'not life'? What kind of existence is he trying to escape, and what is he moving toward?",
      },
    ],
  },
  {
    id: "bronte_wuthering",
    title: "Wuthering Heights",
    author: "Emily Brontë",
    year: 1847,
    genre: "Novel",
    excerpt: `I have just returned from a visit to my landlord—the solitary neighbour that I shall be troubled with. This is certainly a beautiful country! In all England, I do not believe that I could have fixed on a situation so completely removed from the stir of society. A perfect misanthropist's heaven: and Mr. Heathcliff and I are such a suitable pair to divide the desolation between us. A capital fellow! He little imagined how my heart warmed to him when I beheld his black eyes withdraw so suspiciously under their brows, as I rode up, and when his fingers sheltered themselves, with a jealous resolution, still further in his waistcoat, as I announced my name.`,
    questions: [
      {
        id: "bw1",
        type: "mc",
        skill: "Tone & Voice",
        question: "The narrator's tone toward Heathcliff in this passage is best described as:",
        options: [
          { label: "A", text: "Fearful and anxious" },
          { label: "B", text: "Warmly ironic and naively enthusiastic" },
          { label: "C", text: "Hostile and resentful" },
          { label: "D", text: "Detached and scientific" },
        ],
        correct_answer: "B",
        explanation: "The narrator, Lockwood, interprets Heathcliff's cold, suspicious behavior as signs of a kindred spirit — even calling him 'A capital fellow!' while describing behavior (withdrawn eyes, sheltered fingers) that clearly signals hostility. Brontë uses Lockwood's naive enthusiasm ironically to highlight how wrong his first impression is.",
      },
      {
        id: "bw2",
        type: "mc",
        skill: "Inference",
        question: "The phrase 'A perfect misanthropist's heaven' most likely means:",
        options: [
          { label: "A", text: "A place ideal for someone who dislikes other people" },
          { label: "B", text: "A religious sanctuary for those seeking solitude" },
          { label: "C", text: "A paradox, since misanthropists cannot experience happiness" },
          { label: "D", text: "A compliment to the natural beauty of the region" },
        ],
        correct_answer: "A",
        explanation: "A misanthropist is someone who dislikes or distrusts humanity. The narrator is describing the isolated, remote Yorkshire moors as ideal for someone who wants nothing to do with society — a 'heaven' for someone who hates people. The phrase is sardonic and self-aware.",
      },
      {
        id: "bw3",
        type: "written",
        skill: "Character Analysis",
        prompt: "Based on the specific details in the passage — his eyes, his fingers, his reaction to Lockwood's name — what can you infer about Heathcliff's personality and emotional state? What does Brontë's word choice reveal about him?",
      },
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function PassageCard({ passage, onStart }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onStart(passage)}
      className="w-full text-left p-5 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 bg-white transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-emerald-100 text-emerald-800 border-0">{passage.genre}</Badge>
            <Badge variant="outline" className="text-gray-500">{passage.year}</Badge>
          </div>
          <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700">{passage.title}</h3>
          <p className="text-sm text-gray-500">{passage.author}</p>
          <p className="text-xs text-gray-400 mt-2">
            {passage.questions.filter(q => q.type === "mc").length} multiple choice ·{" "}
            {passage.questions.filter(q => q.type === "written").length} written response
          </p>
        </div>
        <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 flex-shrink-0 mt-1" />
      </div>
    </motion.button>
  );
}

function MCQuestion({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const isCorrect = selected === question.correct_answer;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-emerald-100 text-emerald-800 border-0">{question.skill}</Badge>
        <Badge variant="outline">Multiple Choice</Badge>
      </div>
      <p className="text-base font-medium text-gray-800 leading-relaxed">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((opt) => {
          let style = "border-2 border-gray-200 hover:border-emerald-400 bg-white cursor-pointer";
          if (selected !== null) {
            if (opt.label === question.correct_answer) style = "border-2 border-emerald-500 bg-emerald-50";
            else if (opt.label === selected) style = "border-2 border-red-400 bg-red-50";
            else style = "border-2 border-gray-100 bg-gray-50 opacity-50 cursor-default";
          }
          return (
            <button
              key={opt.label}
              onClick={() => !selected && setSelected(opt.label)}
              disabled={!!selected}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${style}`}
            >
              <span className="font-bold text-emerald-700 w-5 flex-shrink-0">{opt.label})</span>
              <span className="text-sm text-gray-800 flex-1">{opt.text}</span>
              {selected && opt.label === question.correct_answer && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
              {selected && opt.label === selected && opt.label !== question.correct_answer && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="space-y-3">
          <div className={`p-3 rounded-xl text-sm ${isCorrect ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-stone-50 border border-stone-200 text-stone-800"}`}>
            {isCorrect ? "✓ Correct! " : "✗ Incorrect. "}{question.explanation}
          </div>
          <EnglishTutorChat context={{
            questionText: question.question,
            correctAnswer: question.correct_answer,
            correctAnswerText: question.options?.find(o => o.label === question.correct_answer)?.text || '',
            studentAnswer: selected,
            studentAnswerText: question.options?.find(o => o.label === selected)?.text || '',
            explanation: question.explanation,
            skill: question.skill,
            isCorrect,
          }} />
          <Button onClick={() => onAnswer(isCorrect)} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function WrittenQuestion({ question, onAnswer }) {
  const [userText, setUserText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);

  const handleSubmit = async () => {
    if (!userText.trim() || userText.trim().length < 20) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert SAT English tutor evaluating a student's short written response.

Skill being tested: ${question.skill}
Prompt: ${question.prompt}

Student's response: "${userText}"

Evaluate the response on a scale of 1-3:
- 3: Strong — student identifies key textual evidence, makes a clear analytical claim, and explains the "how" or "why."
- 2: Developing — student has the right general idea but lacks specific evidence or clear reasoning.
- 1: Beginning — student misunderstands the question or gives a very vague/general answer.

Return JSON with: { "score": <1|2|3>, "feedback": "<2-4 sentences of constructive feedback — what they did well, what to improve, what the ideal answer focuses on>" }`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            feedback: { type: "string" }
          }
        }
      });
      setScore(res.score);
      setFeedback(res.feedback);
      setSubmitted(true);
    } catch {
      setFeedback("Great effort! Focus on citing specific words and phrases from the passage to support your analysis.");
      setScore(2);
      setSubmitted(true);
    }
    setLoading(false);
  };

  const scoreColors = { 1: "text-red-700 bg-red-50 border-red-200", 2: "text-amber-700 bg-amber-50 border-amber-200", 3: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  const scoreLabels = { 1: "Beginning", 2: "Developing", 3: "Strong" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-stone-100 text-stone-700 border-0">{question.skill}</Badge>
        <Badge variant="outline" className="flex items-center gap-1"><Pencil className="w-3 h-3" />Written Response</Badge>
      </div>
      <p className="text-base font-medium text-gray-800 leading-relaxed">{question.prompt}</p>

      {!submitted ? (
        <div className="space-y-3">
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Write your response here. Use evidence from the passage and explain your reasoning clearly..."
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm text-gray-800 min-h-32 resize-y focus:outline-none focus:border-emerald-400 leading-relaxed"
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{userText.length} characters {userText.length < 50 ? "— aim for at least 50" : ""}</span>
            <Button
              onClick={handleSubmit}
              disabled={userText.trim().length < 20 || loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />Submit for AI Review</>}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 italic">
            "{userText}"
          </div>
          <div className={`border rounded-xl p-4 space-y-2 ${scoreColors[score]}`}>
            <div className="flex items-center gap-2 font-semibold">
              <span>Score: {score}/3 — {scoreLabels[score]}</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`w-4 h-4 rounded-full border ${n <= score ? "bg-current opacity-80" : "bg-transparent opacity-30"}`} />
                ))}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{feedback}</p>
          </div>
          <Button onClick={() => onAnswer(score >= 2)} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Session ─────────────────────────────────────────────────────────────

async function generateHardQuestions(passage) {
  const mcQuestions = passage.questions.filter(q => q.type === "mc");
  if (mcQuestions.length === 0) return passage.questions;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert SAT Reading & Writing question designer. Given a literary passage, generate ${mcQuestions.length} HARD multiple-choice questions that match real SAT exam difficulty.

PASSAGE from "${passage.title}" by ${passage.author} (${passage.year}):
${passage.excerpt}

SKILLS TO TEST (generate one question per skill, matching these):
${mcQuestions.map((q, i) => `${i + 1}. ${q.skill}`).join("\n")}

CRITICAL RULES for answer choices — the #1 goal is to NEVER give away the answer:
1. All four options MUST be similar in length. No option dramatically longer or shorter than the others. This is the most common giveaway — avoid it absolutely.
2. NEVER use absolute language ("always," "never," "only," "none," "all," "impossible") in wrong answers. The SAT never uses these as distractor giveaways.
3. Wrong answers must be genuinely plausible. Each distractor should target a specific common misreading: confusing the author's view with a character's view, confusing cause and effect, overreading (reading too much in), underreading (missing nuance), or selecting a true-but-irrelevant detail from the passage.
4. The correct answer must require inference, analysis, or synthesis — it should NOT be directly quotable or paraphrasable from a single sentence.
5. All four options must be grammatically parallel (same structure, same tense, same level of formality).
6. Shuffle which letter (A, B, C, D) is correct across questions — do not favor any position.
7. Do NOT make the correct answer noticeably more specific, detailed, or "hedged" than the distractors. A correct answer that says "primarily suggests" while distractors say "definitely proves" is a giveaway.
8. Explanations must explain WHY the correct answer is right AND why each distractor is specifically tempting but wrong.

Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{"questions": [{"skill": "Skill Name", "question": "Question text?", "options": [{"label": "A", "text": "..."}, {"label": "B", "text": "..."}, {"label": "C", "text": "..."}, {"label": "D", "text": "..."}], "correct_answer": "A", "explanation": "..."}]}`
  });

  let parsed;
  try {
    const text = typeof res === "string" ? res : JSON.stringify(res);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return passage.questions;
  }

  const hardMC = (parsed.questions || []).slice(0, mcQuestions.length).map((q, i) => ({
    ...q,
    id: `hard_${mcQuestions[i]?.id || i}`,
    type: "mc"
  }));

  if (hardMC.length === 0) return passage.questions;

  let hardIdx = 0;
  return passage.questions.map(q => {
    if (q.type === "mc" && hardIdx < hardMC.length) {
      return hardMC[hardIdx++];
    }
    return q;
  });
}

function PassageSession({ passage, difficulty, onBack, onComplete }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [showPassage, setShowPassage] = useState(true);
  const [done, setDone] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState(passage.questions);
  const [generating, setGenerating] = useState(difficulty === "hard");

  useEffect(() => {
    if (difficulty !== "hard") {
      setActiveQuestions(passage.questions);
      setGenerating(false);
      return;
    }
    setGenerating(true);
    generateHardQuestions(passage)
      .then(hardQs => {
        setActiveQuestions(hardQs);
        setGenerating(false);
      })
      .catch(() => {
        setActiveQuestions(passage.questions);
        setGenerating(false);
      });
  }, [difficulty, passage]);

  const questions = activeQuestions;
  const current = questions[questionIndex];

  const handleAnswer = (correct) => {
    const newResults = [...results, { correct, skill: current.skill, type: current.type }];
    setResults(newResults);
    if (questionIndex + 1 >= questions.length) {
      setDone(true);
      onComplete(newResults);
    } else {
      setQuestionIndex(i => i + 1);
    }
  };

  if (done) return null;

  if (generating) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" />Back
          </Button>
        </div>
        <Card className="border-2 border-emerald-100 bg-white shadow">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-gray-700 font-medium">Generating SAT-level questions...</p>
            <p className="text-sm text-gray-500">Crafting harder questions with carefully balanced answer choices that don't give away the answer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500">
          <ArrowLeft className="w-4 h-4 mr-1" />Back
        </Button>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-sm">{passage.title}</p>
          <p className="text-xs text-gray-500">{passage.author}, {passage.year}</p>
        </div>
        <span className="text-sm text-gray-500">{questionIndex + 1}/{questions.length}</span>
      </div>

      <Progress value={(questionIndex / questions.length) * 100} className="h-1.5" />

      {/* Passage toggle */}
      <button
        onClick={() => setShowPassage(s => !s)}
        className="w-full text-left px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-2"
      >
        <BookOpen className="w-4 h-4" />
        {showPassage ? "Hide Passage ▲" : "Show Passage ▼"}
      </button>

      {showPassage && (
        <Card className="border-2 border-stone-200 bg-stone-50">
          <CardContent className="p-5">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed font-serif">{passage.excerpt}</p>
          </CardContent>
        </Card>
      )}

      {/* Question */}
      <Card className="border-2 border-emerald-100 bg-white shadow">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {current.type === "mc" ? (
                <MCQuestion question={current} onAnswer={handleAnswer} />
              ) : (
                <WrittenQuestion question={current} onAnswer={handleAnswer} />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

function PassageResult({ passage, results, onRetry, onBack }) {
  const mc = results.filter(r => r.type === "mc");
  const written = results.filter(r => r.type === "written");
  const mcCorrect = mc.filter(r => r.correct).length;
  const writtenGood = written.filter(r => r.correct).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
        <BookOpen className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Passage Complete!</h2>
      <p className="text-gray-600">{passage.title} — {passage.author}</p>

      <div className="grid grid-cols-2 gap-4">
        {mc.length > 0 && (
          <Card className="bg-emerald-50 border-2 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-800">{mcCorrect}/{mc.length}</p>
              <p className="text-sm text-gray-600">Multiple Choice</p>
            </CardContent>
          </Card>
        )}
        {written.length > 0 && (
          <Card className="bg-stone-50 border-2 border-stone-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-stone-800">{writtenGood}/{written.length}</p>
              <p className="text-sm text-gray-600">Written Responses</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        <Button variant="outline" onClick={onRetry}>Try Another Passage</Button>
        <Button onClick={onBack} className="bg-emerald-600 hover:bg-emerald-700">Back to Practice</Button>
      </div>
    </motion.div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function RealWorldApplications({ onBack }) {
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);
  const [genreFilter, setGenreFilter] = useState("All");
  const [difficulty, setDifficulty] = useState("standard");

  const filtered = genreFilter === "All" ? PASSAGES : PASSAGES.filter(p => normalizeGenre(p.genre) === genreFilter);

  if (sessionResults && selectedPassage) {
    return (
      <PassageResult
        passage={selectedPassage}
        results={sessionResults}
        onRetry={() => { setSelectedPassage(null); setSessionResults(null); }}
        onBack={onBack}
      />
    );
  }

  if (selectedPassage) {
    return (
      <PassageSession
        passage={selectedPassage}
        difficulty={difficulty}
        onBack={() => setSelectedPassage(null)}
        onComplete={(results) => setSessionResults(results)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />Back to Practice
        </Button>
        <div>
          <h2 className="font-bold text-gray-900 text-lg">Real-World Applications</h2>
          <p className="text-sm text-gray-500">{PASSAGES.length} passages — classic literature, tone, inference & written response</p>
        </div>
      </div>

      <div className="bg-stone-50 border-2 border-stone-200 rounded-2xl p-4">
        <p className="text-sm text-stone-700">
          <strong>How it works:</strong> Read a genuine excerpt from classic literature, then answer multiple choice and written response questions. Written responses are analyzed by AI and scored for depth of textual reasoning.
        </p>
      </div>

      {/* Difficulty selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Difficulty:</span>
        {[
          { key: "standard", label: "Standard" },
          { key: "hard", label: "Hard (SAT-level)" },
        ].map(d => (
          <button
            key={d.key}
            onClick={() => setDifficulty(d.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
              difficulty === d.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
            }`}
          >
            {d.label}
          </button>
        ))}
        {difficulty === "hard" && (
          <span className="text-xs text-gray-400">Questions are AI-generated with balanced, non-giveaway answer choices</span>
        )}
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 flex-wrap">
        {GENRES.map(g => (
          <button
            key={g}
            onClick={() => setGenreFilter(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
              genreFilter === g ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
            }`}
          >
            {g} {g === "All" ? `(${PASSAGES.length})` : `(${PASSAGES.filter(p => normalizeGenre(p.genre) === g).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map((passage) => (
          <PassageCard key={passage.id} passage={passage} onStart={setSelectedPassage} />
        ))}
      </div>
    </div>
  );
}
