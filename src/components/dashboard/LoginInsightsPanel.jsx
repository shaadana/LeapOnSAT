import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

function getDayName(dateStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date(dateStr).getDay()];
}

function getHour(dateStr) {
  return new Date(dateStr).getHours();
}

export default function LoginInsightsPanel({ loginHistory = [] }) {
  if (loginHistory.length < 3) return null;

  // Count logins per day of week
  const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  loginHistory.forEach(ts => {
    const day = getDayName(ts);
    dayCounts[day]++;
    const h = getHour(ts);
    if (h >= 5 && h < 12) hourBuckets.morning++;
    else if (h >= 12 && h < 17) hourBuckets.afternoon++;
    else if (h >= 17 && h < 21) hourBuckets.evening++;
    else hourBuckets.night++;
  });

  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const topTime = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];

  const timeLabels = {
    morning: 'mornings (5am–12pm)',
    afternoon: 'afternoons (12–5pm)',
    evening: 'evenings (5–9pm)',
    night: 'late nights (9pm+)',
  };

  const streak = (() => {
    const sorted = [...loginHistory].sort((a, b) => new Date(b) - new Date(a));
    const seen = new Set();
    let count = 0;
    let prev = null;
    for (const ts of sorted) {
      const d = new Date(ts).toDateString();
      if (seen.has(d)) continue;
      seen.add(d);
      if (!prev) { count = 1; prev = new Date(ts); continue; }
      const diff = (prev - new Date(ts)) / (1000 * 60 * 60 * 24);
      if (diff <= 1.5) { count++; prev = new Date(ts); }
      else break;
    }
    return count;
  })();

  return (
    <Card className="border-2 border-blue-100 bg-blue-50/40 rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-blue-800 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Your Study Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{streak}</p>
            <p className="text-xs text-blue-500">Day streak</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{topDay[0]}</p>
            <p className="text-xs text-blue-500">Most active day</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
            <p className="text-sm font-bold text-blue-700 capitalize">{topTime[0]}</p>
            <p className="text-xs text-blue-500">Peak time</p>
          </div>
        </div>
        <p className="text-xs text-blue-700 bg-white rounded-xl p-2.5 border border-blue-100">
          💡 You tend to study on <strong>{topDay[0]}s</strong> in the <strong>{timeLabels[topTime[0]]}</strong>. 
          Try setting a study habit anchored to your most consistent login time!
        </p>
      </CardContent>
    </Card>
  );
}
