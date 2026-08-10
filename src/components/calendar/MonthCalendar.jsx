import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';

const TYPE_DOT = {
  class: 'bg-emerald-600',
  availability: 'bg-teal-500',
  study_session: 'bg-stone-400',
};

const TYPE_FILL = {
  class: 'bg-emerald-100 text-emerald-800',
  availability: 'bg-teal-50 text-teal-700',
  study_session: 'bg-stone-100 text-stone-600',
};

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MonthCalendar({ selectedDate, onSelectDate, events = [] }) {
  const [month, setMonth] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = {};
  events.forEach((e) => {
    if (!e.start_time) return;
    const key = format(new Date(e.start_time), 'yyyy-MM-dd');
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(e);
  });

  const primaryType = (evs) => {
    if (evs.some((e) => e.event_type === 'class')) return 'class';
    if (evs.some((e) => e.event_type === 'availability')) return 'availability';
    if (evs.some((e) => e.event_type === 'study_session')) return 'study_session';
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(subMonths(month, 1))}
          className="h-8 w-8 text-stone-600 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-stone-800">
          {format(month, 'MMMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(addMonths(month, 1))}
          className="h-8 w-8 text-stone-600 hover:text-emerald-700"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[0.7rem] font-medium text-stone-400 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay[key] || [];
          const primary = primaryType(dayEvents);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayFlag = isToday(day);
          const inMonth = isSameMonth(day, month);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate && onSelectDate(day)}
              className={[
                'relative aspect-square w-full rounded-xl flex flex-col items-center justify-center text-sm transition-colors',
                inMonth ? '' : 'opacity-30',
                primary
                  ? TYPE_FILL[primary]
                  : isTodayFlag
                  ? 'text-emerald-700 hover:bg-emerald-50'
                  : 'text-stone-700 hover:bg-stone-100',
                isTodayFlag ? 'font-bold' : 'font-medium',
                isSelected ? 'ring-2 ring-emerald-500 ring-offset-1' : '',
              ].join(' ')}
            >
              <span>{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 absolute bottom-1">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        TYPE_DOT[e.event_type] || 'bg-stone-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
