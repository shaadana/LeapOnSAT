/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ClassView from './pages/ClassView';
import Coach from './pages/Coach';
import Dashboard from './pages/Dashboard';
import Diagnostic from './pages/Diagnostic';
import JoinClass from './pages/JoinClass';
import MyGroups from './pages/MyGroups';
import Onboarding from './pages/Onboarding';
import ParentPortal from './pages/ParentPortal';
import ParentProfile from './pages/ParentProfile';
import PrivateChat from './pages/PrivateChat';
import Profile from './pages/Profile';
import SATPractice from './pages/SATPractice';
import Settings from './pages/Settings';
import StudentFamilyView from './pages/StudentFamilyView';
import StudyHabits from './pages/StudyHabits';
import TeacherDiagnostic from './pages/TeacherDiagnostic';
import TeacherPortal from './pages/TeacherPortal';
import TeacherProfile from './pages/TeacherProfile';
import IndependentStudy from './pages/IndependentStudy';
import KnowledgeGraph from './pages/KnowledgeGraph';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClassView": ClassView,
    "Coach": Coach,
    "Dashboard": Dashboard,
    "Diagnostic": Diagnostic,
    "JoinClass": JoinClass,
    "MyGroups": MyGroups,
    "Onboarding": Onboarding,
    "ParentPortal": ParentPortal,
    "ParentProfile": ParentProfile,
    "PrivateChat": PrivateChat,
    "Profile": Profile,
    "SATPractice": SATPractice,
    "Settings": Settings,
    "StudentFamilyView": StudentFamilyView,
    "StudyHabits": StudyHabits,
    "TeacherDiagnostic": TeacherDiagnostic,
    "TeacherPortal": TeacherPortal,
    "TeacherProfile": TeacherProfile,
    "IndependentStudy": IndependentStudy,
    "KnowledgeGraph": KnowledgeGraph,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
