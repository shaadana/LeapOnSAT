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

const PARENTING_PRACTICES = [
  {
    value: 'wise_feedback',
    label: 'Wise Feedback',
    description: 'Combine high standards with belief: "I\'m giving you this feedback because I have high standards and I know you can reach them"'
  },
  {
    value: 'growth_mindset',
    label: 'Growth Mindset',
    description: 'Frame challenges as opportunities: "You haven\'t learned this yet, but with effort you will"'
  },
  {
    value: 'validate_emotions',
    label: 'Validate Emotions',
    description: 'Acknowledge feelings first: "I see this is frustrating for you"'
  },
  {
    value: 'ask_dont_tell',
    label: 'Ask Don\'t Tell',
    description: 'Guide discovery through questions instead of giving answers'
  },
  {
    value: 'belonging',
    label: 'Sense of Belonging',
    description: 'Connect struggles to shared human experience: "Everyone struggles sometimes"'
  },
  {
    value: 'purpose',
    label: 'Purpose Connection',
    description: 'Connect to why skills matter beyond grades: "This helps you achieve your goals"'
  },
  {
    value: 'autonomy',
    label: 'Respect Autonomy',
    description: 'Honor their independence: "I trust you to figure this out"'
  },
  {
    value: 'effort_praise',
    label: 'Praise Effort',
    description: 'Focus on process, not ability: "Your hard work really paid off"'
  },
];

export default function ParentMentorshipHelper({ families }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [params, setParams] = useState({
    tone: 'supportive',
    situation: 'general',
    practices: []
  });

  const selectedFamily = useMemo(() => families?.find(f => f.id === selectedFamilyId), [families, selectedFamilyId]);

  const { data: childUsers = [] } = useQuery({
    queryKey: ['childUsers', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamily?.child_ids?.length) return [];
      const users = await base44.entities.User.list();
      return users.filter(u => selectedFamily.child_ids.includes(u.id));
    },
    enabled: !!selectedFamily?.child_ids?.length,
  });

  const { data: childProfiles = [] } = useQuery({
    queryKey: ['childProfiles', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const profile = await base44.entities.UserProfile.filter({ user_id: selectedChildId });
      return profile;
    },
    enabled: !!selectedChildId,
  });

  const handleGenerate = async () => {
    if (!input) return;

    setIsGenerating(true);
    try {
      const practicesInfo = params.practices.map(p => {
        const practice = PARENTING_PRACTICES.find(pr => pr.value === p);
        return `${practice.label}: ${practice.description}`;
      }).join('\n');

      const childProfile = childProfiles[0];
      const childContext = childProfile ? `
CHILD PROFILE CONTEXT:
- Strengths: ${childProfile.strengths?.join(', ') || 'Not available'}
- Growth Areas: ${childProfile.growth_areas?.join(', ') || 'Not available'}
- Motivation Level: ${childProfile.motivation_assessment ? `Intrinsic (${childProfile.motivation_assessment.intrinsic_motivation}), Extrinsic (${childProfile.motivation_assessment.extrinsic_motivation})` : 'Not available'}` : '';

      const prompt = `You are a parenting coach who specializes in mentor mindset parenting. Transform the following parent message using evidence-based parenting practices that build high standards + high support.

ORIGINAL MESSAGE:
${input}

PARAMETERS:
- Tone: ${params.tone}
- Situation: ${params.situation}
${params.practices.length > 0 ? `\nPARENTING PRACTICES TO EMPHASIZE:\n${practicesInfo}` : ''}
${childContext}

MENTOR MINDSET PARENTING PRINCIPLES:
1. HIGH STANDARDS + HIGH SUPPORT (not harsh expectations or permissiveness)
2. Respect their autonomy and growing independence
3. Validate their emotions before problem-solving
4. Ask questions to guide their thinking, don't just tell
5. Frame challenges as growth opportunities
6. Praise effort and process, not just outcomes
7. Connect learning to their purposes and goals
8. Communicate belief in their ability to improve
9. Help them see struggles as normal and temporary
10. Build sense of belonging and family connection

Transform this message to embody mentor mindset parenting while keeping the parent's intent intact. Make it feel genuine, warm, and supportive.

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
            Supportive Parenting Message Helper
          </CardTitle>
          <CardDescription className="text-stone-600">
            Craft messages that combine high expectations with genuine belief in your child
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Select Family (Optional)</Label>
              <Select value={selectedFamilyId} onValueChange={(v) => {
                setSelectedFamilyId(v);
                setSelectedChildId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a family..." />
                </SelectTrigger>
                <SelectContent>
                  {families?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.family_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Child for Context (Optional)</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId} disabled={!selectedFamily}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedFamily ? "Choose a child..." : "Select a family first"} />
                </SelectTrigger>
                <SelectContent>
                  {childUsers?.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.full_name || child.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedChildId && childProfiles[0] && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-emerald-900 mb-2">Child Profile Loaded</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {childProfiles[0].strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700">Strengths</p>
                        <p className="text-emerald-900">{childProfiles[0].strengths.slice(0, 2).join(', ')}</p>
                      </div>
                    )}
                    {childProfiles[0].growth_areas?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700">Growth Areas</p>
                        <p className="text-emerald-900">{childProfiles[0].growth_areas.slice(0, 2).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedChildId('')} className="flex-shrink-0">
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
              placeholder="Type what you want to say to your child..."
              className="h-32 mt-2"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tone</Label>
              <Select value={params.tone} onValueChange={(v) => setParams(p => ({...p, tone: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">Warm & Loving</SelectItem>
                  <SelectItem value="supportive">Supportive</SelectItem>
                  <SelectItem value="calm">Calm & Measured</SelectItem>
                  <SelectItem value="encouraging">Encouraging</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Situation</Label>
              <Select value={params.situation} onValueChange={(v) => setParams(p => ({...p, situation: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Encouragement</SelectItem>
                  <SelectItem value="struggle">Child Struggling</SelectItem>
                  <SelectItem value="mistake">After a Mistake</SelectItem>
                  <SelectItem value="achievement">Celebrating Achievement</SelectItem>
                  <SelectItem value="conflict">After Disagreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              Parenting Practices to Emphasize
              <Popover>
                <PopoverTrigger>
                  <Info className="w-4 h-4 text-stone-500" />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2 text-sm">
                    {PARENTING_PRACTICES.map(p => (
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
              {PARENTING_PRACTICES.map(practice => (
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
