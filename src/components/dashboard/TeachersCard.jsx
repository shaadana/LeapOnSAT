import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import TeachersList from '@/components/student/TeachersList';

export default function TeachersCard({ user }) {
  const [hasTeachers, setHasTeachers] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.TeacherClass.list()
      .then(classes => {
        const inAClass = classes.some(c => c.student_ids?.includes(user.id));
        setHasTeachers(inAClass);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [user?.id]);

  if (!checked || !hasTeachers) return null;

  return (
    <Card className="bg-white/70 backdrop-blur-xl border-2 border-emerald-200 shadow-[0_8px_30px_rgb(16,185,129,0.12)]">
      <CardHeader>
        <CardTitle className="text-lg font-display text-gray-900">Teachers</CardTitle>
      </CardHeader>
      <CardContent className="p-0 px-6 pb-6">
        <TeachersList user={user} />
      </CardContent>
    </Card>
  );
}
