import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * A themed section wrapper used across detailed performance reports.
 * Uses the established display font + emerald/stone palette.
 */
export default function ReportSection({ icon: Icon, title, subtitle, accent = 'emerald', children, className = '' }) {
  const accentMap = {
    emerald: { ring: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600' },
    stone: { ring: 'border-stone-200', icon: 'bg-stone-100 text-stone-600' },
    amber: { ring: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
  };
  const a = accentMap[accent] || accentMap.emerald;

  return (
    <Card className={`border-2 ${a.ring} rounded-3xl shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${a.icon}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle
              className="text-lg text-stone-900"
              style={{ fontFamily: 'Righteous, sans-serif' }}
            >
              {title}
            </CardTitle>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
