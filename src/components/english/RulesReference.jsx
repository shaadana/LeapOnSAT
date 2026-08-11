import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GRAMMAR_DOMAINS } from '@/data/englishGrammarRules';

// Mini quizzes per domain — 2-3 questions each
const DOMAIN_QUIZZES = {
  apostrophes: [
    {
      q: "Which sentence is correct?",
      options: ["The dog wagged it's tail.", "The dog wagged its tail.", "The dog wagged its' tail."],
      answer: 1,
      explanation: "Possessive pronouns never use apostrophes. 'Its' is the possessive; 'it's' = 'it is'."
    },
    {
      q: "Choose the correct possessive form for multiple students.",
      options: ["The students's books", "The students' books", "The student's books (all students)"],
      answer: 1,
      explanation: "Plural nouns ending in -s take only an apostrophe after: students'."
    },
  ],
  semicolons_periods: [
    {
      q: "Which correctly joins two independent clauses?",
      options: ["She studied hard, she passed the test.", "She studied hard; she passed the test.", "She studied hard and, she passed the test."],
      answer: 1,
      explanation: "A semicolon (or period) joins two independent clauses. A comma alone creates a comma splice."
    },
    {
      q: "Which is correct?",
      options: ["He was tired, however, he kept going.", "He was tired; however, he kept going.", "He was tired however; he kept going."],
      answer: 1,
      explanation: "Use a semicolon before 'however' when it begins a new independent clause."
    },
  ],
  commas: [
    {
      q: "Which sentence correctly uses a comma?",
      options: ["Running through the park, she spotted a deer.", "She, spotted a deer in the park.", "She spotted, a deer in the park."],
      answer: 0,
      explanation: "Use a comma after an introductory dependent clause or phrase before the main clause."
    },
    {
      q: "Which is a comma splice (wrong)?",
      options: ["I like math, and I like science.", "I like math, I like science.", "I like math; I like science."],
      answer: 1,
      explanation: "Two full sentences joined only by a comma is a comma splice — always wrong."
    },
  ],
  colons: [
    {
      q: "Which correctly uses a colon?",
      options: ["She bought: apples, oranges, and bananas.", "She needed three things: apples, oranges, and bananas.", "She needed: three things from the store."],
      answer: 1,
      explanation: "The clause before a colon must be a complete sentence. 'She needed three things' is complete."
    },
    {
      q: "Which is wrong?",
      options: ["He had one goal: to win.", "His goals included: winning and learning.", "She explained it clearly: the plan had failed."],
      answer: 1,
      explanation: "'His goals included' is not a complete sentence — no colon after an incomplete clause."
    },
  ],
  dashes: [
    {
      q: "Which correctly uses dashes?",
      options: ["The book—which I loved—was long.", "The book—which I loved, was long.", "The book, which I loved—was long."],
      answer: 0,
      explanation: "When using dashes around a non-essential phrase, both must be dashes (matching punctuation)."
    },
    {
      q: "Which is correct?",
      options: ["He had one goal—to graduate.", "He had one goal—to graduate,", "He had one, goal—to graduate."],
      answer: 0,
      explanation: "Dashes work like colons before explanations. Only one dash is needed at the end here."
    },
  ],
  conciseness: [
    {
      q: "Which is most concise while keeping the full meaning?",
      options: [
        "Due to the fact that it was raining, we stayed inside.",
        "Because it was raining, we stayed inside.",
        "Because of the rainy conditions that were occurring, we stayed inside."
      ],
      answer: 1,
      explanation: "'Because' is shorter than 'due to the fact that' and says the same thing."
    },
    {
      q: "Which is redundant?",
      options: ["She returned back to the store.", "She returned to the store.", "She went back to the store."],
      answer: 0,
      explanation: "'Returned' already means 'went back.' Adding 'back' is redundant."
    },
  ],
  parallel_structure: [
    {
      q: "Which correctly uses parallel structure?",
      options: [
        "She likes hiking, to swim, and running.",
        "She likes hiking, swimming, and running.",
        "She likes to hike, swimming, and to run."
      ],
      answer: 1,
      explanation: "All items in the list must share the same form: hiking, swimming, running (-ing)."
    },
    {
      q: "Which is correct?",
      options: [
        "He wants to study and to graduate.",
        "He wants to study and graduating.",
        "He wants studying and to graduate."
      ],
      answer: 0,
      explanation: "Both verbs follow 'to': to study and (to) graduate — parallel infinitive structure."
    },
  ],
  subject_verb_agreement: [
    {
      q: "Which is correct?",
      options: [
        "The group of students are going on a trip.",
        "The group of students is going on a trip.",
        "The group of students were going on a trip."
      ],
      answer: 1,
      explanation: "The subject is 'group' (singular), not 'students.' Collective nouns take singular verbs."
    },
    {
      q: "Which is correct?",
      options: [
        "Each of the players are ready.",
        "Each of the players is ready.",
        "Each of the players were ready."
      ],
      answer: 1,
      explanation: "'Each' is always singular — it takes a singular verb regardless of what follows."
    },
  ],
  pronoun_agreement: [
    {
      q: "Which is correct?",
      options: [
        "The team celebrated their victory.",
        "The team celebrated its victory.",
        "The team celebrated it's victory."
      ],
      answer: 1,
      explanation: "Collective nouns like 'team' take singular pronouns: its."
    },
    {
      q: "Which pronoun correctly refers to 'everyone'?",
      options: [
        "Everyone forgot their homework.",
        "Everyone forgot his or her homework.",
        "Everyone forgot its homework."
      ],
      answer: 1,
      explanation: "On the SAT, 'everyone' takes singular 'his or her.' (In informal speech 'their' is common, but the SAT prefers 'his or her'.)"
    },
  ],
  verb_tense: [
    {
      q: "Which is correct in a passage set entirely in the past?",
      options: [
        "She walks to school and sees her friend.",
        "She walked to school and saw her friend.",
        "She had walked to school and has seen her friend."
      ],
      answer: 1,
      explanation: "Keep tense consistent throughout a passage. Simple past (walked, saw) matches the past context."
    },
    {
      q: "Which correctly uses past perfect?",
      options: [
        "By the time he arrived, she left.",
        "By the time he arrived, she had left.",
        "By the time he arrived, she has left."
      ],
      answer: 1,
      explanation: "'By the time' signals that one past event preceded another — use past perfect (had left)."
    },
  ],
  adjectives_adverbs: [
    {
      q: "Which is correct?",
      options: [
        "She sings beautiful.",
        "She sings beautifully.",
        "She sings more beautiful."
      ],
      answer: 1,
      explanation: "Adverbs (ending in -ly) modify verbs. 'Beautifully' modifies the verb 'sings.'"
    },
    {
      q: "Which is correct?",
      options: [
        "He is the most tallest student.",
        "He is the tallest student.",
        "He is more tallest student."
      ],
      answer: 1,
      explanation: "Never combine 'most' with an -est superlative. Use one or the other: tallest OR most tall."
    },
  ],
  word_pairs: [
    {
      q: "Which correctly uses a word pair?",
      options: [
        "She is not only smart and also kind.",
        "She is not only smart but also kind.",
        "She is not only smart, also kind."
      ],
      answer: 1,
      explanation: "'Not only' must be paired with 'but also' — they are a correlative conjunction pair."
    },
    {
      q: "Which is correct?",
      options: [
        "Either the teacher and the student will present.",
        "Either the teacher or the student will present.",
        "Either the teacher nor the student will present."
      ],
      answer: 1,
      explanation: "'Either' pairs with 'or.' 'Neither' pairs with 'nor.'"
    },
  ],
  who_which_whom: [
    {
      q: "Which is correct?",
      options: [
        "The scientist which discovered penicillin was Fleming.",
        "The scientist who discovered penicillin was Fleming.",
        "The scientist whom discovered penicillin was Fleming."
      ],
      answer: 1,
      explanation: "'Who' refers to people and acts as the subject of the clause (who discovered)."
    },
    {
      q: "Which is correct?",
      options: [
        "To who did you give the award?",
        "To whom did you give the award?",
        "To who you gave the award?"
      ],
      answer: 1,
      explanation: "'Whom' follows prepositions (to, by, for). Test: 'You gave the award to him' → use whom."
    },
  ],
  modifiers: [
    {
      q: "Which correctly places the modifier?",
      options: [
        "Running through the park, the trees looked beautiful.",
        "Running through the park, she noticed the beautiful trees.",
        "Beautiful, running through the park, the trees were seen."
      ],
      answer: 1,
      explanation: "The opening phrase 'Running through the park' must be followed immediately by the person who was running — 'she.'"
    },
    {
      q: "Which sentence has a misplaced modifier?",
      options: [
        "I almost drove my kids to school every day last year.",
        "Last year I drove my kids to school almost every day.",
        "Almost every day last year, I drove my kids to school."
      ],
      answer: 0,
      explanation: "'Almost' is misplaced — it modifies 'drove,' implying you nearly drove but didn't. It should modify 'every day.'"
    },
  ],
  pronoun_case: [
    {
      q: "Which is correct?",
      options: [
        "Between you and I, this is wrong.",
        "Between you and me, this is correct.",
        "Between you and myself, this is fine."
      ],
      answer: 1,
      explanation: "After a preposition like 'between,' always use object pronouns: me, him, her, us, them."
    },
    {
      q: "Which is correct?",
      options: [
        "Her and I went to the store.",
        "She and I went to the store.",
        "She and me went to the store."
      ],
      answer: 1,
      explanation: "Cross out 'and I/me': 'Her went' sounds wrong; 'She went' sounds right → She and I."
    },
  ],
  idioms_diction: [
    {
      q: "Which is correct?",
      options: [
        "The new policy will effect major changes.",
        "The new policy will affect major changes.",
        "The new policy will have affect on changes."
      ],
      answer: 1,
      explanation: "'Affect' is usually a verb (to influence). 'Effect' is usually a noun (a result). Here we need a verb."
    },
    {
      q: "Which is correct?",
      options: [
        "She should of studied harder.",
        "She should have studied harder.",
        "She should've of studied harder."
      ],
      answer: 1,
      explanation: "Always use 'have' after modal verbs (could, should, would, might). 'Of' sounds like 'have' but is wrong."
    },
  ],
  transitions: [
    {
      q: "The first sentence says the drug worked well. The second says it had side effects. Which transition fits?",
      options: ["Furthermore, it had side effects.", "However, it had side effects.", "Therefore, it had side effects."],
      answer: 1,
      explanation: "'However' signals contrast — the second idea (side effects) contrasts the first (worked well)."
    },
    {
      q: "The first sentence says practice is important. The second says it improves performance. Which fits?",
      options: ["Nevertheless, practice improves performance.", "As a result, practice improves performance.", "However, practice improves performance."],
      answer: 1,
      explanation: "'As a result' (cause-effect) fits because practicing causes improved performance."
    },
  ],
  vocabulary: [
    {
      q: "The passage describes a scientist who firmly refused to change her position despite criticism. Which word fits best?",
      options: ["steadfast", "indecisive", "amiable"],
      answer: 0,
      explanation: "'Steadfast' means firmly committed and unwilling to change — it matches the context perfectly."
    },
    {
      q: "The tone of the passage is formal academic writing. Which word fits in a blank referring to a small difference?",
      options: ["teensy difference", "slight difference", "itsy-bitsy difference"],
      answer: 1,
      explanation: "Match the register. 'Slight' is formal; 'teensy' and 'itsy-bitsy' are too informal for academic writing."
    },
  ],
};

