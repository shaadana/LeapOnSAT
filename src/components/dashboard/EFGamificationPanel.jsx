import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, Zap, Clock, Calendar, Trophy, Flame, 
  Bell, Target, Sparkles, ArrowRight, CheckCircle2
} from 'lucide-react';

/**
 * Returns EF-tailored gamification & scheduling config for a user's profile.
 * Based on executive functioning diagnostic results.
 */
function getEFConfig(userProfile) {
  if (!userProfile?.executive_functioning) return null;

  const ef = userProfile.executive_functioning;
  const norm = v => Math.round(((v || 10) / 21) * 100);
  const motivation = userProfile.motivation_assessment || {};

  const ti   = norm(ef.task_initiation);
  const sa   = norm(ef.sustained_attention);
  const tm   = norm(ef.time_management);
  const wm   = norm(ef.working_memory);
  const org  = norm(ef.organization);
  const gdp  = norm(ef.goal_directed_persistence);
  const flex = norm(ef.flexibility);
  const intrinsic = motivation.intrinsic_motivation || 50;
  const extrinsic = motivation.extrinsic_motivation || 50;

  const sections = [];

  // ── Session Length Recommendation ───────────────────────────────
  let sessionRec, sessionIcon, sessionColor;
  if (sa < 45 || ti < 45) {
    sessionRec = { duration: '5 min', mode: 'Blitz', reason: 'Based on your profile, short and energetic bursts work best for you.', link: createPageUrl('SATPractice') + '?type=blitz', tip: 'Set a visible timer. Commit to just 1 question.' };
    sessionIcon = Zap;
    sessionColor = 'from-emerald-400 to-teal-500';
  } else if (sa < 65) {
    sessionRec = { duration: '15 min', mode: 'Class', reason: 'Moderate attention means 15-min focused blocks with short breaks maximize your learning.', link: createPageUrl('SATPractice') + '?type=class', tip: 'Use the Pomodoro technique: 15 min on, 5 min break.' };
    sessionIcon = Clock;
    sessionColor = 'from-emerald-500 to-teal-500';
  } else {
    sessionRec = { duration: '30 min', mode: 'Full Module', reason: 'Strong sustained attention — you can handle longer sessions and deeper focus.', link: createPageUrl('SATPractice') + '?type=choice', tip: 'Challenge yourself with timed full modules.' };
    sessionIcon = Target;
    sessionColor = 'from-stone-600 to-stone-800';
  }
  sections.push({ type: 'session', data: sessionRec, icon: sessionIcon });

  // ── Gamification Style ───────────────────────────────────────────
  let gamStyle;
  if (extrinsic > intrinsic && gdp < 55) {
    gamStyle = { title: 'Reward-Based Motivation', description: 'You respond well to external rewards. Track your streak — each 3-day streak earns a new domain badge on your knowledge graph.', badge: 'Streak badges', action: 'View My Streaks', link: createPageUrl('KnowledgeGraph'), tip: 'Set a small real-world reward when you hit 7 days.' };
  } else if (intrinsic > 60) {
    gamStyle = { title: 'Mastery-Driven Progress', description: 'You\'re driven by mastery. The knowledge graph\'s prerequisite chains show you exactly what to unlock next — follow the path.', badge: 'Unlock prerequisites', action: 'Open Knowledge Graph', link: createPageUrl('KnowledgeGraph'), tip: 'Mastering foundations unlocks harder topics automatically.' };
  } else {
    gamStyle = { title: 'Progress Visibility', description: 'Seeing progress keeps you going. Check your knowledge graph and habit streaks regularly to feel the momentum.', badge: 'Progress tracking', action: 'View Progress', link: createPageUrl('KnowledgeGraph'), tip: 'Each completed quiz node turns green on your map.' };
  }
  sections.push({ type: 'gamification', data: gamStyle, icon: Trophy });

  // ── Scheduling / Reminder Strategy ──────────────────────────────
  let schedStrategy;
  if (org < 50 || tm < 50) {
    schedStrategy = { title: 'Anchor-Based Scheduling', description: 'Don\'t rely on willpower alone. Tie study to a fixed moment: "After I sit down from dinner, I open the app." Zero decisions needed.', badge: 'Anchor scheduling', action: 'Create Study Habit', link: createPageUrl('StudyHabits'), tip: 'The habit system lets you pick an exact anchor moment.' };
  } else if (flex < 50) {
    schedStrategy = { title: 'Fixed Daily Time Slot', description: 'Flexible routines can feel unpredictable. A fixed daily time (e.g. 7:30 PM) reduces friction and anxiety.', badge: 'Fixed schedule', action: 'Build Your Habits', link: createPageUrl('StudyHabits'), tip: 'Pick the same time every day — consistency beats intensity.' };
  } else {
    schedStrategy = { title: 'Flexible Micro-Sessions', description: 'Strong time management lets you fit study into micro-gaps in your day. 3 x 10 minutes adds up to real progress.', badge: 'Micro-sessions', action: 'Try Blitz Mode', link: createPageUrl('SATPractice') + '?type=blitz', tip: '3 Blitz sessions = 1 full practice module worth of questions.' };
  }
  sections.push({ type: 'scheduling', data: schedStrategy, icon: Calendar });

  // ── Reminder Strategy ────────────────────────────────────────────
  let reminderStrategy;
  if (wm < 50) {
    reminderStrategy = { title: 'Visual Reminders Work Best', description: 'Out of sight means out of mind. Keep the app on your home screen and use your habit "anchor" as a visual cue.', tip: 'Put a sticky note by your charger: "5 min SAT before charging."' };
  } else if (ti < 50) {
    reminderStrategy = { title: 'Accountability Reminders', description: 'Getting started can be tough. External prompts (a notification, a friend check-in, or a visible streak counter) make starting much easier.', tip: 'Tell your coach or a friend your study plan for accountability.' };
  } else {
    reminderStrategy = { title: 'Habit Chains', description: 'You can self-direct effectively. Link study to an existing habit using the "After I..." method — it\'s more reliable than notifications.', tip: 'Stacking habits is more reliable than app notifications.' };
  }
  sections.push({ type: 'reminder', data: reminderStrategy, icon: Bell });

  return sections;
}

