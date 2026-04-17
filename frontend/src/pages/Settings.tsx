import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings2, Bell, User, LogOut, Save, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { logEvent } from '../services/activityLogger';

const ALERT_KEY = 'aura-alert';

export function Settings() {
  const navigate = useNavigate();
  const { session, profile, setProfile } = useAuthStore();

  // Profile state
  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.display_name || ''
  );
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Alert state — persisted to localStorage
  const [alertEnabled, setAlertEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(ALERT_KEY);
    return stored ? JSON.parse(stored).enabled : true;
  });
  const [threshold, setThreshold] = useState<number>(() => {
    const stored = localStorage.getItem(ALERT_KEY);
    return stored ? JSON.parse(stored).threshold : 100;
  });
  const [alertSaved, setAlertSaved] = useState(false);

  // Save alert prefs to localStorage whenever they change
  const handleSaveAlert = () => {
    localStorage.setItem(ALERT_KEY, JSON.stringify({ enabled: alertEnabled, threshold }));
    logEvent('alert_save', { enabled: alertEnabled, threshold }, '/settings');
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 2500);
  };

  // Load profile from Supabase on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || '');
        setCity(data.city || '');
        setProfile(data);
      }
    };
    loadProfile();
  }, [session?.user?.id]);

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updates = {
        id: session.user.id,
        display_name: displayName.trim(),
        city: city.trim(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates, { onConflict: 'id' });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      setProfile({ ...profile, ...updates });
      logEvent('profile_save', { display_name: displayName.trim(), city: city.trim() }, '/settings');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    logEvent('sign_out', {}, '/settings');
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const userInitial = (
    session?.user?.user_metadata?.display_name?.charAt(0) ||
    session?.user?.email?.charAt(0) ||
    'U'
  ).toUpperCase();

  const aqiLabel =
    threshold <= 50 ? 'Good' :
    threshold <= 100 ? 'Moderate' :
    threshold <= 150 ? 'Unhealthy for Sensitive Groups' :
    threshold <= 200 ? 'Unhealthy' :
    threshold <= 300 ? 'Very Unhealthy' : 'Hazardous';

  const aqiColor =
    threshold <= 50 ? '#00E676' :
    threshold <= 100 ? '#FFD740' :
    threshold <= 150 ? '#FF9E40' :
    threshold <= 200 ? '#FF5252' :
    threshold <= 300 ? '#B94FE8' : '#B94F4F';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-bg text-text-primary p-6 pb-32 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-surface border border-stroke flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-[#00D4AA]" />
          </div>
          <h1 className="text-2xl font-display italic">Settings</h1>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <motion.nav
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 space-y-2"
          >
            {[
              { icon: User, label: 'Profile' },
              { icon: Bell, label: 'Alerts' },
            ].map((item) => (
              <div
                key={item.label}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            ))}
            <div className="pt-6 mt-6 border-t border-stroke">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.nav>

          {/* Main panels */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-6"
          >
            {/* ── Profile ── */}
            <section className="bg-surface border border-stroke rounded-3xl p-6">
              <h2 className="text-xl font-display italic mb-6">Profile Information</h2>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 rounded-full accent-gradient flex items-center justify-center text-2xl font-bold text-bg shadow-[0_0_20px_rgba(0,212,170,0.2)]">
                  {userInitial}
                </div>
                <div>
                  <p className="font-medium">{displayName || 'User'}</p>
                  <p className="text-muted text-sm">{session?.user?.email}</p>
                  <p className="text-xs text-muted/60 mt-0.5">
                    Member since{' '}
                    {session?.user?.created_at
                      ? new Date(session.user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#00D4AA] transition-colors"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#00D4AA] transition-colors"
                    placeholder="Your city"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="text"
                    value={session?.user?.email || ''}
                    disabled
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2.5 text-sm text-muted cursor-not-allowed"
                  />
                </div>
                {saveError && <p className="text-sm text-red-400">{saveError}</p>}
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: saved ? '#00E676' : '#00D4AA', color: '#0d1117' }}
                >
                  {saving ? (
                    <><div className="w-3.5 h-3.5 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />Saving…</>
                  ) : saved ? (
                    <><CheckCircle className="w-3.5 h-3.5" />Saved!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" />Save Changes</>
                  )}
                </button>
              </div>
            </section>

            {/* ── Alert Thresholds ── */}
            <section className="bg-surface border border-stroke rounded-3xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-display italic">Alert Thresholds</h2>
                  <p className="text-muted text-sm mt-1">Configure when you receive AQI alerts.</p>
                </div>
                {/* Enable toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted">Enable</span>
                  <button
                    onClick={() => setAlertEnabled(!alertEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${alertEnabled ? 'bg-[#00D4AA]' : 'bg-stroke'}`}
                  >
                    <div className={`w-4 h-4 bg-bg rounded-full shadow transition-transform duration-200 ${alertEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className={`space-y-5 transition-opacity duration-200 ${alertEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* Slider */}
                <div>
                  <div className="flex justify-between mb-3">
                    <label className="text-sm font-medium text-muted">AQI Alert Threshold</label>
                    <span className="font-bold text-sm" style={{ color: aqiColor }}>AQI {threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="300" step="5"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{ accentColor: aqiColor }}
                  />
                  <div className="flex justify-between text-xs text-muted mt-2">
                    <span>Good (0)</span>
                    <span>Moderate (100)</span>
                    <span>Hazardous (300)</span>
                  </div>
                </div>

                {/* Info card */}
                <div className="rounded-xl p-4 flex items-start gap-3 border" style={{ borderColor: aqiColor + '30', background: aqiColor + '10' }}>
                  <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color: aqiColor }} />
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">Alert configured</h4>
                    <p className="text-xs text-muted mt-0.5">
                      You will receive alerts when AQI exceeds{' '}
                      <span className="font-bold" style={{ color: aqiColor }}>{threshold}</span>
                      {' '}— currently the{' '}
                      <span className="font-bold" style={{ color: aqiColor }}>{aqiLabel}</span>
                      {' '}range.
                    </p>
                  </div>
                </div>

                {/* Save alerts button */}
                <button
                  onClick={handleSaveAlert}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{ background: alertSaved ? '#00E676' : '#00D4AA', color: '#0d1117' }}
                >
                  {alertSaved ? (
                    <><CheckCircle className="w-3.5 h-3.5" />Saved!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" />Save Alert Settings</>
                  )}
                </button>
              </div>

              {!alertEnabled && (
                <p className="text-xs text-muted mt-4 italic">Alerts are disabled — enable the toggle to configure.</p>
              )}
            </section>


          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
