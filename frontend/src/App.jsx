import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OnlineProvider } from './context/OnlineContext';
import Navbar from './components/Navbar';
import UploadPost from './components/UploadPost';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Messages from './pages/Messages';

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

  const handlePostCreated = (post) => {
    setNewPost(post);
    setTimeout(() => setNewPost(null), 1000);
  };

  return (
    <>
      {user && <Navbar onUploadClick={() => setShowUpload(true)} />}

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
            background: '#0a0a0a',
            color: '#f5f0e8',
            border: '3px solid #FFE000',
            borderRadius: '0px',
            fontSize: '12px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: '700',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            boxShadow: '6px 6px 0 #FFE000',
          },
          success: {
            iconTheme: { primary: '#00FF88', secondary: '#0a0a0a' },
          },
          error: {
            iconTheme: { primary: '#FF2D2D', secondary: '#0a0a0a' },
            style: {
              background: '#FF2D2D',
              color: '#f5f0e8',
              border: '3px solid #0a0a0a',
              boxShadow: '6px 6px 0 #0a0a0a',
            },
          },
        }}
      />
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <OnlineProvider>
        <AppContent />
      </OnlineProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
