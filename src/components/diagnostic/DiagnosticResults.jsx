import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  Flame, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Calendar,
  Trophy,
  LayoutGrid,
  Clock,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const EF_SKILL_LABELS = {
  response_inhibition: "Response Inhibition",
  working_memory: "Working Memory",
  emotional_control: "Emotional Control",
  task_initiation: "Task Initiation",
  sustained_attention: "Sustained Attention",
  planning_prioritization: "Planning & Prioritization",
  organization: "Organization",
  time_management: "Time Management",
  flexibility: "Flexibility",
  metacognition: "Metacognition",
  goal_directed_persistence: "Goal-Directed Persistence",
  stress_tolerance: "Stress Tolerance"
};

export default function DiagnosticResults({ results, onComplete, onRetake }) {
  const { executive_functioning, mindset_appraisal, motivation_assessment } = results;

  // Sort EF skills
  const sortedEFSkills = Object.entries(executive_functioning || {})
    .sort((a, b) => b[1] - a[1]);
  
  const topStrengths = sortedEFSkills.slice(0, 3);
  const growthAreas = sortedEFSkills.slice(-3).reverse();

  // Calculate overall scores for visualization
  const efAverage = sortedEFSkills.length > 0 
    ? Math.round(sortedEFSkills.reduce((sum, [_, score]) => sum + score, 0) / sortedEFSkills.length / 21 * 100)
    : 50;

  const mindsetScore = mindset_appraisal?.mentor_mindset_score || 50;
  const motivationScore = Math.round(
    ((motivation_assessment?.intrinsic_motivation || 50) + 
     (motivation_assessment?.ability_confidence || 50) +
     (motivation_assessment?.self_transcendent_purpose || 50)) / 3
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Learner's Profile is Ready!</h1>
        <p className="text-gray-600">Here's a personalized snapshot of how you learn</p>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6 text-center">
            <Brain className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-emerald-700 mb-1">Learning Skills</p>
            <p className="text-3xl font-bold text-emerald-800">{efAverage}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-stone-50 to-stone-100 border-stone-200">
          <CardContent className="p-6 text-center">
            <Heart className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <p className="text-sm text-stone-700 mb-1">Mindset</p>
            <p className="text-3xl font-bold text-stone-800">{mindsetScore}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6 text-center">
            <Flame className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-emerald-700 mb-1">Motivation</p>
            <p className="text-3xl font-bold text-emerald-800">{motivationScore}%</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Executive Functioning Details */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/90 backdrop-blur border-emerald-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Brain className="w-5 h-5 text-emerald-600" />
              Your Learning Skills Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-emerald-700">Top Strengths</h3>
                </div>
                <div className="space-y-3">
                  {topStrengths.map(([skill, score], index) => (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{EF_SKILL_LABELS[skill]}</span>
                        <span className="font-medium text-emerald-600">{Math.round(score / 21 * 100)}%</span>
                      </div>
                      <Progress value={score / 21 * 100} className="h-2 bg-emerald-100" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth Areas */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-amber-700">Growth Areas</h3>
                </div>
                <div className="space-y-3">
                  {growthAreas.map(([skill, score], index) => (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">{EF_SKILL_LABELS[skill]}</span>
                        <span className="font-medium text-amber-600">{Math.round(score / 21 * 100)}%</span>
                      </div>
                      <Progress value={score / 21 * 100} className="h-2 bg-amber-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Motivation Insights */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/90 backdrop-blur border-stone-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Flame className="w-5 h-5 text-emerald-600" />
              Motivation Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-900 mb-1">Intrinsic Motivation</p>
                <p className="text-xs text-emerald-700 mb-2 min-h-8">How much you learn because you actually want to learn.</p>
                <p className="text-3xl font-display font-bold text-emerald-700 mb-2">
                  {motivation_assessment?.intrinsic_motivation || 50}%
                </p>
                <Progress value={motivation_assessment?.intrinsic_motivation || 50} className="h-2 bg-emerald-200" />
              </div>
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200">
                <p className="text-sm font-semibold text-stone-900 mb-1">Self-Transcendent Purpose</p>
                <p className="text-xs text-stone-700 mb-2 min-h-8">How your learning connects to your broader goals and the world.</p>
                <p className="text-3xl font-display font-bold text-stone-700 mb-2">
                  {motivation_assessment?.self_transcendent_purpose || 50}%
                </p>
                <Progress value={motivation_assessment?.self_transcendent_purpose || 50} className="h-2 bg-stone-200" />
              </div>
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-semibold text-emerald-900 mb-1">Confidence in Ability</p>
                <p className="text-xs text-emerald-700 mb-2 min-h-8">Your belief that you can tackle tough academic challenges.</p>
                <p className="text-3xl font-display font-bold text-emerald-700 mb-2">
                  {motivation_assessment?.ability_confidence || 50}%
                </p>
                <Progress value={motivation_assessment?.ability_confidence || 50} className="h-2 bg-emerald-200" />
              </div>
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200">
                <p className="text-sm font-semibold text-stone-900 mb-1">Task Initiation Ease</p>
                <p className="text-xs text-stone-700 mb-2 min-h-8">Your ability to overcome friction and just start studying.</p>
                <p className="text-3xl font-display font-bold text-stone-700 mb-2">
                  {motivation_assessment?.prompt_responsiveness || 50}%
                </p>
                <Progress value={motivation_assessment?.prompt_responsiveness || 50} className="h-2 bg-stone-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Takeaways */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0 shadow-xl rounded-3xl">
          <CardContent className="p-8">
            <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
              <Star className="w-8 h-8 text-emerald-200" />
              Your Personal Learning Blueprint
            </h3>
            <div className="space-y-5 text-emerald-50 text-base leading-relaxed">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                <p>
                  <span className="font-bold text-white text-lg block mb-1">Leveraging Your Strengths 🚀</span>
                  Your profile shows exceptional skills in <strong>{EF_SKILL_LABELS[topStrengths[0]?.[0]]}</strong> and <strong>{EF_SKILL_LABELS[topStrengths[1]?.[0]]}</strong>. 
                  These aren't just scores—they are your academic superpowers. We'll use these exact strengths as a launchpad to help you navigate through the subjects you find more challenging.
                </p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                <p>
                  <span className="font-bold text-white text-lg block mb-1">Opportunities for Growth 🌱</span>
                  We noticed that <strong>{EF_SKILL_LABELS[growthAreas[0]?.[0]]}</strong> is a targeted area for development. 
                  That's perfectly normal. Cognitive skills are muscles, not fixed traits. Our adaptive tools are specifically designed to help you exercise and build these exact skills over time without feeling overwhelmed.
                </p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
                <p>
                  <span className="font-bold text-white text-lg block mb-1">Your Motivation Engine ⚙️</span>
                  {motivation_assessment?.self_transcendent_purpose >= 60 
                    ? 'You are deeply driven by purpose and want to make a broader impact. We’ll constantly remind you how mastering these skills connects to the bigger picture and the goals you care about.'
                    : 'You’re currently building your "why." We’re going to help you discover the personal relevance behind the material, turning abstract concepts into tools you can use in the real world.'}
                </p>
              </div>
              <p className="pt-4 border-t border-emerald-500/50 text-center font-medium">
                The takeaway: You have a unique cognitive fingerprint. LeapOn will now adapt its entire interface, pacing, and recommendations to fit exactly how you learn best.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What This Unlocks — feature recommendations */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-2 border-emerald-100 rounded-3xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl text-emerald-900 font-display">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              How The Platform Just Adapted To You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600 mb-6">
              Because of your profile, LeapOn has already rearranged its dashboard, tools, and recommendations to fit your cognitive style:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Gamification — low task initiation */}
              {executive_functioning?.task_initiation && executive_functioning.task_initiation / 21 < 0.55 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <Zap className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-emerald-900">Blitz Mode emphasized</p>
                    <p className="text-sm text-emerald-700 mt-1">To help you overcome the friction of starting, your dashboard will highlight short 5-minute sessions.</p>
                  </div>
                </div>
              )}
              {/* Scheduling — low organization */}
              {executive_functioning?.organization && executive_functioning.organization / 21 < 0.55 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <Calendar className="w-6 h-6 text-stone-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-stone-900">Habit scheduling prioritized</p>
                    <p className="text-sm text-stone-600 mt-1">We’ll focus on tiny, anchor-based study habits to build reliable routines without the organizational overhead.</p>
                  </div>
                </div>
              )}
              {/* Time training — low time management */}
              {executive_functioning?.time_management && executive_functioning.time_management / 21 < 0.55 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <Clock className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-emerald-900">Time-awareness training</p>
                    <p className="text-sm text-emerald-700 mt-1">We’ve configured your practice modes to gently build your internal clock and pacing awareness.</p>
                  </div>
                </div>
              )}
              {/* Streak gamification — low persistence */}
              {executive_functioning?.goal_directed_persistence && executive_functioning.goal_directed_persistence / 21 < 0.55 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <Trophy className="w-6 h-6 text-stone-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-stone-900">Visible progress tracking</p>
                    <p className="text-sm text-stone-600 mt-1">To fuel your persistence, your dashboard will heavily feature visual streaks and real-time mastery growth.</p>
                  </div>
                </div>
              )}
              {/* Structured nodes — low working memory */}
              {executive_functioning?.working_memory && executive_functioning.working_memory / 21 < 0.55 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <LayoutGrid className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-emerald-900">Bite-sized knowledge chunks</p>
                    <p className="text-sm text-emerald-700 mt-1">To protect your working memory, Independent Study is now configured to serve material in smaller, highly-focused nodes.</p>
                  </div>
                </div>
              )}
              {/* Coach — low motivation */}
              {motivation_assessment?.ability_confidence < 50 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200">
                  <Sparkles className="w-6 h-6 text-stone-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-stone-900">Coach mentorship enabled</p>
                    <p className="text-sm text-stone-600 mt-1">Your AI Coach has been instructed to focus on building your confidence and celebrating incremental wins.</p>
                  </div>
                </div>
              )}
              {/* Default if nothing triggered */}
              {(!executive_functioning?.task_initiation || executive_functioning.task_initiation / 21 >= 0.55) && (!executive_functioning?.organization || executive_functioning.organization / 21 >= 0.55) && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 col-span-1 sm:col-span-2">
                  <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-emerald-900">Full Dashboard Ready</p>
                    <p className="text-sm text-emerald-700 mt-1">Your solid baseline means all advanced tracking and study features are fully enabled on your dashboard.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetake && (
          <Button
            size="lg"
            variant="outline"
            onClick={onRetake}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Brain className="w-5 h-5 mr-2" />
            Retake Profile
          </Button>
        )}
        <Button 
          size="lg"
          onClick={onComplete}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
