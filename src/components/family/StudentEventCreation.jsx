import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentEventCreation({ familyId, studentId }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'activity',
    event_date: '',
    event_time: '09:00',
  });
  const queryClient = useQueryClient();

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const dateTime = new Date(`${data.event_date}T${data.event_time}`).toISOString();
      return base44.entities.FamilyEvent.create({
        family_id: familyId,
        student_id: studentId,
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        event_date: dateTime,
        notify_children: [studentId],
      });
    },
    onSuccess: () => {
      toast.success('Event created successfully!');
      queryClient.invalidateQueries({ queryKey: ['familyEvents', familyId] });
      setFormData({
        title: '',
        description: '',
        event_type: 'activity',
        event_date: '',
        event_time: '09:00',
      });
      setOpen(false);
    },
    onError: () => {
      toast.error('Failed to create event');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) {
      toast.error('Title and date are required');
      return;
    }
    createEventMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700 w-full">
          <Calendar className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Family Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Event Title *</label>
            <Input
              placeholder="What's happening?"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Details about the event"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="h-20"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Event Type</label>
            <Select
              value={formData.event_type}
              onValueChange={(value) =>
                setFormData({ ...formData, event_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) =>
                  setFormData({ ...formData, event_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={formData.event_time}
                onChange={(e) =>
                  setFormData({ ...formData, event_time: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
