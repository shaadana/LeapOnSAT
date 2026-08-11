import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, User } from 'lucide-react';
import { createPageUrl } from '../../utils';

export default function TeachersList({ user }) {
  const navigate = useNavigate();

  // Get all classes the student is in
  const { data: allClasses = [] } = useQuery({
    queryKey: ['studentClasses', user?.id],
    queryFn: () => base44.entities.TeacherClass.list(),
    enabled: !!user,
  });

  const studentClasses = allClasses.filter(c => c.student_ids?.includes(user?.id));

  // Get unique teachers from student's classes
  const teachers = Array.from(
    new Map(
      studentClasses.map(c => [c.teacher_id, c])
    ).values()
  ).map(c => ({ teacher_id: c.teacher_id, class_name: c.class_name }));

  return (
    <div className="space-y-2">
      {teachers.length === 0 ? (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 text-xs">Join a class to message teachers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map((teacher) => (
            <Button
              key={teacher.teacher_id}
              onClick={() => navigate(`${createPageUrl('PrivateChat')}?teacher_id=${teacher.teacher_id}`)}
              variant="outline"
              className="w-full justify-between border-emerald-200 hover:bg-emerald-50 h-auto p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{teacher.class_name}</p>
                </div>
              </div>
              <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
