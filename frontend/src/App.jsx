import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnlineProvider } from './context/OnlineContext';
import BottomNavbar from './components/BottomNavbar';
import TopNavbar from './components/TopNavbar';
import UploadPost from './components/UploadPost';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Search from './pages/Search';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Messages from './pages/Messages';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Route guard for authenticated routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Public only route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

const AppContent = () => {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [newPost, setNewPost] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handlePostCreated = (post) => {
    setNewPost(post);
    setTimeout(() => setNewPost(null), 1000);
  };

  const showTopNav = user && (
    location.pathname === '/' ||
    location.pathname.startsWith('/messages') ||
    location.pathname.startsWith('/profile')
  );

  return (
    <>
      {showTopNav && <TopNavbar />}
      {user && <BottomNavbar onUploadClick={() => setShowUpload(true)} />}

      {showUpload && (
        <UploadPost
          onClose={() => setShowUpload(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Feed newPost={newPost} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:partnerId"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--black)',
            color: 'var(--white)',
            border: '3px solid var(--yellow)',
            borderRadius: '0px',
            fontSize: '12px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: 'var(--shadow)',
          },
          success: {
            iconTheme: { primary: 'var(--green)', secondary: 'var(--black)' },
          },
          error: {
            iconTheme: { primary: 'var(--red)', secondary: 'var(--black)' },
            style: {
              background: 'var(--red)',
              color: 'var(--white)',
              border: '3px solid var(--black)',
              boxShadow: '6px 6px 0 var(--black)',
            },
          },
        }}
      />
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* ── Admin routes (completely isolated, no AuthProvider) ── */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* ── Regular app routes ── */}
      <Route path="/*" element={
        <AuthProvider>
          <OnlineProvider>
            <AppContent />
          </OnlineProvider>
        </AuthProvider>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
