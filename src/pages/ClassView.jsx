import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ClassAnnouncements from '../components/class/ClassAnnouncements';
import ClassChat from '../components/class/ClassChat';
import ClassMedia from '../components/class/ClassMedia';
import ClassCalendar from '../components/class/ClassCalendar';
import { BookOpen, MessageSquare, Bell, ArrowLeft, Image as ImageIcon, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClassView() {
  const [user, setUser] = useState(null);
  const [classId, setClassId] = useState(null);
  const [activeView, setActiveView] = useState('announcements');
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

    const urlParams = new URLSearchParams(window.location.search);
    setClassId(urlParams.get('class_id'));
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const classes = await base44.entities.TeacherClass.filter({ id: classId });
      return classes[0];
    },
    enabled: !!classId,
  });

  if (!user || !classData) return null;

  const isTeacher = user.id === classData.teacher_id;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-600" />
            {classData.class_name}
          </h1>
          {classData.description && (
            <p className="text-gray-600 mt-1">{classData.description}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all border-2 ${
            activeView === 'announcements' 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-emerald-200'
          }`}
          onClick={() => setActiveView('announcements')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Announcements</h3>
                <p className="text-sm text-gray-600">Class updates & assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all border-2 ${
            activeView === 'chat' 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-emerald-200'
          }`}
          onClick={() => setActiveView('chat')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Class Chat</h3>
                <p className="text-sm text-gray-600">Group discussion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all border-2 ${
            activeView === 'media' 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-emerald-200'
          }`}
          onClick={() => setActiveView('media')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Media</h3>
                <p className="text-sm text-gray-600">Shared files & docs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all border-2 ${
            activeView === 'calendar' 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-gray-200 hover:border-emerald-200'
          }`}
          onClick={() => setActiveView('calendar')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Calendar</h3>
                <p className="text-sm text-gray-600">Scheduled classes & RSVP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        {activeView === 'announcements' && (
          <ClassAnnouncements classId={classId} isTeacher={isTeacher} user={user} />
        )}
        {activeView === 'chat' && (
          <ClassChat classId={classId} user={user} isTeacher={isTeacher} />
        )}
        {activeView === 'media' && (
          <ClassMedia classId={classId} />
        )}
        {activeView === 'calendar' && (
          <ClassCalendar classId={classId} user={user} />
        )}
      </div>
    </div>
  );
}
