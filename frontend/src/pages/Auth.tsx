import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Github, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [isSignIn, setIsSignIn] = useState(true);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const redirectTo = `${window.location.origin}/dashboard`;

  // ── OAuth ──────────────────────────────────────────────────────────────────
  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

  // ── Email / Password ────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignIn) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        // Sign up
        if (!displayName.trim()) throw new Error('Please enter your display name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw error;

        // Save profile immediately if session is available (email confirmation disabled)
        if (data.session?.user) {
          await supabase.from('user_profiles').upsert({
            id: data.session.user.id,
            display_name: displayName.trim(),
            city: '',
            health_sensitivities: [],
            updated_at: new Date().toISOString(),
          });
          navigate('/registration');
        } else {
          // Email confirmation required — show message
          setSuccess(
            'Account created! Check your email for a confirmation link, then sign in.'
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    setError(null);
    setSuccess(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen w-full bg-bg flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Subtle particle field */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4AA]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <span className="italic font-display text-2xl text-bg">A</span>
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
              <h1 className="text-3xl font-display italic text-text-primary mb-2">
                {isSignIn ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-muted">
                {isSignIn ? 'Sign in to your AURA account' : 'Join AURA · Free forever'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke text-text-primary hover:bg-stroke/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'google' ? (
              <div className="w-4 h-4 rounded-full border-2 border-stroke border-t-[#00D4AA] animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('github')}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stroke text-text-primary hover:bg-stroke/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'github' ? (
              <div className="w-4 h-4 rounded-full border-2 border-stroke border-t-[#00D4AA] animate-spin" />
            ) : (
              <Github className="w-5 h-5" />
            )}
            Continue with GitHub
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-stroke" />
          <span className="text-xs text-muted uppercase tracking-wider">or continue with email</span>
          <div className="h-[1px] flex-1 bg-stroke" />
        </div>

        {/* Error / Success banners */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-[#00D4AA]/10 border border-[#00D4AA]/20 rounded-xl flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-[#00D4AA]/20 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-[#00D4AA]" />
              </div>
              <p className="text-sm text-[#00D4AA]">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence>
            {!isSignIn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="Display Name"
                    className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isSignIn}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              autoComplete={isSignIn ? 'email' : 'email'}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-muted" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignIn ? 'Password' : 'Password (min 6 characters)'}
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-12 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-muted hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold hover:opacity-90 transition-opacity mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                {isSignIn ? 'Signing in…' : 'Creating account…'}
              </>
            ) : isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-muted hover:text-text-primary transition-colors"
          >
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-[#00D4AA] font-medium">
              {isSignIn ? 'Sign up free' : 'Sign in'}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
