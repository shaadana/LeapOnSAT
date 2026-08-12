import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Brain, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherDiagnostic() {
  const [user, setUser] = useState(null);
  const [existingProfileId, setExistingProfileId] = useState(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [responses, setResponses] = useState({
    // Demographics
    first_year: '',
    total_years: '',
    teaching_role: '',
    certification: '',
    
    // Life satisfaction (1-7 scale)
    life_ideal: '',
    life_conditions: '',
    life_satisfied: '',
    life_important_things: '',
    life_change_nothing: '',
    
    // Teaching motivation (1-7 scale)
    motivation_subject: '',
    motivation_helping: '',
    motivation_influence: '',
    motivation_schedule: '',
    motivation_other: '',
    
    // Wellbeing
    difficulties_overwhelming: '',
    stress_frequency: '',
    stress_coping: '',
    stress_confidence: '',
    teaching_worth_it: '',
    self_doubt_frequency: '',
    depression_interest: '',
    depression_hopeless: '',
    
    // School climate (1-5 scale)
    principal_comfort: '',
    principal_welfare: '',
    principal_respect: '',
    admin_trust: '',
    teacher_comfort: '',
    teacher_care: '',
    instructional_respect: '',
    
    // Mindset beliefs (1-7 scale)
    fixed_mindset_1: '', // some kids have ability
    fixed_mindset_2: '', // bottom students rarely become high performers
    fixed_mindset_3: '', // people have certain intelligence
    fixed_mindset_4: '', // top math requires talent
    fixed_mindset_5: '', // math person can't change
    fixed_mindset_6: '', // students have certain math ability
    
    // Enforcer beliefs (1-7 scale)
    enforcer_1: '', // adolescents incapable without severe consequences
    enforcer_2: '', // adolescents take advantage without fear
    enforcer_3: '', // adolescents lack self-discipline
    enforcer_4: '', // most important values are obedience
    enforcer_5: '', // need tough teachers
    
    // Protector beliefs (1-7 scale)
    protector_1: '', // can't handle stress/frustration
    protector_2: '', // lack self-discipline for schoolwork
    protector_3: '', // so fragile they'd give up
    protector_4: '', // failure debilitates performance
    protector_5: '', // effects of failure are negative
    
    // Mentor beliefs (1-7 scale)
    mentor_1: '', // can display self-discipline if motivated
    mentor_2: '', // can overcome stress if supported
    mentor_3: '', // show care by choosing difficult material
    
    // First day speech scenarios (1-7 scale)
    speech_learning_math: '',
    speech_struggling: '',
    speech_asking_questions: '',
    speech_revising_work: '',
    speech_tests: '',
    speech_performance: '',
    
    // Open-ended responses
    error_response_1: '',
    error_response_2: '',
    
    // Teaching practices (1-5 scale for likelihood and barriers)
    practice_spaced_likelihood: '',
    practice_spaced_barriers: '',
    practice_explain_likelihood: '',
    practice_explain_barriers: '',
    practice_mistakes_likelihood: '',
    practice_mistakes_barriers: '',
    practice_review_likelihood: '',
    practice_review_barriers: '',
    practice_retrieval_likelihood: '',
    practice_retrieval_barriers: '',
    practice_failure_likelihood: '',
    practice_failure_barriers: '',
    practice_questions_likelihood: '',
    practice_questions_barriers: '',
    practice_earnback_likelihood: '',
    practice_earnback_barriers: '',
    points_back_policy: '',
    
    // Puzzles
    puzzle_general_enjoyment: '',
    puzzle_post_enjoyment: '',
    puzzle_1: '',
    puzzle_2: '',
    puzzle_3: '',
    puzzle_4: '',
    puzzle_5: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type !== 'teacher') {
          navigate(createPageUrl('Dashboard'));
          return;
        }

        // Check for existing profile to support retakes
        const existing = await base44.entities.TeacherProfile.filter({ user_id: userData.id });
        if (existing?.[0]?.id) {
          setExistingProfileId(existing[0].id);
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const updateResponse = (field, value) => {
    setResponses(prev => ({ ...prev, [field]: value }));
  };

  const totalSteps = 10;
  const progress = (step / totalSteps) * 100;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Calculate scores
      const lifeSatisfaction = [
        responses.life_ideal, responses.life_conditions, responses.life_satisfied,
        responses.life_important_things, responses.life_change_nothing
      ].map(r => parseInt(r) || 0);
      const avgLifeSatisfaction = lifeSatisfaction.reduce((a, b) => a + b, 0) / 5;
      
      const fixedMindsetScore = [
        responses.fixed_mindset_1, responses.fixed_mindset_2, responses.fixed_mindset_3,
        responses.fixed_mindset_4, responses.fixed_mindset_5, responses.fixed_mindset_6
      ].map(r => parseInt(r) || 0);
      const avgFixedMindset = fixedMindsetScore.reduce((a, b) => a + b, 0) / 6;
      
      const enforcerScore = [
        responses.enforcer_1, responses.enforcer_2, responses.enforcer_3,
        responses.enforcer_4, responses.enforcer_5
      ].map(r => parseInt(r) || 0);
      const avgEnforcer = (enforcerScore.reduce((a, b) => a + b, 0) / 5 / 7) * 100;
      
      const protectorScore = [
        responses.protector_1, responses.protector_2, responses.protector_3,
        responses.protector_4, responses.protector_5
      ].map(r => parseInt(r) || 0);
      const avgProtector = (protectorScore.reduce((a, b) => a + b, 0) / 5 / 7) * 100;
      
      const mentorScore = [
        responses.mentor_1, responses.mentor_2, responses.mentor_3
      ].map(r => parseInt(r) || 0);
      const avgMentor = (mentorScore.reduce((a, b) => a + b, 0) / 3 / 7) * 100;

      const growthMindsetScore = 100 - ((avgFixedMindset / 7) * 100);
      
      // Assess burnout risk
      const stressMap = { 'Very often': 5, 'Fairly often': 4, 'Sometimes': 3, 'Almost never': 2, 'Never': 1 };
      const copingMap = { 'Extremely well': 5, 'Very well': 4, 'Moderately well': 3, 'Slightly well': 2, 'Not at all': 1 };
      const depMap = { 'Nearly every day': 4, 'More than half the days': 3, 'Several days': 2, 'Not at all': 1 };
      const diffMap = { 'Every day': 5, 'Once a week': 4, 'Several times a month': 3, 'Once or twice a month': 2, 'Never': 1 };
      
      const stressScore = stressMap[responses.stress_frequency] || 3;
      const copingScore = copingMap[responses.stress_coping] || 3;
      const dep1 = depMap[responses.depression_interest] || 1;
      const dep2 = depMap[responses.depression_hopeless] || 1;
      const diffScore = diffMap[responses.difficulties_overwhelming] || 3;
      const burnoutRaw = (stressScore + diffScore + dep1 + dep2 + (6 - copingScore)) / 5;
      const burnoutRisk = burnoutRaw >= 3.5 ? 'high' : burnoutRaw >= 2.5 ? 'moderate' : 'low';

      // Generate comprehensive personalized advice using AI
      const advicePrompt = `You are analyzing a teacher's diagnostic results to write a detailed, warm, and personalized professional growth profile. This is like a personalized report card for their mentorship and wellbeing.

MINDSET SCORES:
- Mentor Mindset Score: ${avgMentor.toFixed(0)}% (high standards + high support — higher is better)
- Enforcer Tendencies: ${avgEnforcer.toFixed(0)}% (high standards, low support — lower is better)
- Protector Tendencies: ${avgProtector.toFixed(0)}% (low standards, high support — lower is better)
- Growth Mindset Score: ${growthMindsetScore.toFixed(0)}% (belief that ability can grow — higher is better)

WELLBEING & BURNOUT:
- Stress Frequency: ${responses.stress_frequency}
- Coping Ability: ${responses.stress_coping}
- Self-Doubt Frequency: ${responses.self_doubt_frequency}
- Teaching Worth It Rating: ${responses.teaching_worth_it}/7
- Difficulties Overwhelming: ${responses.difficulties_overwhelming}
- Depression Screen 1 (loss of interest): ${responses.depression_interest}
- Depression Screen 2 (hopelessness): ${responses.depression_hopeless}
- Assessed Burnout Risk: ${burnoutRisk}

TEACHING MOTIVATION (1-7):
- Love of subject: ${responses.motivation_subject}
- Helping people: ${responses.motivation_helping}
- Positive influence: ${responses.motivation_influence}

TEACHING PRACTICES (1-5 likelihood):
- Spaced practice: ${responses.practice_spaced_likelihood}
- Discuss mistakes openly: ${responses.practice_mistakes_likelihood}
- Open-ended questions: ${responses.practice_questions_likelihood}
- Earn points back (revision): ${responses.practice_earnback_likelihood}
- Explain struggle/support: ${responses.practice_explain_likelihood}
- Productive failure: ${responses.practice_failure_likelihood}

SCHOOL CLIMATE (avg 1-5): Principal trust: ${responses.principal_comfort}, Colleague trust: ${responses.teacher_comfort}

Write a detailed, 4-section profile report:

1. **Your Mentorship Profile** (2-3 sentences): Describe their specific mentor/enforcer/protector balance and what it means in the classroom. Be specific about their scores.

2. **Burnout Risk & Wellbeing** (2-3 sentences): Honestly but compassionately assess their burnout risk based on stress, coping, and wellbeing data. If risk is high, validate their experience and name what's happening. If low, acknowledge what's working.

3. **Your Teaching Superpowers** (bullet list, 3-4 items): Name specific strengths based on their data. Be concrete.

4. **Growth Opportunities & Next Steps** (2-3 sentences + 2-3 specific action items): Name 1-2 specific areas to grow and give concrete, small, actionable next steps rooted in mentor mindset and tiny habits principles. Reference their specific scores.

Tone: warm, honest, collegial. Not generic. This person should feel SEEN. Use "you" language directly.`;

      const advice = await base44.integrations.Core.InvokeLLM({ prompt: advicePrompt });
      
      // Identify strengths and growth areas
      const strengths = [];
      const growthAreas = [];
      
      if (avgMentor >= 70) strengths.push('Strong mentor mindset');
      else if (avgMentor >= 50) strengths.push('Developing mentor mindset');
      if (parseInt(responses.practice_questions_likelihood) >= 4) strengths.push('Uses open-ended questions');
      if (parseInt(responses.practice_mistakes_likelihood) >= 4) strengths.push('Normalizes mistakes in learning');
      if (growthMindsetScore >= 70) strengths.push('Strong growth mindset beliefs');
      if (parseInt(responses.motivation_helping) >= 6) strengths.push('Deep care for student wellbeing');
      if (parseInt(responses.motivation_influence) >= 6) strengths.push('Purpose-driven educator');
      if (parseInt(responses.practice_explain_likelihood) >= 4) strengths.push('Transparent about learning design');
      if (parseInt(responses.teacher_comfort) >= 4) strengths.push('Strong collegial support network');
      if (copingScore >= 4) strengths.push('Effective stress management');
      
      if (avgEnforcer >= 60) growthAreas.push('Reduce enforcer tendencies — balance high standards with more support');
      if (avgProtector >= 60) growthAreas.push('Raise expectations — balance support with higher standards');
      if (parseInt(responses.practice_earnback_likelihood) <= 2) growthAreas.push('Create revision/redemption opportunities for students');
      if (growthMindsetScore < 50) growthAreas.push('Develop growth mindset beliefs about student potential');
      if (burnoutRisk === 'high') growthAreas.push('Prioritize personal wellbeing and burnout prevention');
      if (burnoutRisk === 'moderate') growthAreas.push('Build sustainable stress-management habits');
      if (stressScore >= 4 && copingScore <= 2) growthAreas.push('Develop coping strategies for high-stress periods');
      if (parseInt(responses.principal_comfort) <= 2 && parseInt(responses.teacher_comfort) <= 2) growthAreas.push('Build stronger support connections at school');

      // Create profile
      const profileData = {
        user_id: user.id,
        diagnostic_completed: true,
        teaching_background: {
          first_year: parseInt(responses.first_year) || null,
          total_years: parseInt(responses.total_years) || null,
          teaching_role: responses.teaching_role,
          certification: responses.certification
        },
        life_satisfaction: {
          overall_score: avgLifeSatisfaction,
          responses: lifeSatisfaction
        },
        teaching_motivation: {
          subject_love: parseInt(responses.motivation_subject) || 0,
          helping_people: parseInt(responses.motivation_helping) || 0,
          positive_influence: parseInt(responses.motivation_influence) || 0,
          flexible_schedule: parseInt(responses.motivation_schedule) || 0,
          other_reasons: responses.motivation_other
        },
        wellbeing: {
          stress_frequency: responses.stress_frequency,
          coping_ability: responses.stress_coping,
          stress_confidence: responses.stress_confidence,
          teaching_worth_it: parseInt(responses.teaching_worth_it) || 0,
          self_doubt_frequency: responses.self_doubt_frequency,
          difficulties_overwhelming: responses.difficulties_overwhelming,
          depression_screen_1: responses.depression_interest,
          depression_screen_2: responses.depression_hopeless
        },
        school_climate: {
          principal_comfort: parseInt(responses.principal_comfort) || 0,
          principal_welfare: parseInt(responses.principal_welfare) || 0,
          principal_respect: parseInt(responses.principal_respect) || 0,
          admin_trust: parseInt(responses.admin_trust) || 0,
          teacher_comfort: parseInt(responses.teacher_comfort) || 0,
          teacher_care: parseInt(responses.teacher_care) || 0,
          instructional_leadership_respect: parseInt(responses.instructional_respect) || 0
        },
        mindset_beliefs: {
          growth_mindset_score: growthMindsetScore,
          fixed_mindset_score: (avgFixedMindset / 7) * 100,
          enforcer_tendencies: avgEnforcer,
          protector_tendencies: avgProtector,
          mentor_mindset_score: avgMentor,
          responses: []
        },
        teaching_practices: {
          spaced_practice_likelihood: parseInt(responses.practice_spaced_likelihood) || 0,
          spaced_practice_barriers: parseInt(responses.practice_spaced_barriers) || 0,
          explain_struggle_support_likelihood: parseInt(responses.practice_explain_likelihood) || 0,
          explain_struggle_support_barriers: parseInt(responses.practice_explain_barriers) || 0,
          discuss_mistakes_likelihood: parseInt(responses.practice_mistakes_likelihood) || 0,
          discuss_mistakes_barriers: parseInt(responses.practice_mistakes_barriers) || 0,
          review_after_exam_likelihood: parseInt(responses.practice_review_likelihood) || 0,
          review_after_exam_barriers: parseInt(responses.practice_review_barriers) || 0,
          retrieval_practice_likelihood: parseInt(responses.practice_retrieval_likelihood) || 0,
          retrieval_practice_barriers: parseInt(responses.practice_retrieval_barriers) || 0,
          productive_failure_likelihood: parseInt(responses.practice_failure_likelihood) || 0,
          productive_failure_barriers: parseInt(responses.practice_failure_barriers) || 0,
          open_ended_questions_likelihood: parseInt(responses.practice_questions_likelihood) || 0,
          open_ended_questions_barriers: parseInt(responses.practice_questions_barriers) || 0,
          earn_points_back_likelihood: parseInt(responses.practice_earnback_likelihood) || 0,
          earn_points_back_barriers: parseInt(responses.practice_earnback_barriers) || 0,
          points_back_policy: responses.points_back_policy
        },
        scenario_responses: {
          learning_math_statement: parseInt(responses.speech_learning_math) || 0,
          struggling_statement: parseInt(responses.speech_struggling) || 0,
          asking_questions_statement: parseInt(responses.speech_asking_questions) || 0,
          revising_work_statement: parseInt(responses.speech_revising_work) || 0,
          tests_statement: parseInt(responses.speech_tests) || 0,
          student_performance_statement: parseInt(responses.speech_performance) || 0,
          student_error_response_1: responses.error_response_1,
          student_error_response_2: responses.error_response_2
        },
        puzzle_assessment: {
          general_enjoyment: responses.puzzle_general_enjoyment,
          post_puzzle_enjoyment: responses.puzzle_post_enjoyment,
          puzzle_answers: [
            responses.puzzle_1, responses.puzzle_2, responses.puzzle_3,
            responses.puzzle_4, responses.puzzle_5
          ]
        },
        strengths,
        growth_areas: growthAreas,
        personalized_advice: advice
      };

      if (existingProfileId) {
        await base44.entities.TeacherProfile.update(existingProfileId, profileData);
      } else {
        await base44.entities.TeacherProfile.create(profileData);
      }
      navigate(createPageUrl('TeacherProfile'));
    } catch (error) {
      console.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const likertScale7 = [
    { value: '7', label: 'Strongly agree' },
    { value: '6', label: 'Agree' },
    { value: '5', label: 'Slightly agree' },
    { value: '4', label: 'Neither agree nor disagree' },
    { value: '3', label: 'Slightly disagree' },
    { value: '2', label: 'Disagree' },
    { value: '1', label: 'Strongly disagree' }
  ];

  const likertScale5 = [
    { value: '5', label: 'A great deal' },
    { value: '4', label: 'A lot' },
    { value: '3', label: 'A moderate amount' },
    { value: '2', label: 'A little bit' },
    { value: '1', label: 'Not at all' }
  ];

  const effectiveness7 = [
    { value: '7', label: 'Extremely effective' },
    { value: '6', label: 'Very effective' },
    { value: '5', label: 'Slightly effective' },
    { value: '4', label: 'Neither effective nor ineffective' },
    { value: '3', label: 'Slightly ineffective' },
    { value: '2', label: 'Very ineffective' },
    { value: '1', label: 'Extremely ineffective' }
  ];

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>What was the first year you were a classroom instructor of record?</Label>
              <Input
                type="number"
                value={responses.first_year}
                onChange={(e) => updateResponse('first_year', e.target.value)}
                placeholder="e.g., 2020"
                className="mt-2"
              />
            </div>
            <div>
              <Label>What is the total number of years you have been a classroom instructor of record?</Label>
              <Input
                type="number"
                value={responses.total_years}
                onChange={(e) => updateResponse('total_years', e.target.value)}
                placeholder="e.g., 5"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Which best describes your current teaching role?</Label>
              <RadioGroup value={responses.teaching_role} onValueChange={(v) => updateResponse('teaching_role', v)} className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full_time" id="full_time" />
                  <Label htmlFor="full_time" className="font-normal cursor-pointer">Regular full-time teacher (any grades K-12)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="part_time" id="part_time" />
                  <Label htmlFor="part_time" className="font-normal cursor-pointer">Regular part-time teacher (any grades K-12)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="itinerant" id="itinerant" />
                  <Label htmlFor="itinerant" className="font-normal cursor-pointer">Itinerant teacher (multiple schools)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="substitute" id="substitute" />
                  <Label htmlFor="substitute" className="font-normal cursor-pointer">Long-term substitute</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">Other</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600">Read each statement and choose the response that best matches your opinion.</p>
            
            {[
              { field: 'life_ideal', text: 'In most ways my life is close to my ideal.' },
              { field: 'life_conditions', text: 'The conditions of my life are excellent.' },
              { field: 'life_satisfied', text: 'I am satisfied with my life.' },
              { field: 'life_important_things', text: 'So far I have gotten the important things I want in life.' },
              { field: 'life_change_nothing', text: 'If I could live my life over, I would change almost nothing.' }
            ].map((item) => (
              <div key={item.field}>
                <Label className="text-stone-800 font-medium">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-2 space-y-1">
                  {likertScale7.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600">To what extent do you agree with each of these reasons for being a teacher?</p>
            
            {[
              { field: 'motivation_subject', text: 'One of my main reasons for being a teacher is because I love the subject of math.' },
              { field: 'motivation_helping', text: 'One of my main reasons for being a teacher is because I care about helping people and contributing to my community or society.' },
              { field: 'motivation_influence', text: 'One of my main reasons for being a teacher is because I want to be a positive influence on youth in my community or society.' },
              { field: 'motivation_schedule', text: 'One of my main reasons for being a teacher is because of the flexible schedule.' }
            ].map((item) => (
              <div key={item.field}>
                <Label className="text-stone-800 font-medium">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-2 space-y-1">
                  {likertScale7.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
            
            <div>
              <Label>Are there any other important reasons why you are a teacher?</Label>
              <Textarea
                value={responses.motivation_other}
                onChange={(e) => updateResponse('motivation_other', e.target.value)}
                placeholder="If so, write them briefly..."
                className="mt-2 h-24"
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600">Questions about your wellbeing and work environment</p>
            
            <div>
              <Label className="text-stone-800 font-medium">How often, if ever, did you feel like difficulties were piling up so high that you could not overcome them?</Label>
              <RadioGroup value={responses.difficulties_overwhelming} onValueChange={(v) => updateResponse('difficulties_overwhelming', v)} className="mt-2 space-y-1">
                {['Every day', 'Once a week', 'Several times a month', 'Once or twice a month', 'Never'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`diff_${option}`} />
                    <Label htmlFor={`diff_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-stone-800 font-medium">From the beginning of this school year until now, how often has your work been stressful?</Label>
              <RadioGroup value={responses.stress_frequency} onValueChange={(v) => updateResponse('stress_frequency', v)} className="mt-2 space-y-1">
                {['Very often', 'Fairly often', 'Sometimes', 'Almost never', 'Never'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`stress_${option}`} />
                    <Label htmlFor={`stress_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-stone-800 font-medium">How well are you coping with the stress of your job right now?</Label>
              <RadioGroup value={responses.stress_coping} onValueChange={(v) => updateResponse('stress_coping', v)} className="mt-2 space-y-1">
                {['Extremely well', 'Very well', 'Moderately well', 'Slightly well', 'Not well at all'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`coping_${option}`} />
                    <Label htmlFor={`coping_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-stone-800 font-medium">How confident are you that you could handle the stresses of your job right now?</Label>
              <RadioGroup value={responses.stress_confidence} onValueChange={(v) => updateResponse('stress_confidence', v)} className="mt-2 space-y-1">
                {['Extremely confident', 'Very confident', 'Moderately confident', 'Slightly confident', 'Not at all confident'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`conf_${option}`} />
                    <Label htmlFor={`conf_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-stone-800 font-medium">"The stress and disappointments involved in teaching aren't really worth it."</Label>
              <RadioGroup value={responses.teaching_worth_it} onValueChange={(v) => updateResponse('teaching_worth_it', v)} className="mt-2 space-y-1">
                {likertScale7.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`worth_${option.value}`} />
                    <Label htmlFor={`worth_${option.value}`} className="font-normal cursor-pointer">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-stone-800 font-medium">How often did you wonder, "Maybe I shouldn't be a math teacher"?</Label>
              <RadioGroup value={responses.self_doubt_frequency} onValueChange={(v) => updateResponse('self_doubt_frequency', v)} className="mt-2 space-y-1">
                {['Very often', 'Fairly often', 'Sometimes', 'Almost never', 'Never'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`doubt_${option}`} />
                    <Label htmlFor={`doubt_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <p className="text-sm text-stone-600 mt-6">Over the last 2 weeks, how often have you been bothered by:</p>
            
            <div>
              <Label className="text-stone-800 font-medium">Little interest or pleasure in doing things</Label>
              <RadioGroup value={responses.depression_interest} onValueChange={(v) => updateResponse('depression_interest', v)} className="mt-2 space-y-1">
                {['Nearly every day', 'More than half the days', 'Several days', 'Not at all'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`int_${option}`} />
                    <Label htmlFor={`int_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-stone-800 font-medium">Feeling down, depressed, or hopeless</Label>
              <RadioGroup value={responses.depression_hopeless} onValueChange={(v) => updateResponse('depression_hopeless', v)} className="mt-2 space-y-1">
                {['Nearly every day', 'More than half the days', 'Several days', 'Not at all'].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`hope_${option}`} />
                    <Label htmlFor={`hope_${option}`} className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600">To what extent do you agree with these statements about your school?</p>
            
            {[
              { field: 'principal_comfort', text: 'To what extent do you feel comfortable discussing your feelings, worries, or frustrations with the principal in your school?' },
              { field: 'principal_welfare', text: 'To what extent do you feel the principal in your school looks out for the personal welfare of the math teachers?' },
              { field: 'principal_respect', text: 'To what extent do you feel respected by the principal in your school?' },
              { field: 'admin_trust', text: 'To what extent can you trust your school district\'s administrators to keep their word?' },
              { field: 'teacher_comfort', text: 'To what extent do you feel comfortable discussing your feelings, worries, and frustrations with other teachers in your school?' },
              { field: 'teacher_care', text: 'To what extent do teachers in your school really care about each other?' },
              { field: 'instructional_respect', text: 'To what extent do teachers at your school respect other teachers who take the lead on efforts to improve the school\'s instruction?' }
            ].map((item) => (
              <div key={item.field}>
                <Label className="text-stone-800 font-medium">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-2 space-y-1">
                  {likertScale5.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer text-sm">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        );
      
      case 7:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600 font-semibold">Beliefs about student potential and learning. To what extent do you agree?</p>
            
            {[
              { field: 'fixed_mindset_1', text: 'There\'s a lot of talk about things like grit or growth mindset, but deep down an experienced teacher knows that some kids have the ability to excel and others don\'t.' },
              { field: 'fixed_mindset_2', text: 'A student who starts the beginning of the year near the bottom of the class rarely ever has the potential to become a high performer.' },
              { field: 'fixed_mindset_3', text: 'People have a certain amount of intelligence, and they really can\'t do much to change it.' },
              { field: 'fixed_mindset_4', text: 'Being a top math student requires a special talent that just can\'t be taught.' },
              { field: 'fixed_mindset_5', text: 'Being a "math person" or not is something about you that you really can\'t change.' },
              { field: 'fixed_mindset_6', text: 'Students have a certain amount of math ability and they really can\'t do much to change it.' }
            ].map((item) => (
              <div key={item.field}>
                <Label className="text-stone-800 font-medium">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-2 space-y-1">
                  {likertScale7.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer text-sm">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        );
      
      case 8:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600 font-semibold">Beliefs about adolescent behavior</p>
            
            {[
              { field: 'enforcer_1', text: 'Most adolescents are incapable of behaving correctly unless there are severe consequences for disobedience.' },
              { field: 'enforcer_2', text: 'Most adolescents will take advantage of their teachers if they don\'t fear punishment for immature behavior.' },
              { field: 'enforcer_3', text: 'Most adolescents lack the self-discipline to care more about their schoolwork than their social lives.' },
              { field: 'enforcer_4', text: 'The most important values students should learn in school are obedience and respect for authority.' },
              { field: 'enforcer_5', text: 'Students need tough teachers to teach them how to be disciplined and grow up the right way.' },
              { field: 'protector_1', text: 'Most adolescents can\'t handle the stress or frustration of trying to understand challenging assignments in school.' },
              { field: 'protector_2', text: 'Most adolescents lack the self-discipline to care more about their schoolwork than their social lives.' },
              { field: 'protector_3', text: 'Most adolescents are so fragile that they would lose their confidence and give up if they struggled in math class.' },
              { field: 'protector_4', text: 'When adolescents experience failure or difficulty, it seriously harms their confidence and performance.' },
              { field: 'protector_5', text: 'The effects of failure on students are negative and should be avoided.' },
              { field: 'mentor_1', text: 'Adolescents can display remarkable self-discipline if the classroom environment properly motivates them.' },
              { field: 'mentor_2', text: 'Adolescents can overcome even high levels of stress and frustration if a teacher properly supports them.' },
              { field: 'mentor_3', text: 'The way a teacher can show that they care about and respect a student is by choosing difficult material that makes them think hard.' }
            ].map((item) => (
              <div key={item.field}>
                <Label className="text-stone-800 font-medium text-sm">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-2 space-y-1">
                  {likertScale7.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer text-sm">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        );
      
      case 9:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600 font-semibold">Imagine a first-year teacher's first day speech. Rate how effective each statement is:</p>
            
            {[
              { field: 'speech_learning_math', text: 'About learning math: "Math is challenging for a lot of people, and this is going to be a hard class. Math is basically a set of facts and techniques that you need to learn to solve problems. I will tell you the right facts and techniques for solving each kind of problem. It will be up to you to remember them."' },
              { field: 'speech_struggling', text: 'About struggling: "Even though the material may not click right away, anybody is capable of learning it. If you struggle at first, remember that you may just not be trying hard enough. If you are willing to work hard and be persistent, you will understand the material eventually."' },
              { field: 'speech_asking_questions', text: 'About questions: "If you don\'t understand something I\'ve already taught you, please don\'t ask questions until after class. I\'ve found that these questions can slow down the students that are staying on track."' },
              { field: 'speech_revising_work', text: 'About revisions: "When you turn in assignments, whatever grade you get will be final. I know you can do a great job on the assignments the first time if you put in the work, so you will not get a second chance."' },
              { field: 'speech_tests', text: 'About tests: "In my class, I will give you three tests and a final exam. You cannot make up for problems missed on previous tests, so make sure you\'re prepared for each test."' },
              { field: 'speech_performance', text: 'About performance: "Students usually know where they stand in this class after the first one or two exams. Students who do the best at the beginning of the year are typically the same ones who do well at the end."' }
            ].map((item) => (
              <div key={item.field} className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <Label className="text-stone-800 text-sm leading-relaxed">{item.text}</Label>
                <RadioGroup value={responses[item.field]} onValueChange={(v) => updateResponse(item.field, v)} className="mt-3 space-y-1">
                  {effectiveness7.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${item.field}_${option.value}`} />
                      <Label htmlFor={`${item.field}_${option.value}`} className="font-normal cursor-pointer text-sm">{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        );
      
      case 10:
        return (
          <div className="space-y-6">
            <p className="text-sm text-stone-600 font-semibold">Teaching practices and likelihood of use</p>
            
            {[
              { 
                likelihood: 'practice_spaced_likelihood', 
                barriers: 'practice_spaced_barriers',
                text: 'Design assignments and quizzes so that concepts are mixed up and spaced out over multiple weeks or months, rather than focusing on practicing and mastering one skill at a time.'
              },
              {
                likelihood: 'practice_explain_likelihood',
                barriers: 'practice_explain_barriers',
                text: 'From the start of the year, spend time explaining to students how your class is designed to help them be successful when they are struggling.'
              },
              {
                likelihood: 'practice_mistakes_likelihood',
                barriers: 'practice_mistakes_barriers',
                text: 'Spend class time encouraging students to reveal and discuss their mistakes with the teacher or classmates.'
              },
              {
                likelihood: 'practice_questions_likelihood',
                barriers: 'practice_questions_barriers',
                text: 'Spend class time asking open-ended questions to uncover what a student was thinking when they made a mistake.'
              }
            ].map((item, idx) => (
              <div key={idx} className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                <p className="text-sm text-stone-800 font-medium mb-4">{item.text}</p>
                
                <div className="mb-4">
                  <Label className="text-xs text-stone-600">How likely are you to use this practice next school year?</Label>
                  <RadioGroup value={responses[item.likelihood]} onValueChange={(v) => updateResponse(item.likelihood, v)} className="mt-2 space-y-1">
                    {['Extremely likely', 'Very likely', 'Moderately likely', 'Slightly likely', 'Not at all likely'].map((option, i) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(5-i)} id={`${item.likelihood}_${5-i}`} />
                        <Label htmlFor={`${item.likelihood}_${5-i}`} className="font-normal cursor-pointer text-sm">{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label className="text-xs text-stone-600">How often will something get in the way?</Label>
                  <RadioGroup value={responses[item.barriers]} onValueChange={(v) => updateResponse(item.barriers, v)} className="mt-2 space-y-1">
                    {['Always', 'Often', 'Sometimes', 'Rarely', 'Never'].map((option, i) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(5-i)} id={`${item.barriers}_${5-i}`} />
                        <Label htmlFor={`${item.barriers}_${5-i}`} className="font-normal cursor-pointer text-sm">{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return <div>Profile complete</div>;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl">
        <CardHeader className="bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
                <Brain className="w-6 h-6 text-emerald-600" />
                Teaching Style Profile
              </CardTitle>
              <CardDescription className="text-stone-600">
                Understand your teaching style and get personalized growth recommendations
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-stone-600">Step {step} of {totalSteps}</p>
              <p className="text-2xl font-bold text-emerald-600">{Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>
        
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
            {step > 1 && (
              <Button
                onClick={() => setStep(step - 1)}
                variant="outline"
                className="border-stone-300"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="ml-auto bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="ml-auto bg-stone-700 hover:bg-stone-800 shadow-xl rounded-full font-bold border-4 border-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Complete My Profile'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
