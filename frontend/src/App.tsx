/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { MapView } from './pages/Map';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Registration } from './pages/Registration';
import { IosDockBar } from './components/dock/IosDockBar';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';

// Capacitor plugins — gracefully no-op in browser
let CapApp: any = null;
let SplashScreen: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cap = require('@capacitor/app');
  CapApp = cap.App;
} catch (_) { /* running in browser */ }
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sp = require('@capacitor/splash-screen');
  SplashScreen = sp.SplashScreen;
} catch (_) { /* running in browser */ }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, isAdminMock } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-stroke border-t-[#00D4AA] animate-spin" />
      </div>
    );
  }

  if (!session && !isAdminMock) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  const isLandingOrAuth = location.pathname === '/' || location.pathname === '/auth';

  return (
    <>
      <AnimatePresence mode="wait">
        {/* @ts-ignore */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/registration" element={<ProtectedRoute><Registration /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
      
      {!isLandingOrAuth && <IosDockBar />}
    </>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, setLoading, isAdminMock } = useAuthStore();

  React.useEffect(() => {
    // Hide the native splash screen once React has mounted
    SplashScreen?.hide();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isAdminMock) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!useAuthStore.getState().isAdminMock) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setLoading]);

  return <>{children}</>;
}

/**
 * Handles the Android hardware back button.
 * On the root pages (landing/auth) it exits the app.
 * On inner pages, it navigates back in history.
 */
function AndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (!CapApp) return;
    const rootPaths = ['/', '/auth'];
    const handler = CapApp.addListener('backButton', () => {
      if (rootPaths.includes(location.pathname)) {
        // Exit app on root screens
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    });
    return () => { handler.then((h: any) => h.remove()); };
  }, [navigate, location.pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AndroidBackHandler />
        <AnimatedRoutes />
      </Router>
    </AuthProvider>
  );
}
