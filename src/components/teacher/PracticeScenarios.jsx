import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Theater, Loader2, BarChart3, ArrowLeft, Send, Flag, CheckCircle2, AlertCircle } from 'lucide-react';

// Vivid, concrete personas so the AI has a real character to inhabit.
const SCENARIOS = [
  {
    type: 'struggling_student',
    title: 'The Struggling Student',
    description: 'A student is falling behind and starting to give up.',
    persona: {
      name: 'Maya',
      age: 15,
      situation: 'She just got a 52% on her third algebra quiz in a row. She stayed up late studying and still failed. She\'s sitting at her desk staring at the paper, fighting back tears, and has already said "I\'m just not a math person" twice this week.',
      mindset: 'feels incompetent, embarrassed, on the verge of quitting. She secretly wants someone to tell her it\'s okay to give up.',
      wants: 'to feel like she isn\'t broken, but she\'ll resist effort if it feels pointless',
    },
    opening: '*stares at the quiz, then shoves it into her backpack without looking at you*\nI\'m not redoing this. It doesn\'t matter. I studied for like three hours and I still failed. Can I just... not do math?',
  },
  {
    type: 'disruptive_behavior',
    title: 'The Disruptive Student',
    description: 'A student keeps derailing class to look tough.',
    persona: {
      name: 'Jaylen',
      age: 16,
      situation: 'He just cracked a loud joke at another student\'s expense while you were mid-explanation, and several kids laughed. This is the third time this week. He\'s leaning back in his chair, grinning, waiting to see what you\'ll do.',
      mindset: 'seeking status and attention in front of peers; feels disrespected by authority in general; will escalate if publicly shamed, will lose face if he backs down meekly',
      wants: 'to look strong in front of the class',
    },
    opening: '*leans back, grinning, arms crossed*\nWhat? It was funny. Lighten up, it\'s just a joke. You\'re always so serious about this stuff.',
  },
  {
    type: 'low_motivation',
    title: 'The Checked-Out Student',
    description: 'A student sees no point in any of it.',
    persona: {
      name: 'Devon',
      age: 17,
      situation: 'He\'s turned in blank worksheets for two weeks. Today he\'s on his phone under the desk. When you ask about college he shrugs. He\'s not angry — just completely disconnected, going through motions for a grade he doesn\'t think means anything.',
      mindset: 'sees no purpose in the work; motivated only by avoiding hassle; quietly believes none of this matters for his actual life',
      wants: 'to be left alone, but also secretly wants someone to show him why any of it matters',
    },
    opening: '*doesn\'t look up from phone*\nYeah, I\'ll do it later. It\'s just busywork anyway. When am I ever gonna use any of this?',
  },
  {
    type: 'resistance_to_feedback',
    title: 'Resistance to Feedback',
    description: 'A student bristles the moment you critique their work.',
    persona: {
      name: 'Priya',
      age: 16,
      situation: 'She wrote a strong essay draft but made the same supporting-evidence error in three paragraphs. You start to point it out and she immediately gets defensive — she\'s proud of this draft and reads any criticism as an attack on her as a person.',
      mindset: 'ties her self-worth to being "smart"; perceives feedback as a status threat; will argue, deflect, or shut down',
      wants: 'to be recognized as capable, but can\'t hear feedback that way right now',
    },
    opening: '*pulls the draft toward her protectively*\nI spent all weekend on this. It\'s fine — I checked it. What\'s even wrong with it?',
  },
  {
    type: 'emotional_outburst',
    title: 'The Emotional Outburst',
    description: 'A student melts down over something that seems small.',
    persona: {
      name: 'Sam',
      age: 15,
      situation: 'You asked him to put his phone away for the third time. He slams his hand on the desk, voice cracking: "Why does everyone always come at me?!" His eyes are red. Something outside class is clearly going on, but right now he\'s spiraling and the whole class is watching.',
      mindset: 'overwhelmed, emotionally flooded, feels cornered and singled out; the phone thing is a trigger, not the real issue',
      wants: 'to not feel humiliated in front of his peers',
    },
    opening: '*slams hand on desk, voice cracking*\nWhy does everyone always come at ME?! You\'re literally the third person today! Just— leave me alone, okay?!',
  },
  {
    type: 'procrastination',
    title: 'Chronic Procrastination',
    description: 'A student can\'t seem to ever start.',
    persona: {
      name: 'Trevor',
      age: 16,
      situation: 'His big project is due tomorrow. He hasn\'t started. He\'s in your office during lunch because you asked him to come, and he\'s jittery, ashamed, and full of reasons why he "ran out of time." This is the fourth major deadline he\'s missed.',
      mindset: 'anxious about failure, so starting feels unbearable; beats himself up but can\'t break the cycle; will agree to anything to escape the conversation',
      wants: 'relief from the shame, but doesn\'t know how to actually begin',
    },
    opening: '*fidgeting with his backpack strap, won\'t make eye contact*\nI know, I know. I was gonna start it, I just... I had a lot going on. I\'ll do it tonight, for real this time. I\'ll just stay up super late.',
  },
];

