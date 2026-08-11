import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, Edit3, Target, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function RecommendedAssignments({ studentId, classId }) {
  const queryClient = useQueryClient();
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedAssignment, setEditedAssignment] = useState(null);

  const { data: recommendations, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recommendedAssignments', studentId],
    queryFn: async () => {
      const res = await base44.functions.invoke('generateRecommendedAssignments', { studentId, classId });
      return res.data?.recommendations || [];
    },
    enabled: !!studentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const assignMutation = useMutation({
    mutationFn: async (assignment) => {
      const user = await base44.auth.me();
      const assignmentData = {
        teacher_id: user.id,
        class_id: classId,
        assignment_type: assignment.assignment_type,
        title: assignment.title,
        description: assignment.description,
        assignment_config: {
          domains: assignment.domains || [],
          difficulty: assignment.difficulty || 'mixed',
          session_type: 'practice',
        },
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        status: 'active'
      };

      const newAssignment = await base44.entities.Assignment.create(assignmentData);

      // We also need to assign it to the student by creating a StudentAssignmentProgress record
      await base44.entities.StudentAssignmentProgress.create({
        assignment_id: newAssignment.id,
        student_id: studentId,
        status: 'not_started',
        score: 0,
        progress_percentage: 0
      });

      return newAssignment;
    },
    onSuccess: () => {
      toast.success("Assignment sent to student!");
      queryClient.invalidateQueries(['studentAssignmentProgress', studentId]);
      queryClient.invalidateQueries(['studentAllAssignments', studentId]);
    },
    onError: (err) => {
      toast.error("Failed to assign: " + err.message);
    }
  });

  if (isLoading || isFetching) {
    return (
      <div className="text-center py-10 bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-200">
        <Loader2 className="w-10 h-10 text-emerald-500 mx-auto mb-4 animate-spin" />
        <p className="text-emerald-700 font-medium">Analyzing student data...</p>
        <p className="text-sm text-emerald-600/70 mt-1">Generating personalized recommendations</p>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-10 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
        <Sparkles className="w-10 h-10 text-stone-300 mx-auto mb-2" />
        <p className="text-stone-500 text-sm">No recommendations available</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const handleEditClick = (rec, index) => {
    setEditingIndex(index);
    setEditedAssignment({ ...rec, domains: rec.domains.join(', ') });
  };

  const handleSaveEdit = (index) => {
    const updatedRecs = [...recommendations];
    updatedRecs[index] = {
      ...editedAssignment,
      domains: editedAssignment.domains.split(',').map(d => d.trim()).filter(Boolean)
    };
    queryClient.setQueryData(['recommendedAssignments', studentId], updatedRecs);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          AI-Recommended Assignments
        </h3>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-8">
          Regenerate
        </Button>
      </div>

      <div className="grid gap-4">
        {recommendations.map((rec, idx) => (
          <Card key={idx} className="border-2 border-emerald-100 bg-white hover:shadow-md transition-shadow">
            {editingIndex === idx ? (
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600">Title</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    value={editedAssignment.title}
                    onChange={e => setEditedAssignment({...editedAssignment, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600">Description</label>
                  <textarea 
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    value={editedAssignment.description}
                    onChange={e => setEditedAssignment({...editedAssignment, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600">Domains (comma separated)</label>
                    <input 
                      className="w-full mt-1 p-2 border rounded-md text-sm"
                      value={editedAssignment.domains}
                      onChange={e => setEditedAssignment({...editedAssignment, domains: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-600">Difficulty</label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md text-sm"
                      value={editedAssignment.difficulty}
                      onChange={e => setEditedAssignment({...editedAssignment, difficulty: e.target.value})}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => handleSaveEdit(idx)}>Save</Button>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {rec.assignment_type === 'sat_practice' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-100"><Target className="w-3 h-3 mr-1" /> Math</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 shadow-none hover:bg-amber-100"><BookOpen className="w-3 h-3 mr-1" /> English</Badge>
                      )}
                      <Badge variant="outline" className="text-stone-500 capitalize">{rec.difficulty}</Badge>
                    </div>
                    <CardTitle className="text-base text-stone-800 leading-tight">{rec.title}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-600" onClick={() => handleEditClick(rec, idx)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-sm text-stone-600 mb-3">{rec.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.domains.map(d => (
                      <span key={d} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] rounded-md border border-stone-200 uppercase tracking-wide">
                        {d.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 justify-end">
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={() => assignMutation.mutate(rec)}
                    disabled={assignMutation.isPending}
                  >
                    {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to Student
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
