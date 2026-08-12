import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, BookOpen, Check, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function JoinClass() {
  const [user, setUser] = useState(null);
  const [joinType, setJoinType] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [joinedName, setJoinedName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
    setJoined(false);
    setJoinType(null);
    setJoinCode('');
  }, []);

  const { data: availableClasses } = useQuery({
    queryKey: ['joinableClasses'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getJoinableClasses');
      return res.data.classes || [];
    },
    enabled: joinType === 'class',
  });

  const joinMutation = useMutation({
    mutationFn: async (code) => {
      if (joinType === 'class') {
        const [classData] = await base44.entities.TeacherClass.filter({ join_code: code.toUpperCase() });
        if (!classData) throw new Error('Invalid class join code');
        if (classData.student_ids?.includes(user.id)) throw new Error('Already in this class');
        
        await base44.entities.TeacherClass.update(classData.id, {
          student_ids: [...(classData.student_ids || []), user.id]
        });
        return { name: classData.class_name };
      } else {
        const [familyData] = await base44.entities.Family.filter({ join_code: code.toUpperCase() });
        if (!familyData) throw new Error('Invalid family join code');
        if (familyData.child_ids?.includes(user.id)) throw new Error('Already in this family');
        
        await base44.entities.Family.update(familyData.id, {
          child_ids: [...(familyData.child_ids || []), user.id]
        });
        return { name: familyData.family_name };
      }
    },
    onSuccess: (data) => {
      toast.success(`Joined ${data.name}!`);
      setJoinedName(data.name);
      setJoined(true);
      setTimeout(() => navigate(createPageUrl('MyGroups')), 2000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to join');
    }
  });

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinMutation.mutate(joinCode.trim());
  };

  if (joined) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="border-2 border-emerald-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Successfully Joined!</h2>
            <p className="text-gray-600 mb-1">{joinedName}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!joinType) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="border-2 border-emerald-200 shadow-2xl">
          <CardHeader className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardTitle className="text-2xl text-emerald-900">What are you joining?</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <Button
              onClick={() => setJoinType('class')}
              className="w-full h-20 flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <BookOpen className="w-6 h-6" />
              <span className="font-semibold">Join a Class</span>
            </Button>
            <Button
              onClick={() => setJoinType('family')}
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Home className="w-6 h-6" />
              <span className="font-semibold">Join a Family</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <Card className="border-2 border-emerald-200 shadow-2xl">
        <CardHeader className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardTitle className="flex items-center gap-2 text-2xl text-emerald-900">
            {joinType === 'class' ? (
              <>
                <BookOpen className="w-6 h-6" />
                Join a Class
              </>
            ) : (
              <>
                <Home className="w-6 h-6" />
                Join a Family
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Enter Join Code</Label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="ABC123"
              className="mt-2 text-center text-2xl font-mono font-bold tracking-wider"
              maxLength={6}
            />
          </div>

          {joinType === 'class' && (
            <div className="pt-2">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or select a class</span>
                </div>
              </div>
              <Select value={joinCode} onValueChange={(val) => setJoinCode(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class to join" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses?.map((c) => (
                    <SelectItem key={c.id} value={c.join_code}>
                      {c.class_name} ({c.teacher_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleJoin}
              disabled={!joinCode.trim() || joinMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg"
            >
              {joinMutation.isPending ? 'Joining...' : 'Join'}
            </Button>
            <Button
              onClick={() => {
                setJoinType(null);
                setJoinCode('');
              }}
              variant="outline"
              className="w-full"
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