export default function EFGamificationPanel({ userProfile }) {
  const [expanded, setExpanded] = useState(null);
  const config = getEFConfig(userProfile);
  if (!config) return null;

  const COLORS = {
    session:      { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-500' },
    gamification: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-600' },
    scheduling:   { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-500' },
    reminder:     { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-600' },
  };

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-500" />
          Your Personalized Learning Setup
          <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-xs">Profile-driven</Badge>
        </CardTitle>
        <p className="text-xs text-stone-500 mt-1">Study tips, scheduling, and reminders personalized to how you learn best</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {config.map((section) => {
          const colors = COLORS[section.type];
          const Icon = section.icon;
          const isOpen = expanded === section.type;

          return (
            <div
              key={section.type}
              className={`rounded-2xl border-2 transition-all ${colors.border} ${colors.bg}`}
            >
              <button
                className="w-full text-left p-4 flex items-start gap-3"
                onClick={() => setExpanded(isOpen ? null : section.type)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow ${colors.icon}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900">
                      {section.type === 'session' ? `Recommended: ${section.data.duration} ${section.data.mode}` :
                       section.type === 'gamification' ? section.data.title :
                       section.type === 'scheduling' ? section.data.title :
                       section.data.title}
                    </p>
                    <span className="text-stone-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                      {section.type === 'session' ? section.data.reason :
                       section.type === 'gamification' ? section.data.description :
                       section.type === 'scheduling' ? section.data.description :
                       section.data.description}
                    </p>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {section.type === 'session' ? section.data.reason :
                     section.data.description}
                  </p>

                  {section.data.badge && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white border border-stone-200 text-stone-700">
                      {section.data.badge}
                    </span>
                  )}

                  <div className="flex items-start gap-2 p-2 rounded-xl bg-white border border-stone-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-stone-600 italic">
                      {section.type === 'session' ? section.data.tip : section.data.tip}
                    </p>
                  </div>

                  {section.data.action && section.data.link && (
                    <Link to={section.data.link}>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-full gap-1">
                        {section.data.action}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
