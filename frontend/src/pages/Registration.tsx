import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { User, MapPin, Activity, AlertCircle, CheckCircle } from 'lucide-react';

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna',
  'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Meerut',
];

const HEALTH_OPTIONS = [
  'Asthma', 'Allergies', 'COPD', 'Heart Disease', 'Diabetes',
  'Pregnant', 'Child under 12', 'Elderly (65+)', 'Dust Sensitivity',
  'Pollen Allergy', 'None',
];

export function Registration() {
  const { session, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.display_name || ''
  );
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session at all
  useEffect(() => {
    if (!session?.user) {
      navigate('/auth');
    }
  }, [session, navigate]);

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  const toggleSensitivity = (s: string) => {
    if (s === 'None') {
      setSelectedSensitivities(['None']);
      return;
    }
    setSelectedSensitivities(prev => {
      const without = prev.filter(x => x !== 'None');
      return without.includes(s) ? without.filter(x => x !== s) : [...without, s];
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    if (!city) {
      setError('Please select your city.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = {
        id: session.user.id,
        display_name: displayName.trim() || session.user.email?.split('@')[0] || 'User',
        city,
        health_sensitivities: selectedSensitivities,
        updated_at: new Date().toISOString(),
      };

      // Save profile to Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profile, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile save error:', profileError);
        throw new Error(profileError.message);
      }

      // Update Supabase Auth metadata
      if (displayName.trim() !== session.user.user_metadata?.display_name) {
        await supabase.auth.updateUser({
          data: { display_name: displayName.trim() },
        });
      }

      // Cache profile in Zustand store
      setProfile(profile);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save your profile. Please try again.');
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4AA]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 40, opacity: 0, filter: 'blur(10px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <User className="w-6 h-6 text-bg" />
          </div>
          <h1 className="text-3xl font-display italic text-text-primary mb-2">
            Complete your profile
          </h1>
          <p className="text-muted text-center">
            Personalize your air quality experience
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleComplete} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Display Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-muted" />
              </div>
              <input
                type="text"
                placeholder="How should we call you?"
                className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* City Picker */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Your City
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                <MapPin className="w-5 h-5 text-muted" />
              </div>
              <input
                type="text"
                placeholder="Search city…"
                className="w-full bg-bg border border-stroke rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA] transition-all"
                value={city || citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setCity('');
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                autoComplete="off"
              />
              {city && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <CheckCircle className="w-4 h-4 text-[#00D4AA]" />
                </div>
              )}
              {showCityDropdown && filteredCities.length > 0 && !city && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-stroke rounded-xl overflow-hidden shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCity(c);
                        setCitySearch(c);
                        setShowCityDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-stroke/50 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3 h-3 text-muted" />
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Health Sensitivities */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Health Sensitivities
              <span className="ml-1 normal-case text-muted/60">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {HEALTH_OPTIONS.map((s) => {
                const active = selectedSensitivities.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSensitivity(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      active
                        ? 'bg-[#00D4AA]/20 border-[#00D4AA] text-[#00D4AA]'
                        : 'bg-bg border-stroke text-muted hover:border-muted'
                    }`}
                  >
                    <Activity className={`inline w-3 h-3 mr-1 ${active ? 'text-[#00D4AA]' : 'text-muted'}`} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold hover:opacity-90 transition-opacity mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                Saving to database…
              </>
            ) : (
              'Complete Registration →'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Logged in as{' '}
          <span className="text-[#00D4AA]">{session?.user?.email}</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