const PRACTICE_LABELS = {
  mentor_mindset: { label: 'Mentor Mindset', desc: 'Held high standards AND high support', higherIsBetter: true },
  enforcer_tendency: { label: 'Enforcer Tendencies', desc: 'Punished or lowered support (lower is better)', higherIsBetter: false },
  protector_tendency: { label: 'Protector Tendencies', desc: 'Lowered expectations to be nice (lower is better)', higherIsBetter: false },
  status_respect: { label: 'Status & Respect', desc: 'Honored the student\'s dignity', higherIsBetter: true },
  wise_feedback: { label: 'Wise Feedback', desc: 'Signal: high standards + belief in the student', higherIsBetter: true },
  transparent_authority: { label: 'Transparent Authority', desc: 'Explained the "why," not just commands', higherIsBetter: true },
  authentic_questions: { label: 'Authentic Questions', desc: 'Asked real questions & used the answers', higherIsBetter: true },
  collaborative_troubleshooting: { label: 'Collaborative Troubleshooting', desc: 'Solved the problem with the student', higherIsBetter: true },
  self_transcendent_purpose: { label: 'Self-Transcendent Purpose', desc: 'Connected work to a bigger "why"', higherIsBetter: true },
};

function scoreColor(score, higherIsBetter) {
  if (score === null || score === undefined) return 'text-stone-400';
  const good = higherIsBetter ? score >= 4 : score <= 2;
  const mid = higherIsBetter ? score === 3 : score === 3;
  if (good) return 'text-emerald-600';
  if (mid) return 'text-amber-500';
  return 'text-rose-500';
}

