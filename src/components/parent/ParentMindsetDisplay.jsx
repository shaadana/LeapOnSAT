import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ParentMindsetDisplay({ user }) {
  const { data: profile } = useQuery({
    queryKey: ['parentProfile', user?.id],
    queryFn: () => base44.entities.ParentProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const parentProfile = profile?.[0];

  if (!parentProfile?.diagnostic_completed) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-4 border-emerald-200 rounded-[2rem] shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Complete Your Diagnostic</h2>
            <p className="text-stone-600 mb-6">Take the mentor mindset diagnostic to unlock personalized parenting insights and strategies.</p>
            <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold px-8">
              Start Diagnostic
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scores = parentProfile.growth_mindset || {};
  const mentorScore = scores.mentor_mindset_score || 0;
  const enforcerScore = scores.enforcer_tendencies || 0;
  const protectorScore = scores.protector_tendencies || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white hover:shadow-2xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-stone-900">Mentor Mindset</h3>
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-4xl font-bold text-emerald-600 mb-2">{Math.round(mentorScore)}%</div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${mentorScore}%` }}
              />
            </div>
            <p className="text-xs text-stone-600 mt-3">High standards + High support</p>
          </CardContent>
        </Card>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white hover:shadow-2xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-stone-900">Enforcer</h3>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-4xl font-bold text-orange-600 mb-2">{Math.round(enforcerScore)}%</div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${enforcerScore}%` }}
              />
            </div>
            <p className="text-xs text-stone-600 mt-3">High standards only</p>
          </CardContent>
        </Card>

        <Card className="border-4 border-white shadow-2xl rounded-[2rem] bg-white hover:shadow-2xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-stone-900">Protector</h3>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-2">{Math.round(protectorScore)}%</div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${protectorScore}%` }}
              />
            </div>
            <p className="text-xs text-stone-600 mt-3">High support only</p>
          </CardContent>
        </Card>
      </motion.div>

      {parentProfile.personalized_advice && (
        <Card className="border-4 border-emerald-200 rounded-[2rem] shadow-2xl bg-white">
          <CardHeader className="bg-emerald-50/50">
            <CardTitle>Your Personalized Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-stone-800 text-sm leading-relaxed">
                {parentProfile.personalized_advice}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(parentProfile.strengths?.length > 0 || parentProfile.growth_areas?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {parentProfile.strengths?.length > 0 && (
            <Card className="border-4 border-emerald-200 rounded-[2rem] shadow-2xl bg-white">
              <CardHeader className="bg-emerald-50/50">
                <CardTitle className="text-emerald-700">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                {parentProfile.strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">✓</span>
                    <p className="text-stone-700">{strength}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {parentProfile.growth_areas?.length > 0 && (
            <Card className="border-4 border-blue-200 rounded-[2rem] shadow-2xl bg-white">
              <CardHeader className="bg-blue-50/50">
                <CardTitle className="text-blue-700">Growth Areas</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                {parentProfile.growth_areas.map((area, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">→</span>
                    <p className="text-stone-700">{area}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
