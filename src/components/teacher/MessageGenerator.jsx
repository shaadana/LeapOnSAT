import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Copy, Loader2, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MENTOR_PRACTICES = [
  { 
    value: 'wise_feedback', 
    label: 'Wise Feedback',
    description: 'Pairs high standards with belief in potential: "I\'m giving you this feedback because I have high standards and I know you can reach them"'
  },
  { 
    value: 'sergio_trifecta', 
    label: 'Sergio Trifecta (VSO)',
    description: 'Validate feelings genuinely, Seek to understand their thinking, Offer to collaborate on solutions'
  },
  { 
    value: 'svb_process', 
    label: 'SVB Process',
    description: 'Surface their thoughts (what were they thinking?), Validate what they got right, Bridge to better understanding'
  },
  { 
    value: 'respectful_language', 
    label: 'Respectful Language',
    description: 'ASK don\'t tell, HONOR their status (don\'t invoke yours), VALIDATE and explain, presume AGENCY'
  },
  { 
    value: 'transparent_authority', 
    label: 'Transparent Authority',
    description: 'Explains the logic behind rules/expectations early in interaction to build trust'
  },
  { 
    value: 'stress_enhancing', 
    label: 'Stress-Can-Be-Enhancing',
    description: 'Reframes stress as helpful: "Your worry shows you care - that caring is fuel for success"'
  },
  { 
    value: 'self_transcendent', 
    label: 'Self-Transcendent Purpose',
    description: 'Connects to Skills + Personal Benefit + Benefit for Greater Good (helping others)'
  },
  { 
    value: 'belonging_story', 
    label: 'Belonging Story (SCAR)',
    description: 'Struggle is real, Change is possible, Action steps, Ripple effect on their future'
  },
  { 
    value: 'generous_interpretation', 
    label: 'Most Generous Interpretation',
    description: 'Reframes frustrating behavior as attempt to gain status/respect: "What else could be true?"'
  },
  { 
    value: 'notice_differences', 
    label: 'Notice & Value Differences',
    description: 'Acknowledges their unique perspective as valuable: "Your background gives you a valuable lens"'
  },
  { 
    value: 'collaborative_troubleshooting', 
    label: 'Collaborative Troubleshooting',
    description: 'Solves problems together as partners, not by telling them what to do or excusing them'
  }
];

