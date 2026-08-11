import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Users, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import StudentsList from './StudentsList';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function MyClasses({ user, classes }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClass, setNewClass] = useState({
    class_name: '',
    description: ''
  });
  const queryClient = useQueryClient();

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createMutation = useMutation({
    mutationFn: (classData) => base44.entities.TeacherClass.create({
      ...classData,
      teacher_id: user.id,
      join_code: generateJoinCode(),
      student_ids: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherClasses']);
      setShowCreate(false);
      setNewClass({ class_name: '', description: '' });
      toast.success('Class created!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (classId) => base44.entities.TeacherClass.delete(classId),
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherClasses']);
      toast.success('Class deleted');
    }
  });

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Join code copied!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-900">My Classes</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-xl rounded-full font-bold border-2 border-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Class Name</Label>
                <Input
                  value={newClass.class_name}
                  onChange={(e) => setNewClass(prev => ({ ...prev, class_name: e.target.value }))}
                  placeholder="e.g., Algebra 1 - Period 3"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newClass.description}
                  onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Class details..."
                  className="h-20"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate(newClass)}
                disabled={!newClass.class_name}
                className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold"
              >
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedClass ? (
        <StudentsList classData={selectedClass} onBack={() => setSelectedClass(null)} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-2xl transition-all border-4 border-white hover:-translate-y-2 hover:rotate-1 rounded-3xl bg-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-display font-bold text-stone-900">{cls.class_name}</CardTitle>
                {cls.description && (
                  <p className="text-sm text-stone-600">{cls.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border-2 border-emerald-200">
                <div>
                  <p className="text-xs text-stone-600">Join Code</p>
                    <p className="text-xl font-bold text-emerald-600">{cls.join_code}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyJoinCode(cls.join_code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Users className="w-4 h-4" />
                  <span>{cls.student_ids?.length || 0} students</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedClass(cls)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 shadow-lg rounded-full font-bold"
                  >
                    View Students
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {cls.class_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this class and remove all students from it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(cls.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Class
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {classes.length === 0 && (
        <Card className="border-dashed border-4 border-stone-300 rounded-3xl shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4 font-medium">No classes yet. Create your first class!</p>
            <Button onClick={() => setShowCreate(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
