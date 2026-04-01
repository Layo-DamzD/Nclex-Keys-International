import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import StudentLogin from './pages/StudentLogin';
import StudentSignup from './pages/StudentSignup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminResetPassword from './pages/AdminResetPassword';
import AdminForgotAccessCode from './pages/AdminForgotAccessCode';
import StudentDashboard from './pages/StudentDashboard';
import StudentTestReviewPage from './pages/StudentTestReviewPage';
import Brainiac from './pages/Brainiac';
import PublicKnowledgeTest from './pages/PublicKnowledgeTest';
import ProtectedRoute from './components/ProtectedRoute';
import TestSession from './components/TestSession';
import CatSession from './components/CatSession';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import AdminSecret from './pages/AdminSecret';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import AdminTestReviewPage from './pages/AdminTestReviewPage';
import { AppThemeProvider } from './context/AppThemeContext';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import CookieConsentBanner from './components/CookieConsentBanner';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppThemeProvider>
          <PwaInstallPrompt />
          <CookieConsentBanner />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/brainiac" element={<Brainiac />} />
          <Route path="/test-your-knowledge" element={<PublicKnowledgeTest />} />
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/signup" element={<StudentSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Student Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/test-session" element={
            <ProtectedRoute>
              <TestSession />
            </ProtectedRoute>
          } />
          <Route path="/cat-session" element={
            <ProtectedRoute>
              <CatSession />
            </ProtectedRoute>
          } />
          <Route path="/test-review/:resultId" element={
            <ProtectedRoute>
              <StudentTestReviewPage />
            </ProtectedRoute>
          } />

          {/* Admin Routes – Secret Gateway */}
          <Route path="/NCLEXkeys" element={<AdminSecret />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/forgot-access-code" element={<AdminForgotAccessCode />} />
          <Route path="/admin/reset-password/:token" element={<AdminResetPassword />} />
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/test-results/:resultId/review" element={
            <AdminRoute>
              <AdminTestReviewPage />
            </AdminRoute>
          } />
          <Route path="/admin/review/:resultId" element={
            <AdminRoute>
              <AdminTestReviewPage />
            </AdminRoute>
          } />
          </Routes>
        </AppThemeProvider>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
