import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Home, 
  Brain, 
  Target, 
  BookOpen, 
  User, 
  Menu, 
  Sparkles,
  Zap,
  LogOut,
  Users,
  MessageSquare,
  Theater,
  GraduationCap,
  Network,
  ChevronDown,
  Settings,
  PenTool,
  Flame,
  TrendingUp,
  ShoppingBag,
  Castle,
  Search,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import PageSearch from '@/components/navigation/PageSearch';

// Dropdown component for grouped nav items
function NavDropdown({ label, icon: Icon, items, currentPageName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = items.some(i => i.page === currentPageName);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
          isActive ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-emerald-100 py-1 z-50">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const url = item.tab ? `${createPageUrl(item.page)}?tab=${item.tab}` : createPageUrl(item.page);
            const itemActive = currentPageName === item.page;
            return (
              <Link
                key={item.tab || item.page}
                to={url}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  itemActive ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <ItemIcon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Onboarding redirect is handled at the router level in App.jsx
      } catch (e) {
        console.log('Not authenticated');
      }
    };
    loadUser();
  }, [currentPageName, navigate]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Don't show navigation on onboarding page
  if (currentPageName === 'Onboarding') {
    return <>{children}</>;
  }

  const gamificationEnabled = user?.gamification_enabled !== false;

  const navItems = user?.user_type === 'teacher' ? [
    { name: 'My Classes', page: 'TeacherPortal', icon: Users, tab: 'classes' },
    { name: 'Assignments', page: 'TeacherPortal', icon: Target, tab: 'assignments' },
    { name: 'Custom Rewards', page: 'TeacherPortal', icon: Sparkles, tab: 'rewards' },
    { name: 'Session Tools', page: 'TeacherPortal', icon: PenTool, tab: 'sessions' },
    { name: 'Message Generator', page: 'TeacherPortal', icon: MessageSquare, tab: 'generator' },
    { name: 'Practice Scenarios', page: 'TeacherPortal', icon: Theater, tab: 'scenarios' },
    { name: 'Co-Mentor', page: 'TeacherPortal', icon: Sparkles, tab: 'comentor' },
    { name: 'My Profile', page: 'TeacherProfile', icon: Brain },
    { name: 'Settings', page: 'Settings', icon: User },
  ] : user?.user_type === 'parent' ? [
    { name: 'My Families', page: 'ParentPortal', icon: Users, tab: 'families' },
    { name: 'Settings', page: 'Settings', icon: User },
  ] : [
    { name: 'Dashboard', page: 'Dashboard', icon: Home },
    { name: 'My Groups', page: 'MyGroups', icon: Users },
    { name: 'Study Calendar', page: 'StudyCalendar', icon: Calendar },
    { name: 'My Coach', page: 'Coach', icon: Sparkles },
    { name: 'SAT Math', page: 'SATPractice', icon: Target },
    { name: 'SAT English', page: 'SATEnglishPractice', icon: PenTool },
    { name: 'Deep Review', page: 'DeepReview', icon: Search },
    { name: 'Independent Study', page: 'IndependentStudy', icon: GraduationCap },
    { name: 'LEAP Pathways', page: 'StudyHabits', icon: Zap },
    { name: 'Study Streak', page: 'StreakTracker', icon: Flame },
    ...(gamificationEnabled ? [
      { name: 'Avatar Shop', page: 'AvatarShop', icon: ShoppingBag },
      { name: 'Memory Palace', page: 'MemoryPalace', icon: Castle },
    ] : []),
    { name: "Learner's Profile", page: 'Diagnostic', icon: Brain },
    { name: 'Settings', page: 'Settings', icon: User },
  ];

  const NavContent = ({ onItemClick }) => (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPageName === item.page;
        return (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
              isActive 
                ? 'bg-emerald-500 text-white font-semibold shadow-lg' 
                : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-emerald-50/40">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Inter:wght@400;500;600&display=swap');

        :root {
          --mint-50: #e8f7f0;
          --mint-100: #c3ead9;
          --mint-500: #52c68e;
          --mint-600: #3eb879;
          --cream: #fefdfb;
          --warm-brown: #78716c;
          --light-brown: #a8a29e;
        }
        .font-display {
          font-family: 'Righteous', sans-serif;
        }
        body {
          font-family: 'Inter', sans-serif;
        }
        .bg-cream { background-color: #fefdfb; }
      `}</style>

      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-b-2 border-emerald-100 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link to={user?.user_type === 'teacher' ? createPageUrl('TeacherPortal') : user?.user_type === 'parent' ? createPageUrl('ParentPortal') : createPageUrl('Dashboard')} className="flex items-center gap-3 group">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6871750ef0eaa31bd4c4ddf2/fb863b954_LeapOn_Official_Logo-removebg-preview.png"
              alt="LeapOn"
              className="h-12 w-auto group-hover:scale-110 transition-transform"
            />
            <div>
              <h1 className="text-2xl font-display font-bold text-emerald-600">LeapOn</h1>
              <p className="text-xs text-stone-600">Learn to leap</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {user?.user_type === 'student' || (!user?.user_type && user) ? (
              <>
                <Link to={createPageUrl('Dashboard')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'Dashboard' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Home className="w-4 h-4" /><span>Dashboard</span>
                </Link>
                <Link to={createPageUrl('MyGroups')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'MyGroups' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Users className="w-4 h-4" /><span>My Groups</span>
                </Link>
                <Link to={createPageUrl('Coach')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'Coach' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Sparkles className="w-4 h-4" /><span>My Coach</span>
                </Link>
                <NavDropdown
                  label="SAT Practice"
                  icon={Target}
                  currentPageName={currentPageName}
                  items={[
                    { name: 'SAT Math', page: 'SATPractice', icon: Target },
                    { name: 'SAT English', page: 'SATEnglishPractice', icon: PenTool },
                    { name: 'Math Diagnostic', page: 'SATDiagnostic', icon: Brain },
                    { name: 'English Diagnostic', page: 'SATEnglishDiagnostic', icon: BookOpen },
                    { name: 'Math Knowledge Graph', page: 'KnowledgeGraph', icon: Network },
                    { name: 'English Knowledge Graph', page: 'EnglishKnowledgeGraph', icon: Network },
                  ]}
                />
                <NavDropdown
                  label="Learn"
                  icon={BookOpen}
                  currentPageName={currentPageName}
                  items={[
                    { name: 'Independent Study', page: 'IndependentStudy', icon: GraduationCap },
                    { name: 'Study Habits', page: 'StudyHabits', icon: BookOpen },
                    { name: 'Deep Review', page: 'DeepReview', icon: Search },
                  ]}
                />
                <NavDropdown
                  label="Profile"
                  icon={User}
                  currentPageName={currentPageName}
                  items={[
                    { name: "Learner's Profile", page: 'Diagnostic', icon: Brain },
                    ...(gamificationEnabled ? [
                      { name: 'Avatar Shop', page: 'AvatarShop', icon: ShoppingBag },
                      { name: 'Memory Palace', page: 'MemoryPalace', icon: Castle },
                    ] : []),
                    { name: 'Settings', page: 'Settings', icon: Settings },
                  ]}
                />
              </>
            ) : user?.user_type === 'teacher' ? (
              <>
                <NavDropdown
                  label="Classes"
                  icon={Users}
                  currentPageName={currentPageName}
                  items={[
                    { name: 'My Classes', page: 'TeacherPortal', icon: Users, tab: 'classes' },
                    { name: 'Assignments', page: 'TeacherPortal', icon: Target, tab: 'assignments' },
                    { name: 'Calendar', page: 'TeacherPortal', icon: Calendar, tab: 'calendar' },
                    { name: 'Custom Rewards', page: 'TeacherPortal', icon: Sparkles, tab: 'rewards' },
                    { name: 'Session Tools', page: 'TeacherPortal', icon: PenTool, tab: 'sessions' },
                    { name: 'Message Generator', page: 'TeacherPortal', icon: MessageSquare, tab: 'generator' },
                  ]}
                />
                <NavDropdown
                  label="Tools"
                  icon={Sparkles}
                  currentPageName={currentPageName}
                  items={[
                    { name: 'Practice Scenarios', page: 'TeacherPortal', icon: Theater, tab: 'scenarios' },
                    { name: 'Co-Mentor', page: 'TeacherPortal', icon: Sparkles, tab: 'comentor' },
                  ]}
                />
                <Link to={createPageUrl('TeacherProfile')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'TeacherProfile' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Brain className="w-4 h-4" /><span>My Profile</span>
                </Link>
                <Link to={createPageUrl('Settings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'Settings' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Settings className="w-4 h-4" /><span>Settings</span>
                </Link>
              </>
            ) : user?.user_type === 'parent' ? (
              <>
                <Link to={createPageUrl('ParentPortal')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'ParentPortal' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Users className="w-4 h-4" /><span>My Families</span>
                </Link>
                <Link to={createPageUrl('Settings')} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${currentPageName === 'Settings' ? 'text-emerald-700 font-semibold' : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/50'}`}>
                  <Settings className="w-4 h-4" /><span>Settings</span>
                </Link>
              </>
            ) : null}
          </nav>

          {/* User Menu */}
          {user && (
            <div className="hidden lg:flex items-center gap-3">
              <PageSearch userType={user.user_type} />
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {(user.name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <div className="flex items-center gap-1 lg:hidden">
            <PageSearch userType={user?.user_type} />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-emerald-700 rounded-full">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-white p-0">
              <div className="p-6 border-b border-emerald-100/50">
                <h2 className="text-lg font-display font-bold text-emerald-900">Menu</h2>
              </div>
              <div className="p-4">
                <NavContent onItemClick={() => setMobileOpen(false)} />
              </div>
              {user && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-emerald-100/50 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-semibold">
                      {(user.name || user.full_name)?.[0] || user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-900">{user.name || user.full_name || 'Student'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