function scoreBar(score, higherIsBetter) {
  if (score === null || score === undefined) return null;
  const good = higherIsBetter ? score >= 4 : score <= 2;
  const mid = higherIsBetter ? score === 3 : score === 3;
  if (good) return 'bg-emerald-500';
  if (mid) return 'bg-amber-400';
  return 'bg-rose-400';
}

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export default function PracticeScenarios({ user }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [grading, setGrading] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  const buildCharacterPrompt = (scenario, history) => `You are roleplaying as ${scenario.persona.name}, a ${scenario.persona.age}-year-old high school student. Stay strictly in character at all times.

WHO YOU ARE:
- Situation: ${scenario.persona.situation}
- Your internal state: ${scenario.persona.mindset}
- What you secretly want: ${scenario.persona.wants}

RULES:
- Never break character. Never mention that you are an AI, a scenario, or a roleplay.
- Never give the teacher feedback or rate them — that happens later. You are just being a real teenager in the moment.
- Speak like a real teen: short, natural, occasionally guarded or sarcastic. No essay-length replies. Keep each response to 2-4 sentences.
- React authentically to the teacher's approach:
  * If they use MENTOR moves (high standards + genuine support, respects your status, explains reasoning, asks real questions and actually listens), you gradually soften, engage, or open up — but slowly and grudgingly, not instantly cured.
  * If they act like an ENFORCER (punish, command, lecture, shame, patronize), you get defensive, shut down, push back, or perform compliance without buying in.
  * If they act like a PROTECTOR (lower expectations, let you off the hook, feel sorry for you), you may feel relieved in the moment but disengage, or feel pitied and resent it.
- Stay consistent with your situation and emotional state.

CONVERSATION SO FAR:
${history.map((m) => `${m.role === 'user' ? 'Teacher' : scenario.persona.name}: ${m.content}`).join('\n')}

Reply now as ${scenario.persona.name}. Just your words, no narration label.`;

  const startScenario = async (scenario) => {
    setActiveScenario(scenario);
    setMessages([]);
    setGrading(null);
    setError(null);
    setIsChatting(true);
    try {
      const openingPrompt = `You are roleplaying as ${scenario.persona.name}, a ${scenario.persona.age}-year-old student.

Situation: ${scenario.persona.situation}
Your internal state: ${scenario.persona.mindset}
What you secretly want: ${scenario.persona.wants}

The teacher has just sat down to talk with you. Open the conversation in character — react to the moment naturally, the way this student really would. Stay in character. 2-4 sentences. No narration about being an AI or a scenario.`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt: openingPrompt });
      setMessages([{ role: 'assistant', content: (result || '').trim() || scenario.opening }]);
    } catch (e) {
      setMessages([{ role: 'assistant', content: scenario.opening }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isChatting) return;
    const userMessage = input.trim();
    setInput('');
    const nextMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(nextMessages);
    setIsChatting(true);
    try {
      const prompt = buildCharacterPrompt(activeScenario, nextMessages);
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages((prev) => [...prev, { role: 'assistant', content: (result || '').trim() }]);
    } catch (e) {
      setError('The conversation hit a snag. Try sending your message again.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleEnd = async () => {
    if (messages.length < 2) return;
    setIsGrading(true);
    setError(null);
    try {
      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'Teacher' : activeScenario.persona.name}: ${m.content}`)
        .join('\n\n');

      const prompt = `You are an expert instructional coach evaluating a teacher's conversation with a student. Grade the TEACHER strictly against the MENTOR MINDSET framework.

Scenario: ${activeScenario.title} — ${activeScenario.description}
Student: ${activeScenario.persona.name}, ${activeScenario.persona.age}. ${activeScenario.persona.situation}
Student's internal state: ${activeScenario.persona.mindset}

TRANSCRIPT:
${transcript}

Grade the teacher on these mentor mindset practices (use 1-5 for each, or null if the practice simply did not come up in this conversation):
- mentor_mindset: Did they hold HIGH standards AND HIGH support? (1-5, higher is better)
- enforcer_tendency: Did they punish, shame, lecture, or command without support? (1-5, LOWER is better)
- protector_tendency: Did they lower expectations, feel sorry for the student, or let them off the hook? (1-5, LOWER is better)
- status_respect: Did they honor the student's dignity and treat them as capable? (1-5, higher is better)
- wise_feedback: Did they signal high standards + genuine belief in the student? (1-5 or null)
- transparent_authority: Did they explain the "why," not just give orders? (1-5 or null)
- authentic_questions: Did they ask real questions and actually use the student's answers? (1-5 or null)
- collaborative_troubleshooting: Did they solve the problem WITH the student rather than for or at them? (1-5 or null)
- self_transcendent_purpose: Did they connect the work to a bigger purpose beyond grades? (1-5 or null)

Be a tough, fair grader. Base scores ONLY on what the teacher actually said in the transcript.

Return ONLY a JSON object (no markdown, no commentary) in EXACTLY this shape:
{
  "scores": {
    "mentor_mindset": <number|null>,
    "enforcer_tendency": <number|null>,
    "protector_tendency": <number|null>,
    "status_respect": <number|null>,
    "wise_feedback": <number|null>,
    "transparent_authority": <number|null>,
    "authentic_questions": <number|null>,
    "collaborative_troubleshooting": <number|null>,
    "self_transcendent_purpose": <number|null>
  },
  "overall_grade": "<A, B, C, D, or F>",
  "summary": "<2-3 sentences, plain language>",
  "what_worked": ["<specific thing the teacher did well>", "..."],
  "improvements": ["<specific, actionable thing to do differently>", "..."],
  "suggested_rewording": [{"original": "<what they said>", "better": "<a stronger mentor-mindset version>"}]
}`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const parsed = extractJson(result);
      if (parsed) {
        setGrading(parsed);
      } else {
        setGrading({ raw: result });
      }
    } catch (e) {
      setError('Grading failed. Try ending the conversation again.');
    } finally {
      setIsGrading(false);
    }
  };

  const reset = () => {
    setActiveScenario(null);
    setMessages([]);
    setGrading(null);
    setError(null);
  };

  // ---------- GRADING VIEW ----------
  if (grading) {
    const scores = grading.scores || {};
    const orderedKeys = Object.keys(PRACTICE_LABELS);
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={reset}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Scenarios
        </Button>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white">
          <CardHeader className="bg-emerald-50/80">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" /> Mentor Mindset Feedback
            </CardTitle>
            <CardDescription>{activeScenario.title} · roleplay with {activeScenario.persona.name}, {activeScenario.persona.age}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {grading.raw ? (
              <div className="whitespace-pre-wrap text-sm text-stone-800">{grading.raw}</div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center">
                    <span className="text-4xl font-display font-bold text-emerald-700">{grading.overall_grade || '–'}</span>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed flex-1">{grading.summary}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-stone-800 uppercase tracking-wide">Practice Scores</h4>
                  {orderedKeys.map((key) => {
                    const meta = PRACTICE_LABELS[key];
                    const score = scores[key];
                    const notApplicable = score === null || score === undefined;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-56 flex-shrink-0">
                          <p className="text-sm font-medium text-stone-800">{meta.label}</p>
                          <p className="text-xs text-stone-500">{meta.desc}</p>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          {notApplicable ? (
                            <span className="text-xs text-stone-400 italic">didn't come up</span>
                          ) : (
                            <>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <div
                                    key={n}
                                    className={`h-2.5 w-6 rounded-full ${n <= score ? scoreBar(score, meta.higherIsBetter) : 'bg-stone-100'}`}
                                  />
                                ))}
                              </div>
                              <span className={`text-sm font-bold ${scoreColor(score, meta.higherIsBetter)}`}>{score}/5</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {grading.what_worked?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What Worked
                    </h4>
                    <ul className="space-y-1.5">
                      {grading.what_worked.map((w, i) => (
                        <li key={i} className="text-sm text-stone-700 flex gap-2">
                          <span className="text-emerald-500 mt-0.5">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {grading.improvements?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" /> What to Try Next Time
                    </h4>
                    <ul className="space-y-1.5">
                      {grading.improvements.map((w, i) => (
                        <li key={i} className="text-sm text-stone-700 flex gap-2">
                          <span className="text-amber-500 mt-0.5">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {grading.suggested_rewording?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-2">Suggested Rewording</h4>
                    <div className="space-y-2">
                      {grading.suggested_rewording.map((r, i) => (
                        <div key={i} className="rounded-xl border border-stone-200 p-3 bg-stone-50 text-sm">
                          <p className="text-stone-500 line-through">{r.original}</p>
                          <p className="text-emerald-700 font-medium mt-1">→ {r.better}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <Button onClick={reset} className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold border-4 border-white">
              Try Another Scenario
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- ROLEPLAY VIEW ----------
  if (activeScenario) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={reset}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Scenarios
        </Button>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white">
          <CardHeader className="bg-emerald-50/80">
            <div className="flex items-start gap-3">
              <Theater className="w-6 h-6 text-emerald-600 mt-1" />
              <div>
                <CardTitle>{activeScenario.title}</CardTitle>
                <p className="text-sm text-stone-600 mt-1">{activeScenario.description}</p>
                <Badge variant="outline" className="mt-2 bg-white text-emerald-700 border-emerald-200">
                  You're talking with {activeScenario.persona.name}, {activeScenario.persona.age}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div ref={scrollRef} className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-800 border-2 border-stone-200'
                  }`}>
                    {msg.role === 'assistant' && (
                      <p className="text-xs font-semibold text-stone-500 mb-1">{activeScenario.persona.name}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-2xl px-4 py-3 border-2 border-stone-200">
                    <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Respond to the student..."
                className="flex-1"
                disabled={isChatting || isGrading}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isChatting || isGrading} className="bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold">
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleEnd}
              disabled={messages.length < 2 || isChatting || isGrading}
              variant="outline"
              className="w-full mt-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full font-bold"
            >
              {isGrading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Grading your mentor mindset…</>
              ) : (
                <><Flag className="w-4 h-4 mr-2" /> End Conversation & Get Feedback</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- SCENARIO PICKER ----------
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
            <Theater className="w-6 h-6 text-emerald-600" /> Practice Scenarios
          </CardTitle>
          <CardDescription className="text-stone-600">
            Have a real conversation with a student played by AI. You'll get graded on your mentor mindset at the end.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.type} className="hover:shadow-2xl transition-all border-4 border-white hover:-translate-y-1 rounded-3xl bg-white shadow-xl">
            <CardContent className="p-6">
              <h3 className="font-display font-bold text-lg text-stone-900 mb-1">{scenario.title}</h3>
              <p className="text-sm text-stone-600 mb-3">{scenario.description}</p>
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 mb-4">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">You'll meet</p>
                <p className="text-sm text-stone-700">
                  <span className="font-semibold">{scenario.persona.name}</span>, {scenario.persona.age} — {scenario.persona.situation}
                </p>
              </div>
              <Button
                onClick={() => startScenario(scenario)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold"
              >
                <Theater className="w-4 h-4 mr-2" /> Start Roleplay
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
