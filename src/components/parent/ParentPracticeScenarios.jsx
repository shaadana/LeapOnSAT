import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Theater, MessageCircle, Loader2, BarChart3, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const SCENARIOS = [
  { 
    type: 'homework_resistance', 
    title: 'Homework Resistance',
    description: 'Your child refuses to start homework or says it\'s too hard',
    childContext: 'frustrated, avoidant, low confidence'
  },
  { 
    type: 'test_anxiety', 
    title: 'Test Anxiety',
    description: 'Your child is stressed about an upcoming test',
    childContext: 'anxious, overwhelmed, catastrophizing'
  },
  { 
    type: 'low_motivation', 
    title: 'Low Motivation',
    description: 'Your child doesn\'t care about school or grades',
    childContext: 'disconnected, unmotivated, disengaged'
  },
  { 
    type: 'parent_contradiction', 
    title: 'Disagreement with Teacher',
    description: 'You disagree with teacher feedback about your child',
    childContext: 'confused, caught in middle, defensive'
  },
  { 
    type: 'struggle_support', 
    title: 'Supporting Through Struggle',
    description: 'Your child is struggling with challenging material',
    childContext: 'discouraged, doubting ability, ready to give up'
  },
  { 
    type: 'growth_moment', 
    title: 'Celebrating Growth',
    description: 'Your child accomplished something hard',
    childContext: 'proud, energized, confident'
  }
];

export default function ParentPracticeScenarios() {
  const [activeScenario, setActiveScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const startScenario = (scenario) => {
    const initialMessage = {
      role: 'assistant',
      content: `**Scenario: ${scenario.title}**\n\n${scenario.description}\n\nYour child is ${scenario.childContext}. How will you respond? (Type 'end' to finish and get analysis)`
    };
    setActiveScenario(scenario);
    setMessages([initialMessage]);
    setAnalysis(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    if (userMessage.toLowerCase().includes('end')) {
      await generateAnalysis();
      return;
    }

    setIsChatting(true);
    try {
      const prompt = `You are roleplaying as a child/teenager in this parenting scenario: ${activeScenario.description}
      
Child's emotional state: ${activeScenario.childContext}

The child is age 14 (sensitive, developing autonomy, needs both support and respect).

Conversation so far:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Parent's response: ${userMessage}

As the child, respond realistically based on:
- Whether the parent used mentor mindset (high standards + high support) vs enforcer (controlling) or protector (overprotective)
- Whether they respected your developing autonomy or were patronizing
- Whether they explained reasoning or just commanded
- Whether they asked genuine questions or lectured

Keep response under 100 words. Be authentic to a teenager's voice.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      console.error('Chat error');
    } finally {
      setIsChatting(false);
    }
  };

  const generateAnalysis = async () => {
    setIsChatting(true);
    try {
      const prompt = `Analyze this parent-child roleplay conversation for mentor mindset parenting.

Scenario: ${activeScenario.title} - ${activeScenario.description}

Conversation:
${messages.map(m => `${m.role === 'user' ? 'Parent' : 'Child'}: ${m.content}`).join('\n\n')}

Provide a comprehensive analysis covering:

1. **Mentor Mindset Assessment** (rate 1-10)
   - Did they maintain high expectations + high support?
   - Or did they slip into Enforcer (controlling) or Protector (lowering expectations)?

2. **Respect & Autonomy** (rate 1-10)
   - Did they honor the child's developing autonomy?
   - Did they treat the child as capable of growth?

3. **Parenting Practices Used**
   - Growth mindset language
   - Transparent reasoning
   - Genuine questions with listening
   - Collaborative problem-solving
   - Emotional validation

4. **What Worked Well**

5. **What Could Be Improved**

6. **Suggested Rewording** (give 1-2 examples of better phrasing)

Be specific and supportive.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error');
    } finally {
      setIsChatting(false);
    }
  };

  if (analysis) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => {
          setActiveScenario(null);
          setMessages([]);
          setAnalysis(null);
        }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scenarios
        </Button>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white">
          <CardHeader className="bg-emerald-50/80">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              Parenting Style Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-stone-800">{analysis}</div>
            </div>
            <Button
              onClick={() => {
                setActiveScenario(null);
                setMessages([]);
                setAnalysis(null);
              }}
              className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold border-4 border-white"
            >
              Try Another Scenario
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeScenario) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => setActiveScenario(null)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scenarios
        </Button>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white">
          <CardHeader className="bg-emerald-50/80">
            <div className="flex items-center gap-2">
              <Theater className="w-6 h-6 text-emerald-600" />
              <div>
                <CardTitle>{activeScenario.title}</CardTitle>
                <p className="text-sm text-stone-600 mt-1">{activeScenario.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-stone-100 text-stone-800 border-2 border-stone-200'
                  }`}>
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

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response... (type 'end' to finish)"
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isChatting} className="bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold">
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
            <Theater className="w-6 h-6 text-emerald-600" />
            Parenting Practice Scenarios
          </CardTitle>
          <CardDescription className="text-stone-600">
            Roleplay realistic parenting situations to practice being supportive and encouraging
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {SCENARIOS.map((scenario) => (
          <Card key={scenario.type} className="hover:shadow-2xl transition-all border-4 border-white hover:-translate-y-2 hover:rotate-1 rounded-3xl bg-white shadow-xl">
            <CardContent className="p-6">
              <h3 className="font-display font-bold text-lg text-stone-900 mb-2">{scenario.title}</h3>
              <p className="text-sm text-stone-600 mb-4">{scenario.description}</p>
              <Button
                onClick={() => startScenario(scenario)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold"
              >
                <Theater className="w-4 h-4 mr-2" />
                Start Roleplay
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