export default function MessageGenerator({ user, classes }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [params, setParams] = useState({
    length: 'medium',
    tone: 'supportive',
    severity: 'moderate',
    relationship: 'established',
    practices: []
  });

  // Get all students in selected class
  const selectedClass = useMemo(() => classes?.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  
  // Fetch student details (names/emails)
  const { data: studentUsers = [] } = useQuery({
    queryKey: ['classStudents', selectedClassId],
    queryFn: async () => {
      if (!selectedClass?.student_ids?.length) return [];
      const users = await base44.entities.User.list();
      return users.filter(u => selectedClass.student_ids.includes(u.id));
    },
    enabled: !!selectedClass?.student_ids?.length,
  });
  
  const { data: studentProfiles = [] } = useQuery({
    queryKey: ['studentProfiles', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      const profile = await base44.entities.UserProfile.filter({ user_id: selectedStudentId });
      return profile;
    },
    enabled: !!selectedStudentId,
  });

  const handleGenerate = async () => {
    if (!input) return;
    
    setIsGenerating(true);
    try {
      const practicesInfo = params.practices.map(p => {
        const practice = MENTOR_PRACTICES.find(pr => pr.value === p);
        return `${practice.label}: ${practice.description}`;
      }).join('\n');

      const studentProfile = studentProfiles[0];
      const studentContext = studentProfile ? `
STUDENT PROFILE CONTEXT:
- Strengths: ${studentProfile.strengths?.join(', ') || 'Not available'}
- Growth Areas: ${studentProfile.growth_areas?.join(', ') || 'Not available'}
- Executive Functioning: ${studentProfile.executive_functioning ? `Response Inhibition (${studentProfile.executive_functioning.response_inhibition}), Working Memory (${studentProfile.executive_functioning.working_memory}), Emotional Control (${studentProfile.executive_functioning.emotional_control}), Task Initiation (${studentProfile.executive_functioning.task_initiation})` : 'Not available'}
- Mindset Profile: ${studentProfile.mindset_appraisal ? `Mentor Mindset (${studentProfile.mindset_appraisal.mentor_mindset_score}), Growth Mindset (${studentProfile.mindset_appraisal.growth_mindset_score})` : 'Not available'}` : '';

      const prompt = `You are a mentor mindset communication expert. Transform the following teacher message using the mentor mindset framework from "10 to 25" by David Yeager.

ORIGINAL MESSAGE:
${input}

PARAMETERS:
- Length: ${params.length}
- Tone: ${params.tone}
- Severity: ${params.severity}
- Relationship: ${params.relationship}
${params.practices.length > 0 ? `\nIDEAL PRACTICES TO USE:\n${practicesInfo}` : ''}
${studentContext}

MENTOR MINDSET PRINCIPLES:
1. HIGH STANDARDS + HIGH SUPPORT (not Enforcer or Protector)
2. Respect their status and autonomy (ages 10-25 hyper-sensitive to being patronized)
3. Transparency Statements: Explain what you're doing and why EARLY in the interaction
4. Respectful Language: ASK don't tell, HONOR their status (don't invoke yours), VALIDATE and explain, presume AGENCY
5. SVB Process: Surface their thinking → Validate what's right → Bridge to better understanding
6. Sergio Trifecta: Validate feelings → Seek to understand → Offer to collaborate
7. Stress-Can-Be-Enhancing: Reframe stress as helpful, not debilitating
8. Purpose Framework: Connect to Skills + Personal Benefit + Benefit for Greater Good
9. Most Generous Interpretation: Ask "what else could be true?" - see behavior through lens of status/respect needs
10. Belonging Stories (SCAR): Struggle is real, Change is possible, Action steps, Ripple effect

Transform this message to embody the mentor mindset while keeping the teacher's core intention intact. Make it feel genuine, not formulaic.

TRANSFORMED MESSAGE:`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setOutput(result);
    } catch (error) {
      toast.error('Failed to generate message');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success('Message copied!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
            <Wand2 className="w-6 h-6 text-emerald-600" />
            Mentor Mindset Message Generator
          </CardTitle>
          <CardDescription className="text-stone-600">
            Transform your message using mentor mindset practices (High Standards + High Support)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Select Class (Optional)</Label>
              <Select value={selectedClassId} onValueChange={(v) => {
                setSelectedClassId(v);
                setSelectedStudentId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Student for Context (Optional)</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedClass ? "Choose a student..." : "Select a class first"} />
                </SelectTrigger>
                <SelectContent>
                  {studentUsers?.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name || student.full_name || student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStudentId && studentProfiles[0] && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900 mb-2">Student Profile Loaded</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {studentProfiles[0].strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700">Strengths</p>
                        <p className="text-emerald-900">{studentProfiles[0].strengths.slice(0, 2).join(', ')}</p>
                      </div>
                    )}
                    {studentProfiles[0].growth_areas?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700">Growth Areas</p>
                        <p className="text-emerald-900">{studentProfiles[0].growth_areas.slice(0, 2).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedStudentId('')} className="flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>Your Original Message</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type what you want to say to your student(s)..."
              className="h-32 mt-2"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Length</Label>
              <Select value={params.length} onValueChange={(v) => setParams(p => ({...p, length: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tone</Label>
              <Select value={params.tone} onValueChange={(v) => setParams(p => ({...p, tone: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="supportive">Supportive</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="encouraging">Encouraging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity of Issue</Label>
              <Select value={params.severity} onValueChange={(v) => setParams(p => ({...p, severity: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="serious">Serious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Relationship Stage</Label>
              <Select value={params.relationship} onValueChange={(v) => setParams(p => ({...p, relationship: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Student</SelectItem>
                  <SelectItem value="established">Established</SelectItem>
                  <SelectItem value="strong">Strong Bond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              Mentor Mindset Practices to Emphasize
              <Popover>
                <PopoverTrigger>
                  <Info className="w-4 h-4 text-stone-500" />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2 text-sm">
                    {MENTOR_PRACTICES.map(p => (
                      <div key={p.value}>
                        <p className="font-semibold">{p.label}</p>
                        <p className="text-stone-600">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MENTOR_PRACTICES.map(practice => (
                <Button
                  key={practice.value}
                  size="sm"
                  variant={params.practices.includes(practice.value) ? 'default' : 'outline'}
                  onClick={() => {
                    setParams(p => ({
                      ...p,
                      practices: p.practices.includes(practice.value)
                        ? p.practices.filter(pr => pr !== practice.value)
                        : [...p.practices, practice.value]
                    }));
                  }}
                  className={params.practices.includes(practice.value) ? 'bg-emerald-600' : ''}
                >
                  {practice.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!input || isGenerating}
            className="w-full bg-stone-700 hover:bg-stone-800 text-white py-6 shadow-xl rounded-full font-bold border-4 border-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Transform Message
              </>
            )}
          </Button>

          {output && (
            <div className="bg-white rounded-3xl border-4 border-stone-200 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-display font-bold text-stone-900">Transformed Message</Label>
                <Button size="sm" variant="ghost" onClick={copyOutput}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="text-stone-800 whitespace-pre-wrap">{output}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
