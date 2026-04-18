import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { logEvent } from '../services/activityLogger';
import { User, MapPin, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export function Registration() {
  const { session, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.display_name || ''
  );
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!session?.user) navigate('/auth');
  }, [session, navigate]);

  // Auto-detect location on mount
  useEffect(() => {
    detectCityFromGPS();
  }, []);

  const detectCityFromGPS = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const detectedCity = data.city || data.locality || '';
          if (detectedCity) {
            setCity(detectedCity);
            setCitySearch(detectedCity);
            setLocationDetected(true);
          }
        } catch {
          // silently ignore
        } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false),
      { timeout: 8000 }
    );
  };

  // Fetch city suggestions from Nominatim as user types
  useEffect(() => {
    if (citySearch.length < 2 || city) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearch)}&featuretype=city&limit=6&countrycodes=in`
        );
        const results = await res.json();
        const names: string[] = [
          ...new Set(
            results.map((r: any) => {
              const parts = r.display_name.split(', ');
              return parts[0];
            })
          ),
        ].slice(0, 6) as string[];
        setSuggestions(names);
        setShowDropdown(names.length > 0);
      } catch {
        // ignore
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [citySearch, city]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) { navigate('/auth'); return; }
    if (!city.trim()) { setError('Please select or type your city.'); return; }

    setLoading(true);
    setError(null);

    try {
      const profile = {
        id: session.user.id,
        display_name: displayName.trim() || session.user.email?.split('@')[0] || 'User',
        city: city.trim(),
        health_sensitivities: [],
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profile, { onConflict: 'id' });

      if (profileError) throw new Error(profileError.message);

      // Sync display name into Auth metadata
      if (displayName.trim() !== session.user.user_metadata?.display_name) {
        await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      }

      setProfile(profile);
      logEvent('registration_complete', { city: city.trim(), display_name: profile.display_name }, '/registration');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
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
        className="w-full max-w-md bg-surface backdrop-blur-2xl border border-stroke rounded-3xl p-8 relative z-10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full accent-gradient flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,212,170,0.3)]">
            <User className="w-6 h-6 text-bg" />
          </div>
          <h1 className="text-3xl font-display italic text-text-primary mb-1">
            Complete your profile
          </h1>
          <p className="text-muted text-sm text-center">
            Just two quick details to personalise your experience
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleComplete} className="space-y-5" noValidate>
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Display Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-muted" />
              </div>
              <input
                type="text"
                placeholder="How should we call you?"
                className="w-full bg-bg border border-stroke rounded-xl pl-11 pr-4 py-3 text-text-primary text-sm placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA]/30 transition-all"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* City — auto-detected or searchable */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Your City
              </label>
              {/* Re-detect button */}
              <button
                type="button"
                onClick={detectCityFromGPS}
                className="text-xs text-[#00D4AA] hover:underline flex items-center gap-1"
                disabled={detectingLocation}
              >
                {detectingLocation ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                {detectingLocation ? 'Detecting…' : 'Use my location'}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                {detectingLocation ? (
                  <Loader2 className="w-4 h-4 text-[#00D4AA] animate-spin" />
                ) : locationDetected && city ? (
                  <CheckCircle className="w-4 h-4 text-[#00D4AA]" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted" />
                )}
              </div>
              <input
                type="text"
                placeholder={detectingLocation ? 'Detecting your location…' : 'Search or type your city…'}
                className="w-full bg-bg border border-stroke rounded-xl pl-11 pr-4 py-3 text-text-primary text-sm placeholder:text-muted focus:outline-none focus:border-[#00D4AA] focus:ring-1 focus:ring-[#00D4AA]/30 transition-all"
                value={city || citySearch}
                onChange={(e) => {
                  setCity('');
                  setCitySearch(e.target.value);
                  setLocationDetected(false);
                  setShowDropdown(true);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                autoComplete="off"
                readOnly={detectingLocation}
              />

              {/* Suggestions dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-stroke rounded-xl overflow-hidden shadow-xl z-20">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => {
                        setCity(s);
                        setCitySearch(s);
                        setShowDropdown(false);
                        setSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-stroke/50 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3 h-3 text-muted shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {locationDetected && city && (
              <p className="text-xs text-[#00D4AA] mt-1.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Detected from your GPS — you can change it above
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || detectingLocation}
            className="w-full py-3 rounded-xl accent-gradient text-bg font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,212,170,0.25)]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                Saving…
              </>
            ) : (
              'Complete Registration →'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Signed in as <span className="text-[#00D4AA]">{session?.user?.email}</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