function DomainCard({ domain }) {
  const [open, setOpen] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const questions = DOMAIN_QUIZZES[domain.id] || [];

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === questions[quizIdx].answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (quizIdx + 1 >= questions.length) {
      setDone(true);
    } else {
      setQuizIdx(q => q + 1);
      setSelected(null);
    }
  };

  const resetQuiz = () => {
    setQuizIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setQuizStarted(false);
  };

  return (
    <Card className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full text-left"
        onClick={() => setOpen(o => !o)}
      >
        <CardHeader className="pb-3 hover:bg-gray-50 transition-colors">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="text-lg">{domain.emoji}</span>
              {domain.label}
            </span>
            {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </CardTitle>
          <p className="text-sm text-gray-500 text-left">{domain.description}</p>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {/* Rules */}
          <div className="space-y-2">
            {domain.rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                {rule}
              </div>
            ))}
          </div>

          {/* Tip */}
          {domain.tips && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-800"><strong>Tip:</strong> {domain.tips}</p>
            </div>
          )}

          {/* Quiz section */}
          {questions.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              {!quizStarted && !done && (
                <button
                  onClick={() => setQuizStarted(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  Try {questions.length} practice question{questions.length > 1 ? 's' : ''}
                </button>
              )}

              {quizStarted && !done && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Question {quizIdx + 1} of {questions.length}
                  </p>
                  <p className="text-sm font-medium text-gray-800">{questions[quizIdx].q}</p>
                  <div className="space-y-2">
                    {questions[quizIdx].options.map((opt, i) => {
                      const isCorrect = i === questions[quizIdx].answer;
                      const isSelected = selected === i;
                      let cls = "w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition-all ";
                      if (selected === null) {
                        cls += "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-700";
                      } else if (isCorrect) {
                        cls += "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium";
                      } else if (isSelected) {
                        cls += "border-stone-400 bg-stone-50 text-stone-600";
                      } else {
                        cls += "border-gray-200 text-gray-400";
                      }
                      return (
                        <button key={i} className={cls} onClick={() => handleAnswer(i)}>
                          <span className="flex items-center gap-2">
                            {selected !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            {selected !== null && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-stone-500 flex-shrink-0" />}
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selected !== null && (
                    <div className="space-y-2">
                      <div className={`text-xs p-3 rounded-xl ${selected === questions[quizIdx].answer ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-stone-50 border border-stone-200 text-stone-700'}`}>
                        {questions[quizIdx].explanation}
                      </div>
                      <Button size="sm" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                        {quizIdx + 1 >= questions.length ? 'See Results' : 'Next →'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {done && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl text-center ${score === questions.length ? 'bg-emerald-50 border border-emerald-200' : 'bg-stone-50 border border-stone-200'}`}>
                    <p className="text-2xl font-bold text-gray-800">{score}/{questions.length}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {score === questions.length ? '🎉 Perfect! You know this rule.' : score >= questions.length / 2 ? '👍 Good — review the tip above.' : '📖 Re-read the rules above and try again.'}
                    </p>
                  </div>
                  <button onClick={resetQuiz} className="text-sm text-emerald-600 hover:text-emerald-800 font-medium underline-offset-2 hover:underline">
                    Retake quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function RulesReference({ onBack }) {
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />Back to Practice
      </Button>
      <h2 className="font-bold text-gray-800 text-lg mb-1">Grammar Rules Reference</h2>
      <p className="text-sm text-gray-500 mb-5">Click any rule to expand — includes practice questions to test your understanding.</p>
      <div className="space-y-3">
        {Object.values(GRAMMAR_DOMAINS).map((domain) => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    </div>
  );
}
