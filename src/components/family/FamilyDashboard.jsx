import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Calendar, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import FamilyChat from '../parent/FamilyChat';
import StudentGoalCreation from './StudentGoalCreation';
import StudentEventCreation from './StudentEventCreation';

export default function FamilyDashboard({ family, user, isParent }) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: goals = [] } = useQuery({
    queryKey: ['familyGoals', family?.id],
    queryFn: () => base44.entities.HouseholdGoal.filter({ family_id: family?.id }),
    enabled: !!family?.id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['familyEvents', family?.id],
    queryFn: () => base44.entities.FamilyEvent.filter({ family_id: family?.id }),
    enabled: !!family?.id,
  });

  // For students, show goals assigned to them OR created by them
  const relevantGoals = isParent ? goals : goals.filter(g =>
    g.assigned_to?.includes(user?.id) || g.student_id === user?.id
  );

  // For students, show events they're notified about OR created by them
  const relevantEvents = isParent ? events : events.filter(e =>
    e.notify_children?.includes(user?.id) || e.student_id === user?.id
  );

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    abandoned: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Family Members</p>
                    <p className="text-3xl font-bold text-gray-900">{family?.child_ids?.length || 0}</p>
                  </div>
                  <Users className="w-10 h-10 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Goals</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {relevantGoals.filter(g => g.status === 'in_progress').length}
                    </p>
                  </div>
                  <Target className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Upcoming Events</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {relevantEvents.filter(e => !e.completed).length}
                    </p>
                  </div>
                  <Calendar className="w-10 h-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-2 border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relevantGoals.slice(0, 2).map(goal => (
                <div key={goal.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{goal.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[goal.status]}`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          {!isParent && (
            <StudentGoalCreation familyId={family?.id} studentId={user?.id} />
          )}
          {relevantGoals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">{isParent ? 'Create your first goal' : 'No goals yet'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {relevantGoals.map(goal => (
                <Card key={goal.id} className="border-2 border-stone-200 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-display text-gray-900">{goal.title}</CardTitle>
                        <p className="text-xs text-gray-600 mt-1">{goal.category}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[goal.status]}`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                    {goal.target_date && (
                      <p className="text-xs text-gray-500">
                        Due: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                      </p>
                    )}
                    {goal.progress_notes && (
                      <div className="text-xs bg-emerald-50 p-2 rounded border border-emerald-200">
                        <span className="font-semibold text-emerald-900">Progress: </span>
                        <span className="text-emerald-800">{goal.progress_notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {!isParent && (
            <StudentEventCreation familyId={family?.id} studentId={user?.id} />
          )}
          {relevantEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">{isParent ? 'Create your first event' : 'No upcoming events'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {relevantEvents.map(event => (
                <Card key={event.id} className={`border-2 transition-all ${event.completed ? 'border-stone-200 opacity-60' : 'border-orange-200'}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-display text-gray-900">{event.title}</CardTitle>
                        <p className="text-xs text-gray-600 capitalize mt-1">{event.event_type}</p>
                      </div>
                      {event.completed && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                          Completed
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event.description && (
                      <p className="text-sm text-gray-600">{event.description}</p>
                    )}
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(event.event_date), 'MMM d, yyyy @ h:mm a')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <FamilyChat familyId={family?.id} user={user} isParent={isParent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
