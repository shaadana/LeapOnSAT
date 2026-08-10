import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SATDiagnostic from './pages/SATDiagnostic';
import SATModuleTest from './pages/SATModuleTest';
import SATEnglishPractice from './pages/SATEnglishPractice';
import EnglishKnowledgeGraphPage from './pages/EnglishKnowledgeGraph';
import SATEnglishDiagnostic from './pages/SATEnglishDiagnostic';
import StreakTracker from './pages/StreakTracker';
import StudyInsights from './pages/StudyInsights';
import QuestionAudit from './pages/QuestionAudit';
import DesmosLessons from './pages/DesmosLessons';
import AvatarShop from './pages/AvatarShop';
import MemoryPalace from './pages/MemoryPalace';
import DeepReview from './pages/DeepReview';
import DocumentMarkup from './pages/DocumentMarkup';
import AutoExtractPractice from './pages/AutoExtractPractice';
import CanyonPDFPractice from './pages/CanyonPDFPractice';
import LandingPage from './pages/LandingPage';
import StudyCalendar from './pages/StudyCalendar';
import ChallengeSession from './pages/ChallengeSession';
import SATEnglishPracticeTest from './pages/SATEnglishPracticeTest';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (location.pathname === '/') {
        return (
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        );
      }
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // If user is not logged in, only allow access to the landing page
  if (!user) {
    if (location.pathname === '/') {
      return (
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      );
    }
    navigateToLogin();
    return null;
  }

  // Force onboarding for authenticated users who haven't selected a role yet
  if (user && !user.user_type && location.pathname !== '/Onboarding') {
    return <Navigate to="/Onboarding" replace />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/SATDiagnostic" element={
        <LayoutWrapper currentPageName="SATDiagnostic">
          <SATDiagnostic />
        </LayoutWrapper>
      } />
      <Route path="/SATModuleTest" element={
        <LayoutWrapper currentPageName="SATModuleTest">
          <SATModuleTest />
        </LayoutWrapper>
      } />
      <Route path="/SATEnglishPractice" element={
        <LayoutWrapper currentPageName="SATEnglishPractice">
          <SATEnglishPractice />
        </LayoutWrapper>
      } />
      <Route path="/EnglishKnowledgeGraph" element={
        <LayoutWrapper currentPageName="EnglishKnowledgeGraph">
          <EnglishKnowledgeGraphPage />
        </LayoutWrapper>
      } />
      <Route path="/SATEnglishDiagnostic" element={
        <LayoutWrapper currentPageName="SATEnglishDiagnostic">
          <SATEnglishDiagnostic />
        </LayoutWrapper>
      } />
      <Route path="/StreakTracker" element={
        <LayoutWrapper currentPageName="StreakTracker">
          <StreakTracker />
        </LayoutWrapper>
      } />
      <Route path="/StudyInsights" element={
        <LayoutWrapper currentPageName="StudyInsights">
          <StudyInsights />
        </LayoutWrapper>
      } />
      <Route path="/QuestionAudit" element={
        <LayoutWrapper currentPageName="QuestionAudit">
          <QuestionAudit />
        </LayoutWrapper>
      } />
      <Route path="/DesmosLessons" element={
        <LayoutWrapper currentPageName="DesmosLessons">
          <DesmosLessons />
        </LayoutWrapper>
      } />
      <Route path="/AvatarShop" element={
        <LayoutWrapper currentPageName="AvatarShop">
          <AvatarShop />
        </LayoutWrapper>
      } />
      <Route path="/MemoryPalace" element={
        <LayoutWrapper currentPageName="MemoryPalace">
          <MemoryPalace />
        </LayoutWrapper>
      } />
      <Route path="/DeepReview" element={
        <LayoutWrapper currentPageName="DeepReview">
          <DeepReview />
        </LayoutWrapper>
      } />
      <Route path="/DocumentMarkup" element={
        <LayoutWrapper currentPageName="DocumentMarkup">
          <DocumentMarkup />
        </LayoutWrapper>
      } />
      <Route path="/AutoExtractPractice" element={
        <LayoutWrapper currentPageName="AutoExtractPractice">
          <AutoExtractPractice />
        </LayoutWrapper>
      } />
      <Route path="/CanyonPDFPractice" element={
        <LayoutWrapper currentPageName="CanyonPDFPractice">
          <CanyonPDFPractice />
        </LayoutWrapper>
      } />
      <Route path="/StudyCalendar" element={
        <LayoutWrapper currentPageName="StudyCalendar">
          <StudyCalendar />
        </LayoutWrapper>
      } />
      <Route path="/ChallengeSession" element={
        <LayoutWrapper currentPageName="ChallengeSession">
          <ChallengeSession />
        </LayoutWrapper>
      } />
      <Route path="/SATEnglishPracticeTest" element={
        <LayoutWrapper currentPageName="SATEnglishPracticeTest">
          <SATEnglishPracticeTest />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
