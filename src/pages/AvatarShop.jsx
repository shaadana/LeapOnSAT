import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag, Award, Lock, Check, Shirt } from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrCreateGamificationProfile,
  SHOP_ITEMS,
  BADGES,
  getBadgeById,
  purchaseShopItem,
  equipAvatarItem,
  recommendShopItemsForEF,
  getWeakEfSkills,
  EF_LABELS,
  customRewardToBadge,
} from '@/utils/gamification';
import AvatarDisplay from '@/components/gamification/AvatarDisplay';
import XpBar from '@/components/gamification/XpBar';
import CoinPill from '@/components/gamification/CoinPill';
import BadgeChip from '@/components/gamification/BadgeChip';
import ShopItemIcon from '@/components/gamification/ShopItemIcon';

const SLOTS = [
  { key: 'base',       label: 'Creature',   icon: '🦊' },
  { key: 'hat',        label: 'Hats',       icon: '🎩' },
  { key: 'outfit',     label: 'Outfits',    icon: '👕' },
  { key: 'background', label: 'Backgrounds',icon: '🌌' },
  { key: 'accessory',  label: 'Accessories',icon: '👓' },
  { key: 'consumable', label: 'Power-Ups',  icon: '✨' },
];

export default function AvatarShop() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('shop');
  const [slot, setSlot] = useState('base');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['gamificationProfile', user?.id],
    queryFn: () => getOrCreateGamificationProfile(user.id),
    enabled: !!user?.id,
  });

  // Pull the learner's profile so we can tailor recommendations to their EF needs
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const found = await base44.entities.UserProfile.filter({ user_id: user.id });
      return found[0] || null;
    },
    enabled: !!user?.id,
  });

  // Custom badges issued by teachers — merged into the badge collection
  const { data: customRewards } = useQuery({
    queryKey: ['customRewards', user?.id],
    queryFn: () => base44.entities.CustomReward.filter({ student_id: user.id, reward_type: 'badge' }, '-created_date'),
    enabled: !!user?.id,
  });

  // Read tab from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t && ['shop', 'badges'].includes(t)) setTab(t);
  }, []);

  if (!profile) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  const owned = new Set(profile.owned_items || []);
  const earned = new Set(profile.earned_badges || []);
  const slotItems = SHOP_ITEMS.filter(i => i.slot === slot);

  // Merge custom teacher-issued badges into the master collection
  const customBadges = (customRewards || []).map(customRewardToBadge);
  const allBadges = [...BADGES, ...customBadges];

  const ef = userProfile?.executive_functioning || null;
  const weakSkills = getWeakEfSkills(ef);
  const recommendedForYou = recommendShopItemsForEF(ef, profile.owned_items || []);
  const recommendedIds = new Set(recommendedForYou.map(i => i.id));

  const handlePurchase = async (item) => {
    try {
      await purchaseShopItem(user.id, item.id);
      toast.success(`Purchased ${item.label}! ${item.emoji}`);
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user.id] });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleEquip = async (item) => {
    try {
      await equipAvatarItem(user.id, item.id);
      toast.success(`Equipped ${item.label}! ${item.emoji}`);
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile', user.id] });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const isEquipped = (item) => profile.avatar?.[item.slot] === item.id;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-8">
      {/* Header — avatar + level + coins */}
      <Card className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 shadow-lg">
        <CardContent className="p-5 flex items-center gap-5 flex-wrap">
          <AvatarDisplay avatar={profile.avatar} size="lg" />
          <div className="flex-1 min-w-[200px] space-y-3">
            <h1 className="text-3xl font-bold text-stone-900" style={{ fontFamily: 'Righteous, sans-serif' }}>
              Your Avatar
            </h1>
            <XpBar xp={profile.xp || 0} />
          </div>
          <CoinPill coins={profile.coins || 0} size="md" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-stone-100 pb-2">
        {[
          { key: 'shop',   label: 'Shop',    icon: ShoppingBag },
          { key: 'badges', label: 'Badges',  icon: Award },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === key ? 'bg-emerald-500 text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* SHOP */}
      {tab === 'shop' && (
        <>
          {/* EF-tailored picks — only shows if the diagnostic surfaced low EF skills */}
          {recommendedForYou.length > 0 && (
            <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-teal-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Picked for You
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Cosmetics themed to support your growth areas:&nbsp;
                      <span className="font-semibold text-teal-700">
                        {weakSkills.slice(0, 3).map(s => EF_LABELS[s]).join(', ')}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {recommendedForYou.map(item => {
                    const isOwned = owned.has(item.id);
                    const canAfford = (profile.coins || 0) >= item.cost;
                    return (
                      <button
                        key={item.id}
                        onClick={() => isOwned ? handleEquip(item) : handlePurchase(item)}
                        disabled={!isOwned && !canAfford}
                        className={`p-2 rounded-xl border-2 text-center transition-all ${
                          isOwned ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' :
                          canAfford ? 'border-teal-300 bg-white hover:bg-teal-50' :
                          'border-stone-200 bg-stone-50 opacity-60'
                        }`}
                      >
                        <div className="w-10 h-10 mx-auto"><ShopItemIcon item={item} className="w-full h-full" /></div>
                        <p className="text-[11px] font-semibold text-stone-700 truncate mt-1">{item.label}</p>
                        <p className={`text-[10px] font-bold ${isOwned ? 'text-emerald-600' : 'text-stone-700'}`}>
                          {isOwned ? 'Equip' : `🪙 ${item.cost}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slot selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SLOTS.map(s => (
              <button
                key={s.key}
                onClick={() => setSlot(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  slot === s.key ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          {/* Item grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {slotItems.map(item => {
              const isOwned = owned.has(item.id);
              const equipped = isEquipped(item);
              const canAfford = (profile.coins || 0) >= item.cost;
              const isFree = item.cost === 0 || item.default;

              const isPicked = recommendedIds.has(item.id);

              return (
                <Card key={item.id} className={`border-2 transition-all relative ${
                  equipped ? 'border-emerald-500 bg-emerald-50' :
                  isPicked ? 'border-teal-300 hover:border-teal-400' :
                  'border-stone-200 hover:border-emerald-300'
                }`}>
                  {isPicked && (
                    <div className="absolute -top-2 -right-2 bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> For You
                    </div>
                  )}
                  <CardContent className="p-3 text-center space-y-2">
                    <div className="w-16 h-16 mx-auto py-1 flex items-center justify-center bg-stone-50 rounded-2xl border border-stone-100">
                      <ShopItemIcon item={item} className="w-full h-full" />
                    </div>
                    <p className="text-sm font-semibold text-stone-800 truncate">{item.label}</p>
                    {item.desc && <p className="text-[10px] text-stone-500 leading-tight">{item.desc}</p>}
                    {item.ef?.length > 0 && (
                      <p className="text-[9px] text-teal-600 leading-tight italic">
                        Supports: {item.ef.slice(0, 2).map(s => EF_LABELS[s]).join(', ')}
                      </p>
                    )}

                    {item.consumable ? (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs"
                      >
                        Buy 🪙 {item.cost}
                      </Button>
                    ) : equipped ? (
                      <Button size="sm" disabled className="w-full bg-emerald-500 text-white rounded-full text-xs gap-1">
                        <Check className="w-3 h-3" /> Equipped
                      </Button>
                    ) : isOwned || isFree ? (
                      <Button
                        size="sm"
                        onClick={() => handleEquip(item)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs"
                      >
                        Equip
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford}
                        variant={canAfford ? 'default' : 'outline'}
                        className={`w-full rounded-full text-xs ${
                          canAfford
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'border-stone-300 text-stone-400'
                        }`}
                      >
                        {canAfford ? <>Buy 🪙 {item.cost}</> : <><Lock className="w-3 h-3 mr-1" /> 🪙 {item.cost}</>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* BADGES */}
      {tab === 'badges' && (
        <Card className="border-2 border-stone-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                Badge Collection
              </h2>
              <span className="text-sm text-stone-500 font-medium">
                {earned.size} / {allBadges.length}
              </span>
            </div>
            {customBadges.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                  ✨ Teacher Awards
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {customBadges.map(b => <BadgeChip key={b.id} badge={b} earned={earned.has(b.id)} size="md" />)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {BADGES.map(b => <BadgeChip key={b.id} badge={b} earned={earned.has(b.id)} size="md" />)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
