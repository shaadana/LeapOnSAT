import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Coins, Send, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { awardCustomCoins, awardCustomBadge } from '@/utils/gamification';

const QUICK_TEMPLATES = [
  { type: 'badge',  title: 'Class Participation',  emoji: '🙋' },
  { type: 'badge',  title: 'Kindness Award',       emoji: '💛' },
  { type: 'badge',  title: 'Most Improved',        emoji: '📈' },
  { type: 'badge',  title: 'Great Question',       emoji: '🤔' },
  { type: 'badge',  title: 'Team Player',          emoji: '🤝' },
  { type: 'badge',  title: 'Perfect Effort',       emoji: '💪' },
  { type: 'coins',  title: 'Bonus — Homework Done',amount: 25, emoji: '📒' },
  { type: 'coins',  title: 'Bonus — Helped Peer',  amount: 50, emoji: '🌟' },
];

const EMOJI_CHOICES = ['🏅','🎖️','🥇','⭐','🌟','✨','💛','💪','🙋','🤝','🤔','📈','📚','🎯','🚀','🔥','🧠','👏','💡','🎉'];

export default function CustomRewards({ user, classes }) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [rewardType, setRewardType] = useState('badge');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🏅');
  const [coinAmount, setCoinAmount] = useState(25);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Build student list across the teacher's classes
  const { data: students } = useQuery({
    queryKey: ['teacherRewardStudents', user?.id, classes?.map(c => c.id).join(',')],
    queryFn: async () => {
      const list = [];
      for (const cls of classes || []) {
        if (cls.student_ids?.length) {
          for (const sid of cls.student_ids) {
            const [u] = await base44.entities.User.filter({ id: sid });
            if (u) list.push({ id: sid, name: u.name || u.full_name || u.email, email: u.email, classId: cls.id, className: cls.class_name });
          }
        }
      }
      return list;
    },
    enabled: !!classes?.length,
  });

  const filteredStudents = (students || []).filter(s =>
    selectedClassId === 'all' || s.classId === selectedClassId
  );

  // Recent rewards issued by this teacher
  const { data: recentRewards } = useQuery({
    queryKey: ['recentTeacherRewards', user?.id],
    queryFn: () => base44.entities.CustomReward.filter({ teacher_id: user.id }, '-created_date', 20),
    enabled: !!user?.id,
  });

  const applyTemplate = (tpl) => {
    setRewardType(tpl.type);
    setTitle(tpl.title);
    if (tpl.emoji) setEmoji(tpl.emoji);
    if (tpl.amount) setCoinAmount(tpl.amount);
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setEmoji('🏅');
    setCoinAmount(25);
  };

  const handleSend = async () => {
    if (!selectedStudent) return toast.error('Pick a student first');
    if (!title.trim()) return toast.error('Add a reward title');

    setSubmitting(true);
    try {
      if (rewardType === 'coins') {
        await awardCustomCoins(user, selectedStudent.id, selectedStudent.name, {
          coin_amount: Number(coinAmount),
          title: title.trim(),
          message: message.trim(),
          class_id: selectedStudent.classId,
        });
        toast.success(`Awarded ${coinAmount} coins to ${selectedStudent.name}!`);
      } else {
        await awardCustomBadge(user, selectedStudent.id, selectedStudent.name, {
          title: title.trim(),
          message: message.trim(),
          badge_emoji: emoji,
          class_id: selectedStudent.classId,
        });
        toast.success(`Sent "${title}" badge to ${selectedStudent.name}!`);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['recentTeacherRewards', user.id] });
    } catch (e) {
      toast.error(e.message || 'Failed to send reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="bg-white border-4 border-emerald-200 rounded-[2.5rem] shadow-2xl">
        <CardHeader className="bg-emerald-50/50">
          <CardTitle className="flex items-center gap-2 text-2xl text-stone-900 font-display">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            Custom Rewards
          </CardTitle>
          <CardDescription className="text-stone-600">
            Award bonus coins or send a custom badge for in-class achievements — Class Participation, Kindness, effort, and more. Rewards appear instantly in the student's profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Quick templates */}
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Quick templates</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 bg-emerald-50 border-2 border-emerald-200 rounded-full text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-all"
                >
                  {t.emoji} {t.title}{t.amount ? ` (+${t.amount}🪙)` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Student selector */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {(classes || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Student *</label>
              <Select
                value={selectedStudent?.id || ''}
                onValueChange={(id) => setSelectedStudent(filteredStudents.find(s => s.id === id) || null)}
              >
                <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent>
                  {filteredStudents.length === 0 && <SelectItem value="__none__" disabled>No students in this class</SelectItem>}
                  {filteredStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.className})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reward type toggle */}
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Reward type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setRewardType('badge')}
                className={`flex-1 px-4 py-3 rounded-2xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                  rewardType === 'badge' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-300'
                }`}
              >
                <Award className="w-4 h-4" /> Custom Badge
              </button>
              <button
                onClick={() => setRewardType('coins')}
                className={`flex-1 px-4 py-3 rounded-2xl border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                  rewardType === 'coins' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white border-stone-200 text-stone-600 hover:border-amber-300'
                }`}
              >
                <Coins className="w-4 h-4" /> Bonus Coins
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={rewardType === 'badge' ? 'e.g. Class Participation, Kindness Award' : 'e.g. Bonus for doing homework on time'}
            />
          </div>

          {/* Type-specific input */}
          {rewardType === 'coins' ? (
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Coin amount</label>
              <div className="flex gap-2">
                {[10, 25, 50, 100, 200].map(n => (
                  <button
                    key={n}
                    onClick={() => setCoinAmount(n)}
                    className={`flex-1 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                      coinAmount === n ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-stone-200 text-stone-600 hover:border-amber-300'
                    }`}
                  >
                    🪙 {n}
                  </button>
                ))}
                <Input
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">Badge emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_CHOICES.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`w-10 h-10 rounded-xl text-xl border-2 transition-all ${
                      emoji === e ? 'bg-emerald-500 border-emerald-600 shadow' : 'bg-white border-stone-200 hover:border-emerald-300'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">Personal note (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Tell the student why they're getting this reward..."
            />
          </div>

          {/* Send */}
          <Button
            onClick={handleSend}
            disabled={submitting || !selectedStudent || !title.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold shadow-lg"
            size="lg"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Send Reward
          </Button>
        </CardContent>
      </Card>

      {/* Recent rewards */}
      <Card className="bg-white border-2 border-stone-100 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-stone-700">Recent rewards you've sent</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentRewards?.length ? (
            <p className="text-sm text-stone-500 text-center py-6">No rewards yet — send your first one above!</p>
          ) : (
            <div className="space-y-2">
              {recentRewards.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-stone-200 flex items-center justify-center text-xl">
                    {r.reward_type === 'coins' ? '🪙' : (r.badge_emoji || '🏅')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {r.title} <span className="text-stone-400 font-normal">→ {r.student_name}</span>
                    </p>
                    {r.message && <p className="text-xs text-stone-500 truncate">{r.message}</p>}
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {r.created_date ? format(new Date(r.created_date), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-emerald-700">
                    {r.reward_type === 'coins' ? `+${r.coin_amount}🪙` : '🏅'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
