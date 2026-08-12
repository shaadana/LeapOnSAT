import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import { Calendar as CalendarIcon, Trash2, Plus, Users, Check, X } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function StudyCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'study_session',
    start_time: '',
    end_time: '',
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['calendarEvents', user?.id],
    queryFn: async () => {
      const myEvents = await base44.entities.CalendarEvent.filter({ user_id: user.id }, '-created_date', 1000);
      const classEvents = await base44.entities.CalendarEvent.filter({ event_type: 'class' }, '-created_date', 1000);
      const visibleClassEvents = classEvents.filter(
        (e) => e.visible_to_students && e.visible_to_students.includes(user.id)
      );
      const combined = [...myEvents, ...visibleClassEvents];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      return unique;
    },
    enabled: !!user?.id,
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ['myRsvps', user?.id],
    queryFn: async () => base44.entities.CalendarRSVP.filter({ student_id: user.id }, '-created_date', 500),
    enabled: !!user?.id,
  });

  const rsvpMap = useMemo(() => {
    const m = {};
    myRsvps.forEach((r) => { m[r.calendar_event_id] = r; });
    return m;
  }, [myRsvps]);

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.CalendarEvent.create({ ...data, user_id: user.id, visible_to_students: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', user?.id] });
      setShowDialog(false);
      setFormData({ title: '', description: '', event_type: 'study_session', start_time: '', end_time: '' });
      toast.success('Event added to calendar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', user?.id] });
      toast.success('Event removed');
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ event, response }) => {
      const existing = rsvpMap[event.id];
      if (existing) {
        if (existing.response === response) {
          await base44.entities.CalendarRSVP.delete(existing.id);
        } else {
          await base44.entities.CalendarRSVP.update(existing.id, { response });
        }
      } else {
        await base44.entities.CalendarRSVP.create({
          calendar_event_id: event.id,
          student_id: user.id,
          student_name: user.name || user.full_name || user.email,
          response,
          class_id: event.class_id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRsvps', user?.id] });
      toast.success('Response saved');
    },
  });

  const eventsForSelectedDate = allEvents
    .filter((e) => e.start_time && isSameDay(parseISO(e.start_time), selectedDate))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const getTypeLabel = (type) => {
    switch (type) {
      case 'study_session': return 'Study Session';
      case 'availability': return 'My Availability';
      case 'class': return 'Class';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'study_session': return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'availability': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'class': return 'bg-emerald-600 text-white border-emerald-600';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Study Calendar</h2>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold">
              <Plus className="w-5 h-5 mr-2" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Calendar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Event Type</Label>
                <Select value={formData.event_type} onValueChange={(val) => setFormData((prev) => ({ ...prev, event_type: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study_session">Study Session</SelectItem>
                    <SelectItem value="availability">My Availability (Visible to Teachers)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  placeholder={formData.event_type === 'availability' ? 'e.g. Available for tutoring' : 'e.g. Math Practice'}
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Additional details..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="datetime-local" value={formData.end_time} onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))} />
                </div>
              </div>

              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.title || !formData.start_time || !formData.end_time}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                Save Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="border-2 border-stone-200">
            <CardContent className="p-4">
              <MonthCalendar
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                events={allEvents}
              />
            </CardContent>
          </Card>
          <div className="mt-4 flex flex-col gap-2 pl-2">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <div className="w-3 h-3 rounded-md bg-emerald-600" /> Teacher Classes
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <div className="w-3 h-3 rounded-md bg-teal-500" /> My Availability
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <div className="w-3 h-3 rounded-md bg-stone-400" /> Study Sessions
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="border-2 border-stone-200 h-full">
            <CardHeader className="bg-stone-50 border-b border-stone-100 rounded-t-xl">
              <CardTitle className="text-lg text-stone-800">
                Schedule for {format(selectedDate, 'EEEE, MMMM do, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {eventsForSelectedDate.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                  <p>No events scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsForSelectedDate.map((event) => {
                    const rsvp = rsvpMap[event.id];
                    return (
                      <div key={event.id} className="p-4 rounded-xl border border-stone-200 flex gap-4 items-start bg-white shadow-sm hover:border-emerald-300 transition-colors">
                        <div className="w-20 text-center flex-shrink-0">
                          <div className="text-sm font-bold text-stone-700">
                            {format(parseISO(event.start_time), 'h:mm a')}
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            to {format(parseISO(event.end_time), 'h:mm a')}
                          </div>
                        </div>

                        <div className="w-px h-12 bg-stone-200 hidden sm:block" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-stone-900 truncate">{event.title}</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className={getTypeColor(event.event_type)}>
                                  {getTypeLabel(event.event_type)}
                                </Badge>
                                {event.event_type === 'class' && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Scheduled Class
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-stone-600 mt-2">{event.description}</p>
                              )}
                              {event.event_type === 'class' && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant={rsvp?.response === 'yes' ? 'default' : 'outline'}
                                    onClick={() => rsvpMutation.mutate({ event, response: 'yes' })}
                                    className={
                                      rsvp?.response === 'yes'
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                    }
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" /> Works for me
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={rsvp?.response === 'no' ? 'default' : 'outline'}
                                    onClick={() => rsvpMutation.mutate({ event, response: 'no' })}
                                    className={
                                      rsvp?.response === 'no'
                                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                        : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                                    }
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" /> Can't make it
                                  </Button>
                                </div>
                              )}
                            </div>
                            {event.user_id === user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(event.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
