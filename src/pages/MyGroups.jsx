import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Home } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function MyGroups() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        if (userData.user_type === 'teacher') {
          navigate(createPageUrl('TeacherPortal'));
        } else if (userData.user_type === 'parent') {
          navigate(createPageUrl('ParentPortal'));
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [navigate]);

  const { data: allClasses = [] } = useQuery({
    queryKey: ['studentClasses', user?.id],
    queryFn: () => base44.entities.TeacherClass.list(),
    enabled: !!user,
  });

  const { data: allFamilies = [] } = useQuery({
    queryKey: ['studentFamilies', user?.id],
    queryFn: () => base44.entities.Family.list(),
    enabled: !!user,
  });

  const myClasses = allClasses.filter(c => c.student_ids?.includes(user?.id));
  const myFamilies = allFamilies.filter(f => f.child_ids?.includes(user?.id));
  const allGroups = [
    ...myClasses.map(c => ({ ...c, type: 'class', icon: BookOpen, groupName: c.class_name })),
    ...myFamilies.map(f => ({ ...f, type: 'family', icon: Home, groupName: f.family_name }))
  ];

  if (!user) return null;

  const isEmpty = myClasses.length === 0 && myFamilies.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gray-900">My Groups</h1>
        <p className="text-gray-600">View and manage your classes and families</p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">You're not part of any groups yet</p>
            <Button onClick={() => navigate(createPageUrl('JoinClass'))} className="bg-emerald-600 hover:bg-emerald-700">
              Join a Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => navigate(createPageUrl('JoinClass'))} className="bg-emerald-600 hover:bg-emerald-700">
              + Join Another Group
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allGroups.map((group) => {
              const Icon = group.type === 'class' ? BookOpen : Home;
              const memberCount = group.type === 'class' ? group.student_ids?.length : group.child_ids?.length;
              const description = group.type === 'class' ? group.description : undefined;
              
              return (
              <Card key={`${group.type}-${group.id}`} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-emerald-600" />
                    {group.groupName}
                  </CardTitle>
                  <span className="text-xs font-medium text-emerald-600 capitalize">
                    {group.type}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {description && (
                    <p className="text-sm text-gray-600">{description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{memberCount || 0} members</span>
                  </div>
                  <Button 
                    onClick={() => navigate(
                      group.type === 'class' 
                        ? createPageUrl('ClassView') + '?class_id=' + group.id
                        : createPageUrl('StudentFamilyView') + '?family_id=' + group.id
                    )}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {group.type === 'class' ? 'View Class' : 'View Family'}
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
