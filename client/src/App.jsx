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

// ============================================================
// MAINTENANCE MODE — takes effect April 15 2025 at 12:00 PM Lagos time (11:00 UTC)
// To disable, set to 0
// ============================================================
const MAINTENANCE_START_UTC = new Date('2025-04-15T11:00:00Z').getTime();

function MaintenancePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '520px',
        width: '100%',
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 32px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '48px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>403</span>
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: '12px',
        }}>
          Access Temporarily Unavailable
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          Our platform is currently undergoing scheduled maintenance to improve your experience. 
          We apologize for any inconvenience caused.
        </p>

        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '12px',
          }}>
            <i className="fas fa-clock" style={{ color: '#f59e0b', fontSize: '18px' }}></i>
            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '15px' }}>
              We expect to be back soon
            </span>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
          }}>
            If you need immediate assistance, please consult the developer.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <a
            href="mailto:support@nclexkeys.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              borderRadius: '12px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            <i className="fas fa-envelope"></i>
            Contact Developer
          </a>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#475569',
          marginTop: '40px',
        }}>
          NCLEX Keys International
        </p>
      </div>
    </div>
  );
}

function App() {
  // Show maintenance page after scheduled time
  const isMaintenance = MAINTENANCE_START_UTC && Date.now() >= MAINTENANCE_START_UTC;

  if (isMaintenance) {
    return (
      <UserProvider>
        <BrowserRouter>
          <AppThemeProvider>
            <MaintenancePage />
          </AppThemeProvider>
        </BrowserRouter>
      </UserProvider>
    );
  }

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
