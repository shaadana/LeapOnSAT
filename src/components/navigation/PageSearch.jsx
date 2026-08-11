import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Search, X, Home, Brain, Target, BookOpen, User, Sparkles, Zap, Users,
  MessageSquare, Theater, GraduationCap, Network, Settings, PenTool,
  Flame, ShoppingBag, Castle, Calendar, Star, Pencil, RotateCcw, History,
  Mountain
} from 'lucide-react';

// `feature` items have a `parent` label to show as a subtitle
const ALL_PAGES = {
  student: [
    // ── Pages ──
    { name: 'Dashboard', page: 'Dashboard', icon: Home, keywords: 'home main' },
    { name: 'My Groups', page: 'MyGroups', icon: Users, keywords: 'classes groups teams' },
    { name: 'Study Calendar', page: 'StudyCalendar', icon: Calendar, keywords: 'schedule events' },
    { name: 'My Coach', page: 'Coach', icon: Sparkles, keywords: 'ai tutor help chat' },
    { name: 'SAT Math Practice', page: 'SATPractice', icon: Target, keywords: 'math questions practice sat' },
    { name: 'SAT English Practice', page: 'SATEnglishPractice', icon: PenTool, keywords: 'english grammar reading practice sat' },
    { name: 'Math Diagnostic', page: 'SATDiagnostic', icon: Brain, keywords: 'test assessment benchmark math diagnostic' },
    { name: 'English Diagnostic', page: 'SATEnglishDiagnostic', icon: BookOpen, keywords: 'test assessment benchmark english diagnostic' },
    { name: 'Math Knowledge Graph', page: 'KnowledgeGraph', icon: Network, keywords: 'mastery concepts map math' },
    { name: 'English Knowledge Graph', page: 'EnglishKnowledgeGraph', icon: Network, keywords: 'mastery concepts map english' },
    { name: 'Deep Review', page: 'DeepReview', icon: Search, keywords: 'mistakes review saved bookmarks' },
    { name: 'Independent Study', page: 'IndependentStudy', icon: GraduationCap, keywords: 'study plan self guided' },
    { name: 'LEAP Pathways', page: 'StudyHabits', icon: Zap, keywords: 'habits pathways executive functioning' },
    { name: 'Study Streak', page: 'StreakTracker', icon: Flame, keywords: 'streak progress daily' },
    { name: 'Desmos Lessons', page: 'DesmosLessons', icon: BookOpen, keywords: 'graphing calculator desmos' },
    { name: 'Avatar Shop', page: 'AvatarShop', icon: ShoppingBag, keywords: 'shop coins rewards avatar' },
    { name: 'Memory Palace', page: 'MemoryPalace', icon: Castle, keywords: 'memory notes study palace' },
    { name: "Learner's Profile", page: 'Diagnostic', icon: Brain, keywords: 'profile ef mindset motivation' },
    { name: 'Settings', page: 'Settings', icon: Settings, keywords: 'settings account preferences' },
    // ── Math features ──
    { name: 'Blitz Session', page: 'SATPractice', icon: Zap, keywords: 'blitz quick fast math sprint', parent: 'SAT Math', query: 'type=blitz&autoStart=1' },
    { name: 'Class Session', page: 'SATPractice', icon: BookOpen, keywords: 'class session long math practice', parent: 'SAT Math', query: 'type=class&autoStart=1' },
    { name: 'Choice Session', page: 'SATPractice', icon: Target, keywords: 'choice session timed adaptive pick math', parent: 'SAT Math', query: 'type=choice' },
    { name: 'Math Lessons', page: 'SATPractice', icon: BookOpen, keywords: 'lessons learn math concepts', parent: 'SAT Math', query: 'mode=lesson' },
    { name: 'Full Module Test', page: 'SATModuleTest', icon: Target, keywords: 'full module test 44 questions sat math real', parent: 'SAT Math' },
    { name: 'Previous Years Questions', page: 'SATPractice', icon: History, keywords: 'pyq previous year questions past exams math', parent: 'SAT Math' },
    { name: 'Canyon Math Practice', page: 'SATPractice', icon: Mountain, keywords: 'canyon math advanced problems', parent: 'SAT Math' },
    { name: 'Saved Questions', page: 'DeepReview', icon: Star, keywords: 'saved bookmarked questions review', parent: 'Deep Review' },
    // ── English features ──
    { name: 'Adaptive Blitz', page: 'SATEnglishPractice', icon: Zap, keywords: 'blitz quick english adaptive mixed', parent: 'SAT English', query: 'tab=blitz' },
    { name: 'Vocabulary Trainer', page: 'SATEnglishPractice', icon: Star, keywords: 'vocabulary vocab flashcards words sat english', parent: 'SAT English' },
    { name: 'SATWordle', page: 'SATEnglishPractice', icon: BookOpen, keywords: 'wordle word game vocabulary fun', parent: 'SAT English' },
    { name: 'Root Practice', page: 'SATEnglishPractice', icon: Star, keywords: 'roots word roots prefixes suffixes vocabulary', parent: 'SAT English' },
    { name: 'Passage Revision', page: 'SATEnglishPractice', icon: Pencil, keywords: 'passage revision grammar in context editing', parent: 'SAT English' },
    { name: 'Classic Literature', page: 'SATEnglishPractice', icon: BookOpen, keywords: 'classic literature real world reading passages', parent: 'SAT English' },
    { name: 'Writing Practice', page: 'SATEnglishPractice', icon: Pencil, keywords: 'writing practice essay paragraph', parent: 'SAT English' },
    { name: 'Custom Passage', page: 'SATEnglishPractice', icon: Sparkles, keywords: 'custom passage upload pdf docx', parent: 'SAT English' },
    { name: 'Reverse Mode', page: 'SATEnglishPractice', icon: RotateCcw, keywords: 'reverse mode explain reasoning debate', parent: 'SAT English' },
    { name: 'Real SAT Format', page: 'SATEnglishPractice', icon: Target, keywords: 'paragraph style real sat format fatigue challenge', parent: 'SAT English' },
    { name: 'Grammar Rules Reference', page: 'SATEnglishPractice', icon: BookOpen, keywords: 'grammar rules reference guide english', parent: 'SAT English' },
    { name: 'English Concept Lessons', page: 'SATEnglishPractice', icon: BookOpen, keywords: 'concept lessons english micro focused', parent: 'SAT English' },
  ],
  teacher: [
    { name: 'My Classes', page: 'TeacherPortal', icon: Users, tab: 'classes', keywords: 'classes students roster' },
    { name: 'Assignments', page: 'TeacherPortal', icon: Target, tab: 'assignments', keywords: 'assign homework tasks create' },
    { name: 'Calendar', page: 'TeacherPortal', icon: Calendar, tab: 'calendar', keywords: 'schedule availability sessions booking' },
    { name: 'Custom Rewards', page: 'TeacherPortal', icon: Sparkles, tab: 'rewards', keywords: 'coins badges rewards give student' },
    { name: 'Message Generator', page: 'TeacherPortal', icon: MessageSquare, tab: 'generator', keywords: 'message email communication parent student' },
    { name: 'Practice Scenarios', page: 'TeacherPortal', icon: Theater, tab: 'scenarios', keywords: 'roleplay practice scenarios conversation' },
    { name: 'Co-Mentor', page: 'TeacherPortal', icon: Sparkles, tab: 'comentor', keywords: 'ai mentor coach advice' },
    { name: 'My Profile', page: 'TeacherProfile', icon: Brain, keywords: 'profile teacher mindset' },
    { name: 'Settings', page: 'Settings', icon: Settings, keywords: 'settings account preferences' },
  ],
  parent: [
    { name: 'My Families', page: 'ParentPortal', icon: Users, tab: 'families', keywords: 'family children kids' },
    { name: 'Settings', page: 'Settings', icon: Settings, keywords: 'settings account preferences' },
  ],
};

export default function PageSearch({ userType }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const role = userType === 'teacher' ? 'teacher' : userType === 'parent' ? 'parent' : 'student';
  const pages = ALL_PAGES[role];

  const filtered = useMemo(() => {
    if (!query.trim()) return pages.filter(p => !p.parent);
    const q = query.toLowerCase();
    return pages.filter(p =>
      p.name.toLowerCase().includes(q) || p.keywords.includes(q)
    );
  }, [query, pages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const goTo = (item) => {
    let url = createPageUrl(item.page);
    if (item.query) url += (url.includes('?') ? '&' : '?') + item.query;
    else if (item.tab) url += '?tab=' + item.tab;
    navigate(url);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-full text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
        title="Search pages (⌘K)"
      >
        <Search className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" />
          {/* Popover */}
          <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-100 overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-emerald-50">
                <Search className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages & features..."
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filtered.length > 0) goTo(filtered[0]);
                  }}
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No pages found</p>
                ) : (
                  filtered.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name + (item.parent || '')}
                        onClick={() => goTo(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800 font-medium block">{item.name}</span>
                          {item.parent && <span className="text-[11px] text-gray-400">{item.parent}</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
