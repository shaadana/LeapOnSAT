import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Target, Zap, BookOpen, TrendingUp } from 'lucide-react';

const EF_ADVICE = {
  response_inhibition: {
    description: "Ability to pause and think before acting or responding.",
    tips: [
      "Practice the 3-second rule: Count to 3 before answering questions",
      "Use the Pomodoro technique - work in focused 25-minute sessions",
      "Create a 'thinking checklist' before starting tasks"
    ]
  },
  working_memory: {
    description: "Holding and manipulating information in your mind.",
    tips: [
      "Break large problems into smaller steps and write them down",
      "Use visual aids like diagrams or mind maps",
      "Rehearse information out loud or teach it to someone else"
    ]
  },
  emotional_control: {
    description: "Managing feelings to accomplish goals and direct behavior.",
    tips: [
      "Practice deep breathing when frustrated (4 counts in, 4 counts out)",
      "Take 5-minute breaks when emotions run high",
      "Keep a mood journal to identify triggers"
    ]
  },
  task_initiation: {
    description: "Starting tasks without procrastinating.",
    tips: [
      "Use the 2-minute rule: If it takes less than 2 minutes, do it now",
      "Create tiny habits: After [existing routine], I will [tiny behavior], then celebrate",
      "Set up your environment the night before to reduce friction",
      "Remember: Starting doesn't mean finishing - just begin with one tiny step"
    ]
  },
  sustained_attention: {
    description: "Maintaining focus on tasks despite distractions.",
    tips: [
      "Remove distractions: Put phone in another room during study time",
      "Use website blockers during practice sessions",
      "Practice mindfulness exercises for 5 minutes daily"
    ]
  },
  planning_prioritization: {
    description: "Organizing steps needed to reach a goal and deciding what's most important.",
    tips: [
      "Use the Eisenhower Matrix: Urgent/Important to prioritize tasks",
      "Plan your week every Sunday - identify top 3 priorities",
      "Break big goals into daily micro-tasks"
    ]
  },
  organization: {
    description: "Arranging information and materials systematically.",
    tips: [
      "Create a dedicated study space with organized materials",
      "Use color-coding for different subjects or task types",
      "Implement a 'one touch' rule: Deal with items immediately"
    ]
  },
  time_management: {
    description: "Estimating and allocating time effectively.",
    tips: [
      "Track how long tasks actually take vs. your estimate",
      "Use time-blocking: Assign specific times for specific activities",
      "Build in buffer time - add 25% more time than you think you need"
    ]
  },
  flexibility: {
    description: "Adapting to change and switching approaches when needed.",
    tips: [
      "When stuck, try explaining the problem in a different way",
      "Practice 'what if' scenarios to prepare for changes",
      "Set aside time to try new study methods each week"
    ]
  },
  metacognition: {
    description: "Thinking about your own thinking and self-monitoring.",
    tips: [
      "After each practice session, ask: What worked? What didn't?",
      "Use self-assessment rubrics before submitting work",
      "Keep a learning journal tracking strategies that help you"
    ]
  },
  goal_directed_persistence: {
    description: "Following through to complete goals despite obstacles.",
    tips: [
      "Set 'SMART' goals: Specific, Measurable, Achievable, Relevant, Time-bound",
      "Create accountability by sharing goals with a friend or teacher",
      "Celebrate small wins along the way to bigger goals"
    ]
  },
  stress_tolerance: {
    description: "Coping with stress in healthy and productive ways.",
    tips: [
      "Reframe: Stress shows you care - use that caring as fuel for preparation",
      "Before big moments, remind yourself: 'This stress means I'm ready to perform'",
      "Develop a pre-test routine that channels stress (music, stretching, deep breaths)",
      "Practice progressive muscle relaxation",
      "Maintain consistent sleep and exercise routines"
    ]
  }
};

export default function DetailedAdvice({ efScores, showFor = 'growth' }) {
  const sortedSkills = Object.entries(efScores).sort((a, b) => 
    showFor === 'growth' ? a[1] - b[1] : b[1] - a[1]
  );
  const relevantSkills = sortedSkills.slice(0, 3);

  return (
    <div className="space-y-4">
      {relevantSkills.map(([skill, score]) => {
        const advice = EF_ADVICE[skill];
        if (!advice) return null;

        return (
          <Card key={skill} className="bg-white/70 backdrop-blur-xl border-2 border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                {skill.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{advice.description}</p>
            </CardHeader>
            <CardContent>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-semibold text-emerald-900 text-sm">Action Steps</h4>
                </div>
                <ul className="space-y-2">
                  {advice.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <Zap className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
