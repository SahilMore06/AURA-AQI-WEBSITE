import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Github, Chrome, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignIn) {
        // Admin Mock Login — bypasses Supabase for demo/local use
        if (email === 'admin@aura.ai' && password === 'AuraAdmin2024') {
          const mockUser = { id: 'admin-mock-user', email: 'admin@aura.ai', role: 'admin' } as any;
          const mockSession = { user: mockUser, access_token: 'admin-mock-token' } as any;

          useAuthStore.getState().setAdminMock(true);
          useAuthStore.getState().setUser(mockUser);
          useAuthStore.getState().setSession(mockSession);
          useAuthStore.getState().setLoading(false);

          navigate('/dashboard');
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });
        if (error) throw error;
        navigate('/registration');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen w-full bg-bg flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Subtle particle field background (simplified with CSS) */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />

      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <span className="italic font-display text-2xl text-bg">A</span>
          </div>
          <h1 className="text-3xl font-display italic text-text-primary mb-2">
            {isSignIn ? 'Welcome back' : 'Create an account'}
          </h1>
          <p className="text-muted text-center">
            {isSignIn ? 'Sign in to your account' : 'Join AURA today'}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke text-text-primary hover:bg-stroke/50 transition-colors">
            <Chrome className="w-5 h-5" />
            Continue with Google
          </button>
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke text-text-primary hover:bg-stroke/50 transition-colors">
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-wider">or continue with email</span>
          <div className="h-[1px] flex-1 bg-stroke" />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start flex-row gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isSignIn && (
            <div className="relative">
              <input
                type="text"
                placeholder="Display Name"
                className="w-full bg-bg border border-stroke rounded-xl px-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Mail className="w-5 h-5 text-muted" />
            </div>
            <input
              type="email"
              placeholder="Email address"
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-muted" />
            </div>
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignIn(!isSignIn)}
            className="text-sm text-muted hover:text-text-primary transition-colors"
          >
            {isSignIn ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
