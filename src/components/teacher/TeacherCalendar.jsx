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
import { Calendar as CalendarIcon, Trash2, Plus, Users, UserCircle, Check, X } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function TeacherCalendar({ user, classes }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'class',
    start_time: '',
    end_time: '',
    class_id: '',
    assign_to: 'all',
    specific_student_ids: [],
  });

  const allStudentIds = classes.flatMap((c) => c.student_ids || []);

  const { data: studentsData } = useQuery({
    queryKey: ['classStudents', formData.class_id],
    queryFn: async () => {
      if (!formData.class_id) return [];
      const res = await base44.functions.invoke('getClassStudents', { class_id: formData.class_id });
      return res.data?.students || [];
    },
    enabled: !!formData.class_id,
  });

  const { data: studentProfiles } = useQuery({
    queryKey: ['teacherStudentsProfiles'],
    queryFn: async () => {
      if (!allStudentIds.length) return [];
      return await base44.entities.User.filter({ id: { $in: allStudentIds } });
    },
    enabled: !!allStudentIds.length,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['teacherCalendarEvents', user?.id],
    queryFn: async () => {
      const myEvents = await base44.entities.CalendarEvent.filter({ user_id: user.id }, '-created_date', 1000);
      let studentEvents = [];
      if (allStudentIds.length > 0) {
        studentEvents = await base44.entities.CalendarEvent.filter(
          { user_id: { $in: allStudentIds } },
          '-created_date',
          1000
        );
      }
      const combined = [...myEvents, ...studentEvents];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      return unique;
    },
    enabled: !!user?.id,
  });

  const classEventIds = useMemo(
    () => allEvents.filter((e) => e.event_type === 'class').map((e) => e.id),
    [allEvents]
  );

  const { data: rsvps = [] } = useQuery({
    queryKey: ['classRsvps', classEventIds.join(',')],
    queryFn: async () => {
      if (!classEventIds.length) return [];
      return await base44.entities.CalendarRSVP.filter(
        { calendar_event_id: { $in: classEventIds } },
        '-created_date',
        500
      );
    },
    enabled: classEventIds.length > 0,
  });

  const rsvpCounts = useMemo(() => {
    const m = {};
    rsvps.forEach((r) => {
      if (!m[r.calendar_event_id]) m[r.calendar_event_id] = { yes: 0, no: 0 };
      if (r.response === 'yes') m[r.calendar_event_id].yes++;
      else if (r.response === 'no') m[r.calendar_event_id].no++;
    });
    return m;
  }, [rsvps]);

  const createMutation = useMutation({
    mutationFn: (data) => {
      let visibleTo = [];
      if (data.assign_to === 'specific') {
        visibleTo = data.specific_student_ids;
      } else {
        const classObj = classes.find((c) => c.id === data.class_id);
        visibleTo = classObj?.student_ids || [];
      }
      return base44.entities.CalendarEvent.create({
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        start_time: data.start_time,
        end_time: data.end_time,
        class_id: data.class_id,
        user_id: user.id,
        visible_to_students: visibleTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherCalendarEvents', user?.id] });
      setShowDialog(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'class',
        start_time: '',
        end_time: '',
        class_id: '',
        assign_to: 'all',
        specific_student_ids: [],
      });
      toast.success('Class added to calendar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherCalendarEvents', user?.id] });
      toast.success('Event removed');
    },
  });

  const eventsForSelectedDate = allEvents
    .filter((e) => e.start_time && isSameDay(parseISO(e.start_time), selectedDate))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const getTypeLabel = (type) => {
    switch (type) {
      case 'study_session': return 'Student Study Session';
      case 'availability': return 'Student Availability';
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

  const getStudentName = (userId) => {
    if (userId === user.id) return 'Me';
    const st = studentProfiles?.find((p) => p.id === userId);
    return st ? (st.name || st.full_name || st.email) : 'Student';
  };

  const isCreateDisabled =
    !formData.title ||
    !formData.start_time ||
    !formData.end_time ||
    !formData.class_id ||
    (formData.assign_to === 'specific' && formData.specific_student_ids.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-900">Calendar</h2>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold">
              <Plus className="w-5 h-5 mr-2" /> Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Class to Calendar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. 1-on-1 Review Session"
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

              <div>
                <Label>Class</Label>
                <Select value={formData.class_id} onValueChange={(val) => setFormData((prev) => ({ ...prev, class_id: val, specific_student_ids: [] }))}>
                  <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.class_id && (
                <div>
                  <Label>Visible To</Label>
                  <Select value={formData.assign_to} onValueChange={(val) => setFormData((prev) => ({ ...prev, assign_to: val, specific_student_ids: [] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Entire Class</SelectItem>
                      <SelectItem value="specific">Specific Students</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.assign_to === 'specific' && (
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto border border-stone-200 rounded-lg p-2">
                      {studentsData?.length === 0 && <p className="text-sm text-stone-500 p-2">Loading students...</p>}
                      {studentsData?.map((s) => (
                        <label key={s.user.id} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.specific_student_ids?.includes(s.user.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                specific_student_ids: checked
                                  ? [...(prev.specific_student_ids || []), s.user.id]
                                  : (prev.specific_student_ids || []).filter((id) => id !== s.user.id),
                              }));
                            }}
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span className="text-sm text-stone-700">{s.user.name || s.user.full_name || s.user.email || 'Student'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                disabled={isCreateDisabled}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                Save Class
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
              <div className="w-3 h-3 rounded-md bg-emerald-600" /> Your Classes
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <div className="w-3 h-3 rounded-md bg-teal-500" /> Student Availabilities
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="border-2 border-stone-200 h-full">
            <CardHeader className="bg-stone-50 border-b border-stone-100 rounded-t-xl">
              <CardTitle className="text-lg text-stone-800">
                Events for {format(selectedDate, 'EEEE, MMMM do, yyyy')}
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
                    const counts = rsvpCounts[event.id];
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
                                {event.user_id !== user.id && (
                                  <Badge variant="outline" className="bg-stone-100 text-stone-700 flex items-center gap-1">
                                    <UserCircle className="w-3 h-3" /> {getStudentName(event.user_id)}
                                  </Badge>
                                )}
                                {event.event_type === 'class' && event.visible_to_students?.length > 0 && (
                                  <Badge variant="outline" className="bg-stone-50 text-stone-600">
                                    {event.visible_to_students.length} student(s)
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-stone-600 mt-2">{event.description}</p>
                              )}
                              {event.event_type === 'class' && counts && (counts.yes > 0 || counts.no > 0) && (
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                                  {counts.yes > 0 && (
                                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                                      <Check className="w-3 h-3" /> {counts.yes} can make it
                                    </span>
                                  )}
                                  {counts.no > 0 && (
                                    <span className="text-rose-600 font-medium flex items-center gap-1">
                                      <X className="w-3 h-3" /> {counts.no} can't
                                    </span>
                                  )}
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
