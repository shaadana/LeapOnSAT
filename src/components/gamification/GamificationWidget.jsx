import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Award, ShoppingBag, ChevronRight } from 'lucide-react';
import { getOrCreateGamificationProfile, BADGES, getBadgeById, recommendBadgesForEF } from '@/utils/gamification';
import AvatarDisplay from './AvatarDisplay';
import XpBar from './XpBar';
import CoinPill from './CoinPill';
import BadgeChip from './BadgeChip';
import EFDailyGoal from './EFDailyGoal';

/**
 * Compact dashboard widget that shows the student's avatar, level, coins,
 * recently-earned badges, and an EF-tailored "next badge to chase" recommendation.
 */
export default function GamificationWidget({ userId, executiveFunctioning }) {
  const { data: profile } = useQuery({
    queryKey: ['gamificationProfile', userId],
    queryFn: () => getOrCreateGamificationProfile(userId),
    enabled: !!userId,
  });

  if (!profile) return null;

  const earned = profile.earned_badges || [];
  const recentEarned = earned.slice(-4).map(getBadgeById).filter(Boolean);
  const recommended = recommendBadgesForEF(executiveFunctioning, earned).slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)] overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Top row: avatar + level + coins */}
        <div className="flex items-center gap-3">
          <Link to="/AvatarShop" className="flex-shrink-0">
            <AvatarDisplay avatar={profile.avatar} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <XpBar xp={profile.xp || 0} />
          </div>
          <CoinPill coins={profile.coins || 0} />
        </div>

        {/* EF-customized daily goal — only shown when the diagnostic identifies a weak skill */}
        <EFDailyGoal executiveFunctioning={executiveFunctioning} />

        {/* Earned badges */}
        {recentEarned.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Recent Badges
              </span>
              <Link to="/AvatarShop?tab=badges" className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5">
                All {earned.length} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentEarned.map(b => <BadgeChip key={b.id} badge={b} earned size="sm" />)}
            </div>
          </div>
        )}

        {/* EF-tailored recommendations */}
        {recommended.length > 0 && (
          <div className="bg-white/70 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs font-semibold text-stone-700 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Goals tuned for you
            </p>
            <div className="flex gap-2">
              {recommended.map(b => <BadgeChip key={b.id} badge={b} earned={false} size="sm" />)}
            </div>
          </div>
        )}

        {/* Shop CTA */}
        <Link to="/AvatarShop">
          <Button size="sm" variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            Avatar Shop
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
