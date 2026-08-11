import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function FamilyTasks({ user, families }) {
  const queryClient = useQueryClient();

  const { data: assignedGoals = [] } = useQuery({
    queryKey: ['studentFamilyTasks', user?.id],
    queryFn: async () => {
      if (!families || families.length === 0) return [];
      const goals = await base44.entities.HouseholdGoal.list();
      return goals.filter(goal => goal.assigned_to?.includes(user?.id));
    },
    enabled: !!user?.id && families?.length > 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.HouseholdGoal.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['studentFamilyTasks']);
    }
  });

  const statusConfig = {
    not_started: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Not Started' },
    in_progress: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Progress' },
    completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' },
    abandoned: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Abandoned' }
  };

  const categoryColors = {
    academic: 'text-blue-700',
    behavior: 'text-purple-700',
    health: 'text-green-700',
    responsibility: 'text-orange-700',
    social: 'text-pink-700',
    other: 'text-gray-700'
  };

  if (assignedGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-display font-bold text-gray-900">Family Goals for You</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {assignedGoals.map((goal) => {
          const status = statusConfig[goal.status];
          const StatusIcon = status.icon;
          return (
            <Card key={goal.id} className="border-2 border-emerald-100 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base font-bold text-gray-900">{goal.title}</CardTitle>
                    <p className={`text-xs font-medium mt-1 capitalize ${categoryColors[goal.category]}`}>
                      {goal.category}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full ${status.bg} flex items-center gap-1 whitespace-nowrap`}>
                    <StatusIcon className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {goal.description && (
                  <p className="text-sm text-gray-600">{goal.description}</p>
                )}
                {goal.target_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Due:</span>
                    <span className="font-semibold text-gray-900">{format(new Date(goal.target_date), 'MMM d')}</span>
                  </div>
                )}
                {goal.progress_notes && (
                  <div className="bg-stone-50 p-2 rounded text-xs text-gray-700 border border-stone-200">
                    <span className="font-semibold">Progress: </span>{goal.progress_notes}
                  </div>
                )}
                <Select value={goal.status} onValueChange={(value) => updateStatusMutation.mutate({ id: goal.id, status: value })}>
                  <SelectTrigger className="text-sm">
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
    </div>
  );
}
