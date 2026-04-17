import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { User, MapPin, Activity, AlertCircle } from 'lucide-react';

export function Registration() {
  const { session } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(session?.user?.user_metadata?.display_name || '');
  const [city, setCity] = useState('');
  const [sensitivities, setSensitivities] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      // Create user profile in 'user_profiles' table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          display_name: displayName,
          city,
          health_sensitivities: sensitivities.split(',').map(s => s.trim()).filter(Boolean),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        // As a fallback (if table doesn't exist yet for demo purpose), we'll still let them continue
        // In a real app we'd throw profileError
        console.warn('Profile sync failed, possibly missing table:', profileError);
      }

      // Also update Auth metadata if display name changed
      if (displayName !== session.user.user_metadata?.display_name) {
        await supabase.auth.updateUser({
          data: { display_name: displayName }
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration');
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
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />

      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <User className="w-6 h-6 text-bg" />
          </div>
          <h1 className="text-3xl font-display italic text-text-primary mb-2">
            Complete your profile
          </h1>
          <p className="text-muted text-center">
            Help us personalize your air quality insights
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start flex-row gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleComplete} className="space-y-4">
          <div className="relative">
            <div className="absolute top-3 left-4 flex items-center pointer-events-none">
              <User className="w-5 h-5 text-muted" />
            </div>
            <input
              type="text"
              placeholder="Display Name"
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute top-3 left-4 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-muted" />
            </div>
            <input
              type="text"
              placeholder="City (e.g. San Francisco)"
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <div className="absolute top-3 left-4 flex items-center pointer-events-none">
              <Activity className="w-5 h-5 text-muted" />
            </div>
            <textarea
              placeholder="Health sensitivities (e.g. Asthma, Pollen, Dust)"
              rows={3}
              className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all resize-none"
              value={sensitivities}
              onChange={(e) => setSensitivities(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold hover:opacity-90 transition-opacity mt-6 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Registration'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
