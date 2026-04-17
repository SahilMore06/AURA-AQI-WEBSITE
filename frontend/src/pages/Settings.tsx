import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings2, Bell, Shield, Moon, Sun, User, LogOut, Save, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export function Settings() {
  const navigate = useNavigate();
  const { session, profile, setProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.display_name || ''
  );
  const [city, setCity] = useState('');
  const [threshold, setThreshold] = useState(100);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing profile from Supabase on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
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

      // Update Auth metadata
      await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });

      // Update Zustand cache
      setProfile({ ...profile, ...updates });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const userInitial = (
    session?.user?.user_metadata?.display_name?.charAt(0) ||
    session?.user?.email?.charAt(0) ||
    'U'
  ).toUpperCase();

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
          {/* Sidebar Nav */}
          <motion.nav
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 space-y-2"
          >
            {[
              { icon: User, label: 'Profile', active: true },
              { icon: Bell, label: 'Notifications', active: false },
              { icon: Shield, label: 'Security & Privacy', active: false },
              { icon: Moon, label: 'Appearance', active: false },
            ].map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-surface text-text-primary border border-stroke'
                    : 'text-muted hover:bg-stroke/50 hover:text-text-primary'
                }`}
              >
                <item.icon className={`w-4 h-4 ${item.active ? 'text-[#00D4AA]' : ''}`} />
                {item.label}
              </button>
            ))}

            <div className="pt-8 mt-8 border-t border-stroke">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#FF5252] hover:bg-[#FF5252]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.nav>

          {/* Main Content Area */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-6"
          >
            {/* Profile Section */}
            <section className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6">
              <h2 className="text-xl font-display italic mb-6">Profile Information</h2>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full accent-gradient flex items-center justify-center text-3xl font-bold text-bg shadow-[0_0_30px_rgba(0,212,170,0.2)]">
                  {userInitial}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{displayName || 'User'}</h3>
                  <p className="text-muted text-sm">{session?.user?.email}</p>
                  <p className="text-xs text-muted/60 mt-1">
                    Member since{' '}
                    {session?.user?.created_at
                      ? new Date(session.user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-[#00D4AA] transition-colors"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-[#00D4AA] transition-colors"
                    placeholder="Your city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Email</label>
                  <input
                    type="text"
                    value={session?.user?.email || ''}
                    disabled
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2 text-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted mt-1">Email cannot be changed here.</p>
                </div>

                {saveError && (
                  <p className="text-sm text-red-400">{saveError}</p>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: saved ? '#00E676' : 'var(--color-accent, #00D4AA)', color: '#0d1117' }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-bg/30 border-t-bg animate-spin" />
                      Saving…
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Alert Thresholds */}
            <section className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-display italic">Alert Thresholds</h2>
                  <p className="text-muted text-sm mt-1">Configure when you receive AQI alerts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">Enable</span>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications ? 'bg-[#00D4AA]' : 'bg-stroke'}`}
                  >
                    <div className={`w-4 h-4 bg-bg rounded-full transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-muted">AQI Alert Threshold</label>
                    <span className="text-[#00D4AA] font-bold">AQI {threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-[#00D4AA] bg-stroke rounded-lg appearance-none h-2"
                  />
                  <div className="flex justify-between text-xs text-muted mt-2">
                    <span>Good (0)</span>
                    <span>Hazardous (300)</span>
                  </div>
                </div>

                <div className="bg-bg border border-stroke rounded-xl p-4 flex items-start gap-3">
                  <Bell className="w-5 h-5 text-[#FF9E40] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">Alert configured</h4>
                    <p className="text-xs text-muted mt-1">
                      You will receive alerts when AQI exceeds {threshold} — currently set to{' '}
                      <span className="text-[#00D4AA]">
                        {threshold <= 50 ? 'Good' : threshold <= 100 ? 'Moderate' : threshold <= 150 ? 'Unhealthy for Sensitive' : 'Unhealthy'}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6">
              <h2 className="text-xl font-display italic mb-6">Appearance</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${
                    theme === 'light' ? 'border-[#00D4AA] bg-stroke/50' : 'border-stroke hover:border-muted'
                  }`}
                >
                  <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-[#00D4AA]' : 'text-muted'}`} />
                  <span className={`font-medium ${theme === 'light' ? 'text-text-primary' : 'text-muted'}`}>Light Mode</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border transition-all ${
                    theme === 'dark' ? 'border-[#00D4AA] bg-stroke/50' : 'border-stroke hover:border-muted'
                  }`}
                >
                  <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-[#00D4AA]' : 'text-muted'}`} />
                  <span className={`font-medium ${theme === 'dark' ? 'text-text-primary' : 'text-muted'}`}>Dark Mode</span>
                </button>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
