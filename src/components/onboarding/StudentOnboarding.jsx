import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Brain, Users, CheckCircle, Calendar, GraduationCap, Loader2, Bell, Award } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GRADE_LEVELS = ['8th', '9th', '10th', '11th', '12th', 'Gap Year / Other'];

export default function StudentOnboarding() {
  const [step, setStep] = useState(0);

  // Class join state
  const [joiningClasses, setJoiningClasses] = useState(false);
  const [joinedClasses, setJoinedClasses] = useState([]);

  // Profile state
  const [gradeLevel, setGradeLevel] = useState('');
  const [satTargetDate, setSatTargetDate] = useState('');
  const [satMathScore, setSatMathScore] = useState('');
  const [satEnglishScore, setSatEnglishScore] = useState('');
  const [satMathGoal, setSatMathGoal] = useState('');
  const [satEnglishGoal, setSatEnglishGoal] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderEmail, setReminderEmail] = useState('');
  const [gamificationEnabled, setGamificationEnabled] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u && !reminderEmail) setReminderEmail(u.email);
    }).catch(console.error);
  }, []);

  const AUTO_JOIN_CLASS_NAMES = ['SAT MATH', 'LeapOn Test Teacher'];

  const handleJoinClassesAndContinue = async () => {
    setJoiningClasses(true);
    try {
      const res = await base44.functions.invoke('getJoinableClasses', {});
      const allClasses = res.data?.classes || [];
      const user = await base44.auth.me();

      const matched = allClasses.filter(c =>
        AUTO_JOIN_CLASS_NAMES.some(name => c.class_name.toLowerCase() === name.toLowerCase())
      );

      for (const cls of matched) {
        const fullClasses = await base44.entities.TeacherClass.filter({ join_code: cls.join_code });
        if (!fullClasses?.length) continue;
        const fullCls = fullClasses[0];
        if (!fullCls.student_ids?.includes(user.id)) {
          await base44.entities.TeacherClass.update(fullCls.id, {
            student_ids: [...(fullCls.student_ids || []), user.id],
          });
        }
      }
      setJoinedClasses(matched);
      toast.success('Enrolled in your classes!');
    } catch (e) {
      console.error('Failed to join classes', e);
      toast.error('Failed to enroll. You can join later from your dashboard.');
    }
    setJoiningClasses(false);
    setStep(1);
  };

  const handleSaveProfileAndContinue = async () => {
    setSavingProfile(true);
    try {
      const user = await base44.auth.me();
      // Check for existing profile
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profileData = {};
      if (gradeLevel) profileData.grade_level = gradeLevel;
      if (satTargetDate && satTargetDate !== 'N/A') profileData.sat_target_date = satTargetDate;
      if (satMathScore) profileData.sat_math_score = parseInt(satMathScore, 10);
      if (satEnglishScore) profileData.sat_english_score = parseInt(satEnglishScore, 10);
      if (satMathGoal) profileData.sat_math_goal = parseInt(satMathGoal, 10);
      if (satEnglishGoal) profileData.sat_english_goal = parseInt(satEnglishGoal, 10);

      if (profiles?.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.UserProfile.create({ user_id: user.id, ...profileData });
      }

      // Save StudyStreak for reminders
      const streaks = await base44.entities.StudyStreak.filter({ user_id: user.id });
      const streakData = {
        reminders_enabled: remindersEnabled,
        reminder_email: reminderEmail,
      };
      if (streaks?.length > 0) {
        await base44.entities.StudyStreak.update(streaks[0].id, streakData);
      } else {
        await base44.entities.StudyStreak.create({ user_id: user.id, ...streakData });
      }

      await base44.auth.updateMe({ gamification_enabled: gamificationEnabled });
    } catch (e) {
      console.error('Failed to save profile', e);
    }
    setSavingProfile(false);
    setStep(3);
  };

  const handleFinish = () => {
    window.location.href = createPageUrl('Dashboard');
  };

  const handleGoToDiagnostic = () => {
    window.location.href = createPageUrl('SATDiagnostic');
  };

  const SLIDES = [
    { id: 'join_class' },
    { id: 'profile' },
    { id: 'rewards' },
    { id: 'diagnostic' },
  ];

  const slideId = SLIDES[step]?.id;

  return (
    <div className="max-w-2xl w-full mx-auto">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-emerald-500' : i < step ? 'w-2 bg-emerald-300' : 'w-2 bg-stone-300'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={slideId}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-2 border-emerald-200 shadow-xl bg-white">
            <CardContent className="p-8 md:p-10 text-center">

              {/* --- SLIDE 1: Join a Class --- */}
              {slideId === 'join_class' && (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl text-stone-900 mb-3">
                    Your Classes
                  </h2>
                  <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
                    You'll be automatically enrolled in the following classes.
                  </p>

                  <div className="max-w-sm mx-auto mb-4 space-y-3">
                    {AUTO_JOIN_CLASS_NAMES.map((name) => (
                      <div key={name} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div className="text-left flex-1">
                          <p className="font-semibold text-emerald-800">{name}</p>
                        </div>
                        <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">Auto-enroll</span>
                      </div>
                    ))}
                    <p className="text-xs text-stone-500 mt-2">Click "Enroll & Continue" to join both classes.</p>
                  </div>
                </>
              )}

              {/* --- SLIDE 2: Grade Level & SAT Target --- */}
              {slideId === 'profile' && (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl text-stone-900 mb-3">
                    Tell Us About You
                  </h2>
                  <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
                    This helps us personalize your learning experience.
                  </p>

                  <div className="max-w-sm mx-auto space-y-5 text-left">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">Grade Level</label>
                      <Select value={gradeLevel} onValueChange={setGradeLevel}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select your grade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_LEVELS.map(g => (
                            <SelectItem key={g} value={g}>{g} Grade</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1.5">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Target SAT Date</span>
                      </label>
                      {satTargetDate !== 'N/A' && (
                        <Input
                          type="date"
                          value={satTargetDate}
                          onChange={(e) => setSatTargetDate(e.target.value)}
                          className="w-full"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setSatTargetDate(satTargetDate === 'N/A' ? '' : 'N/A')}
                        className={`mt-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                          satTargetDate === 'N/A'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        {satTargetDate === 'N/A' ? "✓ No date set" : "I don't have a date yet"}
                      </button>
                    </div>

                    {/* Current SAT Scores */}
                    <div className="pt-4 border-t border-stone-100">
                      <p className="text-sm font-medium text-stone-700 mb-2">Current SAT Scores <span className="text-stone-400 font-normal">(optional)</span></p>
                      <p className="text-xs text-stone-400 mb-3">If you've taken the SAT or a practice test, enter your scores below.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Math Score</label>
                          <Input
                            type="number"
                            min="200"
                            max="800"
                            step="10"
                            placeholder="200–800"
                            value={satMathScore}
                            onChange={(e) => setSatMathScore(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">English Score</label>
                          <Input
                            type="number"
                            min="200"
                            max="800"
                            step="10"
                            placeholder="200–800"
                            value={satEnglishScore}
                            onChange={(e) => setSatEnglishScore(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Goal SAT Scores */}
                    <div>
                      <p className="text-sm font-medium text-stone-700 mb-2">Goal SAT Scores <span className="text-stone-400 font-normal">(optional)</span></p>
                      <p className="text-xs text-stone-400 mb-3">What scores are you aiming for?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Math Goal</label>
                          <Input
                            type="number"
                            min="200"
                            max="800"
                            step="10"
                            placeholder="200–800"
                            value={satMathGoal}
                            onChange={(e) => setSatMathGoal(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">English Goal</label>
                          <Input
                            type="number"
                            min="200"
                            max="800"
                            step="10"
                            placeholder="200–800"
                            value={satEnglishGoal}
                            onChange={(e) => setSatEnglishGoal(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="reminders" className="flex flex-col gap-1 cursor-pointer">
                          <span className="font-semibold text-stone-800 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-emerald-600" />
                            Daily Study Reminders
                          </span>
                          <span className="text-xs text-stone-500 font-normal">
                            Get a quick nudge to keep your streak alive.
                          </span>
                        </Label>
                        <Switch
                          id="reminders"
                          checked={remindersEnabled}
                          onCheckedChange={setRemindersEnabled}
                        />
                      </div>
                      <AnimatePresence>
                        {remindersEnabled && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 overflow-hidden"
                          >
                            <Input
                              type="email"
                              placeholder="Where should we send them?"
                              value={reminderEmail}
                              onChange={(e) => setReminderEmail(e.target.value)}
                              className="w-full text-sm"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}

              {/* --- SLIDE 3: Rewards --- */}
              {slideId === 'rewards' && (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl text-stone-900 mb-3">
                    Reward Preferences
                  </h2>
                  <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
                    Choose how you want to be rewarded for your progress. You can change this later in settings.
                  </p>

                  <div className="max-w-sm mx-auto space-y-5 text-left border border-stone-200 rounded-xl p-5 bg-stone-50">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="gamification" className="flex flex-col gap-1 cursor-pointer pr-4">
                        <span className="font-semibold text-stone-800 flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600" />
                          Enable Rewards
                        </span>
                        <span className="text-xs text-stone-500 font-normal">
                          Earn XP, level up, unlock items in the Avatar Shop, and customize your Memory Palace.
                        </span>
                      </Label>
                      <Switch
                        id="gamification"
                        checked={gamificationEnabled}
                        onCheckedChange={setGamificationEnabled}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* --- SLIDE 4: Diagnostic --- */}
              {slideId === 'diagnostic' && (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <h2 style={{ fontFamily: 'Righteous, sans-serif' }} className="text-3xl text-stone-900 mb-3">
                    Take Your Diagnostic
                  </h2>
                  <p className="text-stone-600 leading-relaxed mb-6 max-w-md mx-auto">
                    We'll personalize your learning path based on a quick diagnostic assessment. This helps us understand your strengths and areas for growth.
                  </p>
                  <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
                    {['Adaptive questions that adjust to your level', 'Covers all SAT Math domains', 'Takes about 15-20 minutes'].map((b, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-stone-700">{b}</span>
                      </div>
                    ))}
                  </div>
                  <div className="max-w-sm mx-auto">
                    <Button
                      onClick={handleGoToDiagnostic}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8 py-6 text-lg font-bold w-full"
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      Start Diagnostic Now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <Button
          variant="ghost"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="text-stone-500"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {slideId === 'diagnostic' ? (
          <div /> /* Buttons are inside the card */
        ) : slideId === 'rewards' ? (
          <Button
            onClick={handleSaveProfileAndContinue}
            disabled={savingProfile}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : slideId === 'join_class' ? (
          <Button
            onClick={handleJoinClassesAndContinue}
            disabled={joiningClasses}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            {joiningClasses ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {joiningClasses ? 'Enrolling...' : 'Enroll & Continue'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => setStep(s => s + 1)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
