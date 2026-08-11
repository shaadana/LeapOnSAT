import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Target, ChevronRight } from 'lucide-react';
import { EF_LABELS, getWeakEfSkills } from '@/utils/gamification';

/**
 * Picks today's personalized challenge based on the student's weakest EF skill.
 * Each EF skill maps to a concrete, rewardable behavior with a coin/XP incentive,
 * so the visible "what to do today" is shaped by the Learner's Profile.
 */
const EF_DAILY_GOALS = {
  task_initiation: {
    title: 'Just Start',
    desc: 'Open one practice session today — even 3 questions counts.',
    cta: 'Start a Blitz',
    href: '/SATPractice',
    reward: '+15 XP starting bonus',
    color: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    accent: 'text-emerald-700',
  },
  sustained_attention: {
    title: 'Focused Stretch',
    desc: 'Complete a 10+ question session without a break.',
    cta: 'Start a Class Session',
    href: '/SATPractice',
    reward: '+25 XP focus bonus',
    color: 'from-sky-50 to-blue-50',
    border: 'border-sky-200',
    accent: 'text-sky-700',
  },
  response_inhibition: {
    title: 'Slow Down to Speed Up',
    desc: 'Aim for 85%+ accuracy — read each question twice before answering.',
    cta: 'Practice Carefully',
    href: '/SATPractice',
    reward: '+20 XP patience bonus',
    color: 'from-rose-50 to-pink-50',
    border: 'border-rose-200',
    accent: 'text-rose-700',
  },
  metacognition: {
    title: 'Know Yourself',
    desc: 'Score 100% on a session — reflect on what worked.',
    cta: 'Try a Perfect Run',
    href: '/SATPractice',
    reward: '+30 XP self-aware bonus',
    color: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    accent: 'text-violet-700',
  },
  goal_directed_persistence: {
    title: 'Push Through',
    desc: 'Take on a hard or expert difficulty session today.',
    cta: 'Try Hard Mode',
    href: '/SATPractice',
    reward: '+20 XP persistence bonus',
    color: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    accent: 'text-emerald-700',
  },
  organization: {
    title: 'Map Your Plan',
    desc: 'Visit your knowledge graph and pick one weak domain to drill.',
    cta: 'Open Knowledge Graph',
    href: '/KnowledgeGraph',
    reward: 'Earn the Lab Coat outfit',
    color: 'from-slate-50 to-gray-50',
    border: 'border-slate-200',
    accent: 'text-slate-700',
  },
  planning_prioritization: {
    title: 'Plan the Win',
    desc: 'Pick one weak domain and complete a focused session there.',
    cta: 'Pick a Topic',
    href: '/SATPractice',
    reward: 'Earn the Wise Owl avatar',
    color: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-200',
    accent: 'text-indigo-700',
  },
  time_management: {
    title: 'Beat the Clock',
    desc: 'Complete a Choice Session within your set time.',
    cta: 'Start a Choice Session',
    href: '/SATPractice',
    reward: 'Earn the Pocket Watch',
    color: 'from-teal-50 to-cyan-50',
    border: 'border-teal-200',
    accent: 'text-teal-700',
  },
  emotional_control: {
    title: 'Steady Mind',
    desc: 'After a wrong answer, take a breath, then keep going.',
    cta: 'Practice Mindfully',
    href: '/SATPractice',
    reward: 'Earn the Calm Panda',
    color: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    accent: 'text-green-700',
  },
  stress_tolerance: {
    title: 'Calm Under Pressure',
    desc: 'Complete a session even when questions feel hard.',
    cta: 'Practice with Grit',
    href: '/SATPractice',
    reward: '+15 XP composure bonus',
    color: 'from-cyan-50 to-teal-50',
    border: 'border-cyan-200',
    accent: 'text-cyan-700',
  },
  flexibility: {
    title: 'Stretch Your Brain',
    desc: 'Practice across two different domains today.',
    cta: 'Mix It Up',
    href: '/SATPractice',
    reward: 'Earn the Wizard Hat',
    color: 'from-fuchsia-50 to-pink-50',
    border: 'border-fuchsia-200',
    accent: 'text-fuchsia-700',
  },
  working_memory: {
    title: 'Hold the Steps',
    desc: 'Try a multi-step problem without writing — recall & reason.',
    cta: 'Start Practicing',
    href: '/SATPractice',
    reward: 'Earn the Centurion badge',
    color: 'from-purple-50 to-violet-50',
    border: 'border-purple-200',
    accent: 'text-purple-700',
  },
};

export default function EFDailyGoal({ executiveFunctioning }) {
  const weak = getWeakEfSkills(executiveFunctioning);
  if (weak.length === 0) return null;

  const skill = weak[0]; // weakest first
  const goal = EF_DAILY_GOALS[skill];
  if (!goal) return null;

  return (
    <Card className={`bg-gradient-to-br ${goal.color} border-2 ${goal.border} shadow-md`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
            <Target className={`w-5 h-5 ${goal.accent}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                Today's goal · {EF_LABELS[skill]}
              </span>
            </div>
            <h3 className={`text-base font-bold ${goal.accent} leading-tight`}>{goal.title}</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">{goal.desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 bg-white/60 rounded-lg p-2 border border-white">
          <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
            <Sparkles className={`w-3 h-3 ${goal.accent}`} />
            {goal.reward}
          </span>
          <Link to={goal.href}>
            <button className={`text-xs font-bold ${goal.accent} flex items-center gap-0.5 hover:underline`}>
              {goal.cta} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
