import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Copy, Users, ChevronRight, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ChildrenList from './ChildrenList';
import StudentProfileView from './StudentProfileView';
import FamilyChat from './FamilyChat';

export default function MyFamilies({ user, families }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newFamily, setNewFamily] = useState({
    family_name: '',
    description: ''
  });
  const queryClient = useQueryClient();

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createMutation = useMutation({
    mutationFn: (familyData) => base44.entities.Family.create({
      ...familyData,
      parent_id: user.id,
      join_code: generateJoinCode(),
      child_ids: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['parentFamilies']);
      setShowCreate(false);
      setNewFamily({ family_name: '', description: '' });
      toast.success('Family created!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (familyId) => base44.entities.Family.delete(familyId),
    onSuccess: () => {
      queryClient.invalidateQueries(['parentFamilies']);
      toast.success('Family deleted');
    }
  });

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Join code copied!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-stone-900">My Families</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-xl rounded-full font-bold border-2 border-white">
             <Plus className="w-4 h-4 mr-2" />
             Create Family
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Family</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Family Name</Label>
                <Input
                  value={newFamily.family_name}
                  onChange={(e) => setNewFamily(prev => ({ ...prev, family_name: e.target.value }))}
                  placeholder="e.g., The Smith Family"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newFamily.description}
                  onChange={(e) => setNewFamily(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Family details..."
                  className="h-20"
                />
              </div>
              <Button
               onClick={() => createMutation.mutate(newFamily)}
               disabled={!newFamily.family_name}
               className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-full font-bold"
              >
               Create Family
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedFamily ? (
        <div className="space-y-4">
          <Tabs defaultValue="children">
            <TabsList>
              <TabsTrigger value="children">
                <Users className="w-4 h-4 mr-2" />
                Children
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare className="w-4 h-4 mr-2" />
                Family Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="children">
              {selectedStudentId ? (
                <StudentProfileView studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />
              ) : (
                <ChildrenList 
                  familyData={selectedFamily} 
                  onBack={() => setSelectedFamily(null)}
                  onViewProfile={(studentId) => setSelectedStudentId(studentId)}
                />
              )}
            </TabsContent>
            <TabsContent value="chat">
              <FamilyChat familyId={selectedFamily.id} user={user} isParent={true} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map((family) => (
            <Card key={family.id} className="hover:shadow-2xl transition-all border-4 border-white hover:-translate-y-2 hover:rotate-1 rounded-3xl bg-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-display font-bold text-stone-900">{family.family_name}</CardTitle>
                {family.description && (
                  <p className="text-sm text-stone-600">{family.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border-2 border-emerald-200">
                  <div>
                    <p className="text-xs text-stone-600">Join Code</p>
                    <p className="text-xl font-bold text-emerald-600">{family.join_code}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyJoinCode(family.join_code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Users className="w-4 h-4" />
                  <span>{family.child_ids?.length || 0} children</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedFamily(family)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-full font-bold"
                  >
                    View Children
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
                        <AlertDialogTitle>Delete {family.family_name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this family and remove all children from it. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(family.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Family
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

      {families.length === 0 && (
        <Card className="border-dashed border-4 border-stone-300 rounded-3xl shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4 font-medium">No families yet. Create your first family!</p>
            <Button onClick={() => setShowCreate(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Family
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
