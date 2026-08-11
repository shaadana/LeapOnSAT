import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Heart, Target, Users, Lightbulb, MessageCircle } from 'lucide-react';

export default function MentorAdvice({ profile }) {
  const mentorScore = profile?.mindset_appraisal?.mentor_mindset_score || 50;
  const growthScore = profile?.mindset_appraisal?.growth_mindset_score || 50;
  const enforcerTendencies = profile?.mindset_appraisal?.enforcer_tendencies || 0;
  const protectorTendencies = profile?.mindset_appraisal?.protector_tendencies || 0;

  const getDominantTendency = () => {
    if (mentorScore >= 70) return 'mentor';
    if (enforcerTendencies > 60) return 'enforcer';
    if (protectorTendencies > 60) return 'protector';
    return 'developing';
  };

  const tendency = getDominantTendency();

  const adviceByTendency = {
    mentor: {
      title: "You're on the Mentor Path! 🌟",
      message: "You naturally combine high standards with high support. Keep practicing the frameworks you know, and remember to explain your reasoning early (transparency) so students understand your intentions.",
      practices: [
        "Continue using the Sergio Trifecta: Validate → Seek to understand → Offer to collaborate",
        "When giving feedback, pair standards with belief: 'I have high standards and know you can reach them'",
        "Help students reframe stress as enhancing rather than debilitating",
        "Connect tasks to purpose: Skills → Personal Benefit → Helping Others"
      ]
    },
    enforcer: {
      title: "Building Support Skills",
      message: "You hold high standards (that's good!), but students may not feel supported. Remember: they need to know you believe in them AND have the tools to succeed.",
      practices: [
        "Try the SVB Process: Surface their thinking → Validate what's right → Bridge to improvement",
        "Before correcting, ask: 'Can you walk me through your thinking?' (seek to understand first)",
        "Replace 'You should know this' with 'Let's figure out what's tripping you up together'",
        "Add transparency: Explain WHY standards matter, not just that they exist"
      ]
    },
    protector: {
      title: "Building Standards Skills",
      message: "You're supportive (that's great!), but students might feel they're not being challenged. They want to earn respect, not just receive comfort.",
      practices: [
        "Use Wise Feedback: 'I'm giving you this challenge because I know you can handle it'",
        "Reframe struggle as normal: 'This is supposed to be hard - that means you're growing'",
        "Ask: 'What do you think you should try?' instead of solving problems for them",
        "Set high expectations + offer to collaborate: 'This is advanced work. Let's tackle it together'"
      ]
    },
    developing: {
      title: "Developing Your Mentor Mindset",
      message: "You're on your way! Focus on combining high standards WITH high support. Students need both to thrive.",
      practices: [
        "Practice Respectful Language: ASK don't tell, HONOR their status, VALIDATE, presume AGENCY",
        "Try the Sergio Trifecta: Validate feelings → Seek to understand → Offer to collaborate",
        "Use Most Generous Interpretation: 'What else could be true about their behavior?'",
        "Connect to Purpose: How does this help them grow AND contribute to others?"
      ]
    }
  };

  const advice = adviceByTendency[tendency];

  return (
    <div className="space-y-4">
      <Card className="bg-white/90 backdrop-blur border-2 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900">
            <Heart className="w-5 h-5 text-emerald-600" />
            {advice.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-stone-700">{advice.message}</p>
          
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-emerald-900 text-sm">Practices to Try:</h4>
            </div>
            <ul className="space-y-2">
              {advice.practices.map((practice, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>{practice}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur border-2 border-stone-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-900 text-base">
            <MessageCircle className="w-4 h-4 text-stone-600" />
            Key Mindset Shifts to Practice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-red-600 font-bold">✗</span>
              <div>
                <p className="font-medium text-red-900">Avoid: "You should know this by now"</p>
                <p className="text-red-700 text-xs mt-1">Invokes status, tells, diminishes</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-emerald-900">Try: "Walk me through your thinking - I'm curious where you got stuck"</p>
                <p className="text-emerald-700 text-xs mt-1">Asks, honors them, validates effort, presumes agency</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-red-600 font-bold">✗</span>
              <div>
                <p className="font-medium text-red-900">Avoid: "Don't stress about this test"</p>
                <p className="text-red-700 text-xs mt-1">Dismisses their feelings</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-emerald-600 font-bold">✓</span>
              <div>
                <p className="font-medium text-emerald-900">Try: "That stress shows you care - let's use that energy to prepare well"</p>
                <p className="text-emerald-700 text-xs mt-1">Validates, reframes stress as enhancing</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
