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
import { Plus, Target, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HouseholdGoals({ user, families }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'academic',
    family_id: '',
    target_date: '',
    assigned_to: []
  });
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['householdGoals', user?.id],
    queryFn: () => base44.entities.HouseholdGoal.filter({ parent_id: user?.id }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (goalData) => base44.entities.HouseholdGoal.create({
      ...goalData,
      parent_id: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['householdGoals']);
      setShowCreate(false);
      setNewGoal({ title: '', description: '', category: 'academic', family_id: '', target_date: '', assigned_to: [] });
      toast.success('Goal created!');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.HouseholdGoal.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['householdGoals']);
      toast.success('Status updated');
    }
  });

  const statusConfig = {
    not_started: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Not Started' },
    in_progress: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
    completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' },
    abandoned: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Abandoned' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-900">Household Goals</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-xl rounded-full font-bold border-2 border-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Household Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Family</Label>
                <Select value={newGoal.family_id} onValueChange={(value) => setNewGoal(prev => ({ ...prev, family_id: value }))}>
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
                <Label>Goal Title</Label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Complete homework on time"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Goal details..."
                  className="h-20"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newGoal.category} onValueChange={(value) => setNewGoal(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="behavior">Behavior</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="responsibility">Responsibility</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Assign to Children</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-stone-50">
                  {newGoal.family_id && families.find(f => f.id === newGoal.family_id)?.child_ids?.length === 0 ? (
                    <p className="text-xs text-gray-600 py-2">No children in this family yet</p>
                  ) : (
                    families.find(f => f.id === newGoal.family_id)?.child_ids?.map((childId) => (
                      <label key={childId} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-white rounded">
                        <input
                          type="checkbox"
                          checked={newGoal.assigned_to.includes(childId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewGoal(prev => ({ ...prev, assigned_to: [...prev.assigned_to, childId] }));
                            } else {
                              setNewGoal(prev => ({ ...prev, assigned_to: prev.assigned_to.filter(id => id !== childId) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{childId}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <Button
               onClick={() => createMutation.mutate(newGoal)}
               disabled={!newGoal.title || !newGoal.family_id}
               className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-full font-bold"
              >
               Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const status = statusConfig[goal.status];
          const StatusIcon = status.icon;
          return (
            <Card key={goal.id} className="border-4 border-white hover:shadow-2xl transition-all rounded-3xl bg-white shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-display font-bold text-stone-900">{goal.title}</CardTitle>
                  <div className={`px-3 py-1 rounded-full ${status.bg} flex items-center gap-1`}>
                    <StatusIcon className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                  </div>
                </div>
                <p className="text-sm text-stone-600">{goal.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Category:</span>
                  <span className="font-semibold text-stone-900 capitalize">{goal.category}</span>
                </div>
                {goal.target_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">Target Date:</span>
                    <span className="font-semibold text-stone-900">{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                <Select value={goal.status} onValueChange={(value) => updateStatusMutation.mutate({ id: goal.id, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <Card className="border-dashed border-4 border-stone-300 rounded-3xl shadow-lg">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4 font-medium">No goals yet. Create your first household goal!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
