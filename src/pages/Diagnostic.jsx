import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Heart, 
  Flame, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import ExecutiveFunctioningSection from '@/components/diagnostic/ExecutiveFunctioningSection';
import MindsetSection from '@/components/diagnostic/MindsetSection';
import MotivationSection from '@/components/diagnostic/MotivationSection';
import DiagnosticResults from '@/components/diagnostic/DiagnosticResults';

const STAGES = ['intro', 'executive_functioning', 'ef_results', 'mindset', 'mindset_results', 'motivation', 'final_results'];

export default function Diagnostic() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stage, setStage] = useState('intro');
  const [gradeLevel, setGradeLevel] = useState('');
  const [satTargetDate, setSatTargetDate] = useState('');
  const [results, setResults] = useState({
    executive_functioning: {},
    mindset_appraisal: {},
    motivation_assessment: {}
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: existingProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existingProfile?.[0]) {
      const p = existingProfile[0];
      if (p.grade_level) setGradeLevel(p.grade_level);
      if (p.sat_target_date) setSatTargetDate(p.sat_target_date);
      if (p.diagnostic_completed && stage === 'intro') {
        setStage('final_results');
        setResults({
          executive_functioning: p.executive_functioning || {},
          mindset_appraisal: p.mindset_appraisal || {},
          motivation_assessment: p.motivation_assessment || {}
        });
      }
    }
  }, [existingProfile]);

  const handleEFComplete = (efResults) => {
    setResults(prev => ({ ...prev, ...efResults }));
    setStage('ef_results');
  };

  const handleMindsetComplete = (mindsetResults) => {
    setResults(prev => ({ ...prev, ...mindsetResults }));
    setStage('mindset_results');
  };

  const handleMotivationComplete = async (motivationResults) => {
    const finalResults = { ...results, ...motivationResults };
    setResults(finalResults);
    
    // Calculate strengths and growth areas
    const efScores = finalResults.executive_functioning || {};
    const sortedSkills = Object.entries(efScores).sort((a, b) => b[1] - a[1]);
    const strengths = sortedSkills.slice(0, 3).map(([skill]) => 
      skill.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
    const growthAreas = sortedSkills.slice(-3).map(([skill]) => 
      skill.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );

    // Save to database
    const profileData = {
      user_id: user.id,
      diagnostic_completed: true,
      executive_functioning: finalResults.executive_functioning,
      mindset_appraisal: finalResults.mindset_appraisal,
      motivation_assessment: finalResults.motivation_assessment,
      strengths,
      growth_areas: growthAreas,
      ...(gradeLevel && { grade_level: gradeLevel }),
      ...(satTargetDate && { sat_target_date: satTargetDate }),
    };

    if (existingProfile?.[0]?.id) {
      await base44.entities.UserProfile.update(existingProfile[0].id, profileData);
    } else {
      await base44.entities.UserProfile.create(profileData);
    }

    // Mark diagnostic assignment as completed if assigned
    const assignments = await base44.entities.StudentAssignmentProgress.filter({
      student_id: user.id
    });
    const diagnosticAssignments = assignments.filter(a => {
      const assignmentData = base44.entities.Assignment.filter({ id: a.assignment_id });
      return assignmentData && assignmentData[0]?.assignment_type === 'diagnostic';
    });
    for (const assignment of diagnosticAssignments) {
      await base44.entities.StudentAssignmentProgress.update(assignment.id, {
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      });
    }

    setStage('final_results');
  };

  const handleFinalComplete = () => {
    navigate(createPageUrl('Dashboard'));
  };

  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto text-center"
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
        Welcome to Your Learner's Profile
      </h1>
      
      <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
        This short quiz helps us understand how you learn best, 
        so we can personalize your entire LeapOn experience.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Brain className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Learning Skills</h3>
            <p className="text-sm text-gray-500">
              Discover your strengths and areas for growth
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-100 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Heart className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Mindset</h3>
            <p className="text-sm text-gray-500">
              Understand your approach to challenges and growth
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_4px_20px_rgb(16,185,129,0.12)]">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Flame className="w-7 h-7 text-stone-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Motivation</h3>
            <p className="text-sm text-gray-500">
              Uncover what drives you and how to build habits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grade level + SAT date */}
      <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 mb-6 text-left max-w-xl mx-auto space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          Quick Setup (optional)
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-700 mb-1 block">Current Grade Level</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {["8th", "9th", "10th", "11th", "12th", "Gap Year / Other"].map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Target SAT Date
            </Label>
            <Input
              type="date"
              value={satTargetDate}
              onChange={e => setSatTargetDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>

      <div className="bg-emerald-50 rounded-2xl p-6 mb-8 text-left max-w-xl mx-auto">
        <h3 className="font-semibold text-emerald-800 mb-3">Before You Begin:</h3>
        <ul className="space-y-2 text-sm text-emerald-700">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Find a quiet place where you won't be interrupted</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Answer honestly – there are no right or wrong answers</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>The entire assessment takes about 15-20 minutes</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>You'll see results after each section</span>
          </li>
        </ul>
      </div>

      <Button 
        size="lg"
        onClick={async () => {
          // Save grade/date immediately if provided
          if ((gradeLevel || satTargetDate) && user) {
            const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
            const data = {};
            if (gradeLevel) data.grade_level = gradeLevel;
            if (satTargetDate) data.sat_target_date = satTargetDate;
            if (profiles[0]) {
              await base44.entities.UserProfile.update(profiles[0].id, data);
            } else {
              await base44.entities.UserProfile.create({ user_id: user.id, ...data });
            }
          }
          setStage('executive_functioning');
        }}
        className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
      >
        Build My Learner's Profile
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.div>
  );

  const renderSectionResults = (sectionName, nextStage, color) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl bg-${color}-100 flex items-center justify-center`}>
        <CheckCircle className={`w-10 h-10 text-${color}-600`} />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {sectionName} Complete!
      </h2>
      <p className="text-gray-600 mb-6">
        Great job! Your responses have been saved. Ready for the next section?
      </p>
      <Button 
        size="lg"
        onClick={() => setStage(nextStage)}
        className={`bg-${color}-500 hover:bg-${color}-600 text-white`}
      >
        Continue
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </motion.div>
  );

  return (
    <div className="py-8">
      {stage === 'intro' && renderIntro()}
      
      {stage === 'executive_functioning' && (
        <ExecutiveFunctioningSection 
          onComplete={handleEFComplete}
          onBack={() => setStage('intro')}
        />
      )}
      
      {stage === 'ef_results' && renderSectionResults(
        'Learning Skills',
        'mindset',
        'emerald'
      )}
      
      {stage === 'mindset' && (
        <MindsetSection 
          onComplete={handleMindsetComplete}
          onBack={() => setStage('ef_results')}
        />
      )}
      
      {stage === 'mindset_results' && renderSectionResults(
        'Mindset',
        'motivation',
        'stone'
      )}
      
      {stage === 'motivation' && (
        <MotivationSection 
          onComplete={handleMotivationComplete}
          onBack={() => setStage('mindset_results')}
        />
      )}
      
      {stage === 'final_results' && (
        <DiagnosticResults 
          results={results}
          onComplete={handleFinalComplete}
          onRetake={() => {
            setResults({ executive_functioning: {}, mindset_appraisal: {}, motivation_assessment: {} });
            setStage('intro');
          }}
        />
      )}
    </div>
  );
}
