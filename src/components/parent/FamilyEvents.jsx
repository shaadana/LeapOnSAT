import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FamilyEvents({ user, families }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'reminder',
    family_id: '',
    event_date: ''
  });
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['familyEvents', user?.id],
    queryFn: () => base44.entities.FamilyEvent.filter({ parent_id: user?.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (eventData) => base44.entities.FamilyEvent.create({
      ...eventData,
      parent_id: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyEvents']);
      setShowCreate(false);
      setNewEvent({ title: '', description: '', event_type: 'reminder', family_id: '', event_date: '' });
      toast.success('Event created!');
    }
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.FamilyEvent.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries(['familyEvents']);
    }
  });

  const sortedEvents = [...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-900">Events & Reminders</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-xl rounded-full font-bold border-2 border-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Family Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Family</Label>
                <Select value={newEvent.family_id} onValueChange={(value) => setNewEvent(prev => ({ ...prev, family_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map(family => (
                      <SelectItem key={family.id} value={family.id}>{family.family_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Title</Label>
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Math test on Friday"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event details..."
                  className="h-20"
                />
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent(prev => ({ ...prev, event_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="appointment">Appointment</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                />
              </div>
              <Button
               onClick={() => createMutation.mutate(newEvent)}
               disabled={!newEvent.title || !newEvent.family_id || !newEvent.event_date}
               className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-full font-bold"
              >
               Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {sortedEvents.map((event) => (
          <Card key={event.id} className={`border-4 border-white hover:shadow-2xl transition-all rounded-3xl bg-white shadow-xl ${event.completed ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-display font-bold text-stone-900 flex items-center gap-2">
                    {event.completed && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {event.title}
                  </CardTitle>
                  <p className="text-sm text-stone-600">{event.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={event.completed ? "outline" : "default"}
                  onClick={() => toggleCompleteMutation.mutate({ id: event.id, completed: !event.completed })}
                  className="rounded-full"
                >
                  {event.completed ? 'Reopen' : 'Complete'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-stone-900">{format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold capitalize">
                  {event.event_type}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card className="border-dashed border-4 border-stone-300 rounded-3xl shadow-lg">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4 font-medium">No events yet. Create your first family event!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
