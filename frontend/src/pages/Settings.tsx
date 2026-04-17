import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings2, Bell, Shield, Moon, Sun, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export function Settings() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  
  const [threshold, setThreshold] = useState(100);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

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
                  {session?.user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{session?.user?.user_metadata?.display_name || 'User'}</h3>
                  <p className="text-muted text-sm">{session?.user?.email}</p>
                  <button className="mt-2 text-sm text-[#00D4AA] hover:underline">Change Avatar</button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={session?.user?.user_metadata?.display_name || ''}
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-[#00D4AA] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Role</label>
                  <input
                    type="text"
                    defaultValue="User"
                    disabled
                    className="w-full bg-bg border border-stroke rounded-xl px-4 py-2 text-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted mt-1">Role is managed by your organization administrator.</p>
                </div>
                <button className="px-6 py-2 bg-[#00D4AA] text-bg font-medium rounded-xl hover:opacity-90 transition-opacity">
                  Save Changes
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
                    <label className="text-sm font-medium text-muted">PM2.5 Threshold</label>
                    <span className="text-[#00D4AA] font-bold">{threshold} µg/m³</span>
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
                    <h4 className="text-sm font-medium text-text-primary">Current Alert Level: Unhealthy</h4>
                    <p className="text-xs text-muted mt-1">You will receive push notifications when PM2.5 exceeds {threshold} µg/m³ in your tracked cities.</p>
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
