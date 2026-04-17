import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Github, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const navigate = useNavigate();
  const { setSession, setUser, setLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLocalLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Handle redirect back from OAuth (Supabase sends #access_token in the URL)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        navigate('/dashboard');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const redirectTo = `${window.location.origin}/dashboard`;

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent',
        } : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
    // If no error, browser will redirect to Google/GitHub — no further action needed
  };

  // ── Email / Password ────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLocalLoading(true);

    try {
      if (isSignIn) {
        // ── SIGN IN ──
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Friendly error messages
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Wrong email or password. Please try again.');
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please confirm your email first. Check your inbox for the verification link.');
          }
          throw error;
        }
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
          navigate('/dashboard');
        }

      } else {
        // ── SIGN UP ──
        if (!displayName.trim()) {
          throw new Error('Please enter your display name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: redirectTo,
          },
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw error;
        }

        if (data.session) {
          // Email confirmation is disabled — user is immediately logged in
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);

          // Save profile to user_profiles table
          await supabase.from('user_profiles').upsert({
            id: data.session.user.id,
            display_name: displayName.trim(),
            city: '',
            health_sensitivities: [],
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

          navigate('/registration');
        } else {
          // Email confirmation is enabled — user must verify email first
          setSuccess(
            `✅ Account created! We sent a confirmation link to ${email}. Click it, then sign in here.`
          );
          setIsSignIn(true);
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen w-full bg-bg flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4AA]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10 shadow-2xl"
      >
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <span className="italic font-display text-2xl text-bg font-bold">A</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignIn ? 'signin' : 'signup'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <h1 className="text-3xl font-display italic text-text-primary mb-1">
                {isSignIn ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-muted text-sm">
                {isSignIn ? 'Sign in to your AURA account' : 'Join AURA · Free forever'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <button
            id="google-oauth-btn"
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke bg-bg text-text-primary hover:bg-stroke/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'google' ? (
              <div className="w-4 h-4 rounded-full border-2 border-stroke border-t-[#00D4AA] animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="font-medium">Continue with Google</span>
          </button>

          <button
            id="github-oauth-btn"
            onClick={() => handleOAuth('github')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke bg-bg text-text-primary hover:bg-stroke/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'github' ? (
              <div className="w-4 h-4 rounded-full border-2 border-stroke border-t-[#00D4AA] animate-spin" />
            ) : (
              <Github className="w-5 h-5 shrink-0" />
            )}
            <span className="font-medium">Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px flex-1 bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-wider whitespace-nowrap">or with email</span>
          <div className="h-px flex-1 bg-stroke" />
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 leading-snug">{error}</p>
              </div>
            </motion.div>
          )}
          {success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-[#00D4AA]/10 border border-[#00D4AA]/25 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#00D4AA] shrink-0 mt-0.5" />
                <p className="text-sm text-[#00D4AA] leading-snug">{success}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-3" noValidate>
          {/* Display Name — sign up only */}
          <AnimatePresence initial={false}>
            {!isSignIn && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="relative mb-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-muted" />
                  </div>
                  <input
                    id="display-name-input"
                    type="text"
                    placeholder="Your name"
                    className="w-full bg-bg border border-stroke rounded-xl pl-11 pr-4 py-3 text-text-primary text-sm placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA]/30 transition-all"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isSignIn}
                    autoFocus={!isSignIn}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-muted" />
            </div>
            <input
              id="email-input"
              type="email"
              placeholder="Email address"
              className="w-full bg-bg border border-stroke rounded-xl pl-11 pr-4 py-3 text-text-primary text-sm placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA]/30 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Lock className="w-4 h-4 text-muted" />
            </div>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignIn ? 'Password' : 'Password (min 6 chars)'}
              className="w-full bg-bg border border-stroke rounded-xl pl-11 pr-12 py-3 text-text-primary text-sm placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA]/30 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,212,170,0.25)]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                {isSignIn ? 'Signing in…' : 'Creating account…'}
              </>
            ) : isSignIn ? (
              'Sign In →'
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <div className="mt-5 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-muted hover:text-text-primary transition-colors"
          >
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-[#00D4AA] font-semibold underline underline-offset-2">
              {isSignIn ? 'Sign up free' : 'Sign in'}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
