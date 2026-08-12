import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, ChevronDown, LayoutDashboard, Target, Calendar } from 'lucide-react';
import OverviewTab from '@/components/insights/OverviewTab';
import SkillsTab from '@/components/insights/SkillsTab';
import HabitsTab from '@/components/insights/HabitsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'skills', label: 'Skills & Mistakes', icon: Target },
  { id: 'habits', label: 'Study Habits', icon: Calendar },
];

const SUBJECT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'math', label: 'SAT Math' },
  { value: 'english', label: 'SAT English' },
];

export default function StudyInsights() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [mathSessions, setMathSessions] = useState([]);
  const [englishSessions, setEnglishSessions] = useState([]);
  const [conceptNodes, setConceptNodes] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (viewingStudentId) loadStudentData(viewingStudentId);
  }, [viewingStudentId]);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);

      if (u.role === 'admin' || u.user_type === 'teacher') {
        const allUsers = await base44.entities.User.list();
        const studentList = allUsers.filter(us => us.user_type === 'student' || (!us.user_type && us.role !== 'admin'));
        setStudents(studentList);
        if (studentList.length > 0) {
          setViewingStudentId(studentList[0].id);
          setSelectedStudent(studentList[0]);
        }
      } else if (u.user_type === 'parent') {
        const families = await base44.entities.Family.filter({ parent_id: u.id });
        const childIds = families.flatMap(f => f.child_ids || []);
        if (childIds.length > 0) {
          const allUsers = await base44.entities.User.list();
          const children = allUsers.filter(us => childIds.includes(us.id));
          setStudents(children);
          if (children.length > 0) {
            setViewingStudentId(children[0].id);
            setSelectedStudent(children[0]);
          }
        }
      } else {
        await loadStudentData(u.id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadStudentData = async (userId) => {
    setLoading(true);
    try {
      const [mathSess, engSess, streaks, profiles, nodes] = await Promise.all([
        base44.entities.PracticeSession.filter({ user_id: userId }, '-created_date', 500),
        base44.entities.EnglishPracticeSession.filter({ user_id: userId }, '-created_date', 500),
        base44.entities.StudyStreak.filter({ user_id: userId }),
        base44.entities.UserProfile.filter({ user_id: userId }),
        base44.entities.ConceptNode.filter({ user_id: userId }, '-created_date', 500)
      ]);
      setSessions([...(mathSess || []), ...(engSess || [])].sort((a, b) => new Date(b.created_date || b.start_time) - new Date(a.created_date || a.start_time)));
      setMathSessions(mathSess || []);
      setEnglishSessions(engSess || []);
      setConceptNodes(nodes || []);
      setStreakData(streaks[0] || null);
      setUserProfile(profiles[0] || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const isObserver = user?.user_type === 'teacher' || user?.user_type === 'parent' || user?.role === 'admin';

  // Subject filter applies to Skills & Habits tabs only
  const filteredSessions = subjectFilter === 'math' ? mathSessions
    : subjectFilter === 'english' ? englishSessions
    : sessions;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-emerald-900">Study Insights</h1>
          <p className="text-stone-500 text-sm mt-1">
            {isObserver ? `Viewing analytics for ${selectedStudent?.full_name || 'a student'}` : 'Your personal study analytics'}
          </p>
        </div>

        {isObserver && students.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border-2 border-stone-100 rounded-xl px-4 py-2 shadow-sm">
              <Users className="w-4 h-4 text-stone-400" />
              <select
                value={viewingStudentId || ''}
                onChange={e => {
                  const s = students.find(st => st.id === e.target.value);
                  setViewingStudentId(e.target.value);
                  setSelectedStudent(s);
                }}
                className="text-sm text-stone-700 bg-transparent outline-none pr-6 font-medium"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3" />
            </div>
          </div>
        )}
      </div>

      {/* Tab bar + subject filter — sticky below the header */}
      <div className="sticky top-20 z-30 -mx-1 px-1 py-2 bg-emerald-50/60 backdrop-blur-sm rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-white border-2 border-stone-100 rounded-2xl p-1 shadow-sm">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-stone-600 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'overview' && (
            <div className="flex gap-1 bg-white border-2 border-stone-100 rounded-xl p-1">
              {SUBJECT_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSubjectFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    subjectFilter === f.value
                      ? 'bg-stone-700 text-white'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          sessions={sessions}
          mathSessions={mathSessions}
          englishSessions={englishSessions}
          userProfile={userProfile}
          conceptNodes={conceptNodes}
          streakData={streakData}
        />
      )}
      {activeTab === 'skills' && <SkillsTab sessions={filteredSessions} />}
      {activeTab === 'habits' && (
        <HabitsTab sessions={filteredSessions} streakData={streakData} userProfile={userProfile} />
      )}

      {sessions.length === 0 && (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-3xl p-8 text-center">
          <div className="text-4xl mb-3 inline-block -rotate-6">🌱</div>
          <h3 className="text-base font-display font-bold text-stone-800 mb-1">No session data yet</h3>
          <p className="text-stone-500 text-sm mt-1 max-w-md mx-auto">Complete some SAT practice sessions to see your insights here.</p>
        </div>
      )}
    </div>
  );
}
