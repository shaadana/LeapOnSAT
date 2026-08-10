import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Zap, Calendar, ClipboardList, BookOpen, Sparkles, Trophy,
  Clock, LayoutGrid, Target, ArrowRight, Flame
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getConsistentDomainScores, MASTERY_THRESHOLDS } from '@/utils/performanceMetrics';

/**
 * Derives which feature clusters to surface based on diagnostic EF scores
 * AND SAT performance data.
 * Returns an ordered list of recommendation objects.
 */
function getAdaptiveRecommendations(userProfile) {
  if (!userProfile?.executive_functioning && !userProfile?.sat_performance) return null;

  const ef = userProfile.executive_functioning || {};
  const norm = (v) => Math.round((v / 21) * 100);

  const scores = {
    task_initiation: ef.task_initiation ? norm(ef.task_initiation) : 60,
    sustained_attention: ef.sustained_attention ? norm(ef.sustained_attention) : 60,
    organization: ef.organization ? norm(ef.organization) : 60,
    time_management: ef.time_management ? norm(ef.time_management) : 60,
    planning_prioritization: ef.planning_prioritization ? norm(ef.planning_prioritization) : 60,
    working_memory: ef.working_memory ? norm(ef.working_memory) : 60,
    goal_directed_persistence: ef.goal_directed_persistence ? norm(ef.goal_directed_persistence) : 60,
  };
  const hasEFData = !!userProfile.executive_functioning;

  const motivation = userProfile.motivation_assessment || {};
  const intrinsic = motivation.intrinsic_motivation || 50;
  const confidence = motivation.ability_confidence || 50;

  // SAT performance data
  const satPerf = userProfile.sat_performance;
  const domainScores = satPerf?.domain_scores || {};
  const weakSATDomains = Object.entries(domainScores)
    .filter(([, score]) => score < 50)
    .sort(([, a], [, b]) => a - b)
    .map(([domain]) => domain);
  const hasSATData = !!satPerf?.domain_scores;

  const DOMAIN_LABELS = {
    algebra: 'Algebra', advanced_algebra: 'Adv. Algebra', geometry: 'Geometry',
    trigonometry: 'Trigonometry', statistics: 'Statistics', problem_solving: 'Problem Solving',
    systems_of_equations: 'Systems of Eq.', quadratics: 'Quadratics',
    exponentials: 'Exponentials', ratios_proportions: 'Ratios', circles: 'Circles', polynomials: 'Polynomials',
  };

  const recs = [];

  // Merge live weak domains with diagnostic
  const liveWeak = userProfile.sat_performance?._liveWeakDomains || [];
  const allWeakDomains = liveWeak.length > 0 ? liveWeak : weakSATDomains;

  // SAT-driven: weak domains → targeted practice
  if ((hasSATData || liveWeak.length > 0) && allWeakDomains.length > 0) {
    const topWeak = allWeakDomains[0];
    recs.push({
      key: 'sat_weak',
      priority: 0,
      icon: Target,
      title: `Practice: ${DOMAIN_LABELS[topWeak] || topWeak}`,
      description: `${liveWeak.length > 0 ? 'Your knowledge graph shows' : 'Your SAT diagnostic flagged'} ${DOMAIN_LABELS[topWeak] || topWeak} as your weakest area${domainScores[topWeak] !== undefined ? ` (${domainScores[topWeak]}% mastery)` : ''}. Focused practice here will have the biggest impact on your score.`,
      badge: 'Top priority',
      badgeColor: 'bg-emerald-600 text-white',
      cta: `Practice ${DOMAIN_LABELS[topWeak] || topWeak}`,
      link: `${createPageUrl('SATPractice')}?topic=${topWeak}`,
      stat: `${DOMAIN_LABELS[topWeak] || topWeak}: ${domainScores[topWeak]}% mastery`,
      statColor: domainScores[topWeak] < 33 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: domainScores[topWeak],
      tip: `📊 Tip: ${weakSATDomains.length} domain${weakSATDomains.length > 1 ? 's need' : ' needs'} work. Start with the weakest.`,
    });
  }

  // LOW task initiation or sustained_attention → push Blitz gamification
  if (hasEFData && (scores.task_initiation < 55 || scores.sustained_attention < 55)) {
    recs.push({
      key: 'gamification',
      priority: 1,
      icon: Zap,
      title: 'Start Small, Win Big',
      description: "Your profile shows getting started is a growth area. Quick 5-min Blitz sessions build momentum — they're designed so starting is the hardest part.",
      badge: 'Personalized for you',
      badgeColor: 'bg-emerald-500 text-white',
      cta: 'Launch Blitz Session',
      link: createPageUrl('SATPractice') + '?type=blitz',
      stat: `Getting started: ${scores.task_initiation}%`,
      statColor: scores.task_initiation < 45 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: scores.task_initiation,
      tip: '🎯 Tip: Commit to just 1 question. You\'ll keep going.',
    });
  }

  // LOW organization or planning → push Study Habits + scheduling
  if (hasEFData && (scores.organization < 55 || scores.planning_prioritization < 55)) {
    recs.push({
      key: 'scheduling',
      priority: 2,
      icon: Calendar,
      title: 'Build a Study Schedule',
      description: 'Staying organized and planning ahead are areas to strengthen. A consistent habit tied to an anchor moment removes the mental load of deciding when to study.',
      badge: 'Recommended',
      badgeColor: 'bg-stone-700 text-white',
      cta: 'Create a Study Habit',
      link: createPageUrl('StudyHabits'),
      stat: `Organization score: ${scores.organization}%`,
      statColor: scores.organization < 45 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: scores.organization,
      tip: '📅 Tip: Pick a fixed anchor — "after dinner, open the app."',
    });
  }

  // LOW time_management → push timed Blitz + Class modes with timer awareness
  if (hasEFData && scores.time_management < 55) {
    recs.push({
      key: 'time_management',
      priority: 3,
      icon: Clock,
      title: 'Train Your Time Sense',
      description: 'Managing your time is a growth area. Timed practice sessions train you to pace yourself, which is crucial for the real SAT.',
      badge: 'High impact',
      badgeColor: 'bg-emerald-600 text-white',
      cta: 'Practice with Timer',
      link: createPageUrl('SATPractice') + '?type=class',
      stat: `Time management score: ${scores.time_management}%`,
      statColor: scores.time_management < 45 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: scores.time_management,
      tip: '⏱ Tip: The SAT Module test simulates real time pressure.',
    });
  }

  // LOW goal_directed_persistence or low intrinsic motivation → push Knowledge Graph streaks
  if (hasEFData && (scores.goal_directed_persistence < 55 || intrinsic < 50)) {
    recs.push({
      key: 'streaks',
      priority: 4,
      icon: Trophy,
      title: 'Track Your Streak',
      description: 'Sticking with goals grows through visible progress. Your streak counter and knowledge graph make growth feel real and motivating.',
      badge: 'Motivation boost',
      badgeColor: 'bg-stone-600 text-white',
      cta: 'View Knowledge Graph',
      link: createPageUrl('KnowledgeGraph'),
      stat: `Persistence score: ${scores.goal_directed_persistence}%`,
      statColor: scores.goal_directed_persistence < 45 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: scores.goal_directed_persistence,
      tip: '🔥 Tip: Mastering one node unlocks related topics.',
    });
  }

  // LOW working_memory → push Independent Study (structured nodes)
  if (hasEFData && scores.working_memory < 55) {
    recs.push({
      key: 'structured_study',
      priority: 5,
      icon: LayoutGrid,
      title: 'Structured Learning Nodes',
      description: 'Retaining information while working is a growth area. Breaking content into small concept nodes (Independent Study) reduces overwhelm and helps things stick.',
      badge: 'Recommended',
      badgeColor: 'bg-stone-500 text-white',
      cta: 'Start Independent Study',
      link: createPageUrl('IndependentStudy'),
      stat: `Memory score: ${scores.working_memory}%`,
      statColor: scores.working_memory < 45 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: scores.working_memory,
      tip: '🧩 Tip: Study one node at a time and quiz yourself.',
    });
  }

  // LOW confidence → push Coach
  if (hasEFData && confidence < 50) {
    recs.push({
      key: 'coach',
      priority: 6,
      icon: Sparkles,
      title: 'Work with Your Coach',
      description: 'Your confidence in your abilities has room to grow. Your AI coach can help reframe challenges and build belief in yourself over time.',
      badge: 'Confidence builder',
      badgeColor: 'bg-emerald-400 text-white',
      cta: 'Chat with Coach',
      link: createPageUrl('Coach'),
      stat: `Confidence: ${confidence}%`,
      statColor: confidence < 40 ? 'text-stone-700 font-semibold' : 'text-stone-600',
      progress: confidence,
      tip: '💬 Tip: Tell the coach what feels hard today.',
    });
  }

  // Sort by priority and return top 3
  return recs.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export default function AdaptiveLearningPanel({ userProfile, conceptNodes = [], sessions = [] }) {
  // Get consistent domain scores reconciled from diagnostics, live practice, and nodes
  const mergedScores = getConsistentDomainScores(userProfile, conceptNodes, sessions);
  
  const liveWeakDomains = Object.entries(mergedScores)
    .filter(([, score]) => score < MASTERY_THRESHOLDS.learning)
    .sort(([, a], [, b]) => a - b)
    .map(([domain]) => domain);

  // Merge live weak domains into the userProfile for recommendations
  const enrichedProfile = userProfile ? {
    ...userProfile,
    sat_performance: {
      ...(userProfile.sat_performance || {}),
      // Boost weak domain detection with live data
      _liveWeakDomains: liveWeakDomains,
      // Pass the consistent scores down as domain_scores
      domain_scores: mergedScores,
    },
  } : userProfile;

  const recs = getAdaptiveRecommendations(enrichedProfile);
  if (!recs || recs.length === 0) return null;

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" />
          Your Personalized Learning Plan
          <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-medium">Based on your profile</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recs.map((rec) => {
          const Icon = rec.icon;
          return (
            <div key={rec.key} className="rounded-2xl border-2 border-stone-100 bg-stone-50/60 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.badgeColor}`}>{rec.badge}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{rec.description}</p>
                </div>
              </div>

              {/* EF Score Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-medium ${rec.statColor}`}>{rec.stat}</span>
                </div>
                <Progress value={rec.progress} className="h-1.5" />
              </div>

              {/* Tip */}
              <p className="text-xs text-stone-500 italic">{rec.tip}</p>

              <Link to={rec.link}>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-full gap-1 mt-1">
                  {rec.cta}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
