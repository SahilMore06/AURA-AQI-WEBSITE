import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Calendar, Activity, BarChart3, MapPin, Loader2, Radio, Search, X, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList, ReferenceLine, Cell } from 'recharts';
import { AuraLogo } from '../components/AuraLogo';
import { logEvent } from '../services/activityLogger';

const DEFAULT_CITIES = [
  { id: 'mumbai',    name: 'Mumbai',    lat: 19.0760, lon: 72.8777, color: '#00D4AA', isDefault: true },
  { id: 'delhi',     name: 'Delhi',     lat: 28.6139, lon: 77.2090, color: '#FF5252', isDefault: true },
  { id: 'bengaluru', name: 'Bengaluru', lat: 12.9716, lon: 77.5946, color: '#0066FF', isDefault: true },
  { id: 'chennai',   name: 'Chennai',   lat: 13.0827, lon: 80.2707, color: '#FFE57F', isDefault: true },
];

// Color palette assigned to newly added cities
const EXTRA_COLORS = ['#FF9E40','#CE93D8','#80CBC4','#F48FB1','#FFCC80','#A5D6A7','#90CAF9','#EF9A9A','#B39DDB'];

export function Analytics() {
  const [range, setRange] = useState('7D');
  const [activeCities, setActiveCities] = useState<string[]>(['mumbai', 'delhi', 'bengaluru']);
  const [customCities, setCustomCities] = useState<Array<{ id: string; name: string; lat: number; lon: number; color: string; isDefault: false }>>(() => {
    try { return JSON.parse(localStorage.getItem('aura_analytics_cities') || '[]'); } catch { return []; }
  });
  const allCities = [...DEFAULT_CITIES, ...customCities];

  // City search state
  const [citySearch, setCitySearch] = useState('');
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showAddCity, setShowAddCity] = useState(false);
  const citySearchRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [nextRefreshIn, setNextRefreshIn] = useState(300);

  // Log page view on mount
  useEffect(() => { logEvent('analytics_view', {}, '/analytics'); }, []);

  const toggleCity = (cityId: string) => {
    setActiveCities(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  };

  const removeCustomCity = (cityId: string) => {
    setCustomCities(prev => {
      const updated = prev.filter(c => c.id !== cityId);
      localStorage.setItem('aura_analytics_cities', JSON.stringify(updated));
      return updated;
    });
    setActiveCities(prev => prev.filter(id => id !== cityId));
  };

  const addCity = (result: any) => {
    const id = result.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const usedColors = allCities.map(c => c.color);
    const color = EXTRA_COLORS.find(c => !usedColors.includes(c)) || EXTRA_COLORS[customCities.length % EXTRA_COLORS.length];
    const city = { id, name: result.name + (result.admin1 ? `, ${result.admin1}` : ''), lat: result.latitude, lon: result.longitude, color, isDefault: false as const };
    setCustomCities(prev => {
      const updated = [...prev, city];
      localStorage.setItem('aura_analytics_cities', JSON.stringify(updated));
      return updated;
    });
    setActiveCities(prev => [...prev, id]);
    setCitySearch('');
    setCitySearchResults([]);
    setShowAddCity(false);
  };

  // Debounced geocoding search
  useEffect(() => {
    if (!citySearch.trim()) { setCitySearchResults([]); return; }
    const timer = setTimeout(async () => {
      setCitySearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearch)}&count=6&language=en&format=json`);
        const json = await res.json();
        setCitySearchResults(json.results || []);
      } catch { setCitySearchResults([]); }
      finally { setCitySearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [citySearch]);

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ['Date', ...activeCities.map(id => allCities.find(c => c.id === id)?.name || id)];
    const rows = data.map(row => [row.fullDate, ...activeCities.map(id => row[id] ?? '')]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura_analytics_${range}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('analytics_export', { range, cities: activeCities }, '/analytics');
  };

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (activeCities.length === 0) {
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const endDate = new Date();
        const startDate = new Date();
        
        if (range === '7D') startDate.setDate(endDate.getDate() - 7);
        else if (range === '30D') startDate.setDate(endDate.getDate() - 30);
        else if (range === '90D') startDate.setDate(endDate.getDate() - 90);
        else if (range === '1Y') startDate.setFullYear(endDate.getFullYear() - 1);

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const promises = activeCities.map(async (cityId) => {
          const city = allCities.find(c => c.id === cityId);
          if (!city) return null;
          const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&start_date=${startStr}&end_date=${endStr}&hourly=us_aqi`);
          const json = await res.json();
          return { cityId, data: json };
        });

        const results = await Promise.all(promises);
        const validResults = results.filter(Boolean) as Array<{ cityId: string; data: any }>;
        
        // Process data to merge by date
        const mergedData: Record<string, any> = {};
        
        validResults.forEach(({ cityId, data }) => {
          if (data.hourly && data.hourly.time) {
            // Calculate daily averages to reduce data points for longer ranges
            const dailyAverages: Record<string, { sum: number, count: number }> = {};
            
            data.hourly.time.forEach((timeStr: string, index: number) => {
              const date = timeStr.split('T')[0];
              const aqi = data.hourly.us_aqi[index];
              
              if (aqi !== null && aqi !== undefined) {
                if (!dailyAverages[date]) {
                  dailyAverages[date] = { sum: 0, count: 0 };
                }
                dailyAverages[date].sum += aqi;
                dailyAverages[date].count += 1;
              }
            });

            Object.entries(dailyAverages).forEach(([date, { sum, count }]) => {
              if (!mergedData[date]) {
                const dateObj = new Date(date);
                mergedData[date] = { 
                  time: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  fullDate: date
                };
              }
              mergedData[date][cityId] = Math.round(sum / count);
            });
          }
        });

        const finalData = Object.values(mergedData).sort((a: any, b: any) => a.fullDate.localeCompare(b.fullDate));
        setData(finalData);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Failed to fetch historical data', err);
        setError('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();

    // Auto-refresh every 5 minutes — silent (no loading spinner)
    const REFRESH_SECS = 300;
    setNextRefreshIn(REFRESH_SECS);
    const countdown = setInterval(() => setNextRefreshIn(p => p <= 1 ? REFRESH_SECS : p - 1), 1000);
    const interval = setInterval(() => {
      fetchHistoricalData();
      setNextRefreshIn(REFRESH_SECS);
    }, REFRESH_SECS * 1000);

    return () => { clearInterval(interval); clearInterval(countdown); };

  }, [range, activeCities]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-bg text-text-primary p-6 pb-32 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <AuraLogo variant="icon" width={36} height={36} />
            <div>
              <h1 className="text-2xl font-display italic">Environmental Analytics</h1>
              <p className="text-xs text-muted tracking-wide">Longitudinal Atmospheric Trend Analysis</p>
            </div>
          </div>
          
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-stroke rounded-full hover:bg-stroke/50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title="Export audit trail as CSV"
          >
            <Download className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium">Export Audit Trail</span>
          </button>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Sidebar */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            <div className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6">
              <h3 className="text-muted font-medium mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Calendar className="w-4 h-4" /> Observation Window
              </h3>
              <div className="flex gap-2">
                {['7D', '30D', '90D', '1Y'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      range === r 
                        ? 'bg-[#00D4AA] text-bg' 
                        : 'bg-bg border border-stroke text-muted hover:bg-stroke/50 hover:text-text-primary'
                    }`}
                  >
                    {r === '7D' ? '1W' : r === '30D' ? '1M' : r === '90D' ? '3M' : r === '1Y' ? '1Y' : r}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-muted font-medium flex items-center gap-2 text-sm uppercase tracking-wider">
                  <MapPin className="w-4 h-4" /> Monitoring Stations
                </h3>
                <button
                  onClick={() => { setShowAddCity(v => !v); setTimeout(() => citySearchRef.current?.focus(), 50); }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    showAddCity ? 'bg-[#FF5252]/20 text-[#FF5252] rotate-45' : 'bg-[#00D4AA]/15 text-[#00D4AA] hover:bg-[#00D4AA]/25'
                  }`}
                  title={showAddCity ? 'Cancel' : 'Add a city'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add city search */}
              <AnimatePresence>
                {showAddCity && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                      {citySearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#00D4AA] animate-spin" />}
                      <input
                        ref={citySearchRef}
                        type="text"
                        value={citySearch}
                        onChange={e => setCitySearch(e.target.value)}
                        onKeyDown={e => e.key === 'Escape' && setShowAddCity(false)}
                        placeholder="Search city…"
                        className="w-full bg-bg border border-stroke rounded-xl pl-8 pr-8 py-2 text-sm text-text-primary placeholder:text-muted/60 focus:outline-none focus:border-[#00D4AA]/60"
                      />
                      {citySearch && (
                        <button onMouseDown={e => { e.preventDefault(); setCitySearch(''); setCitySearchResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <X className="w-3 h-3 text-muted hover:text-text-primary" />
                        </button>
                      )}
                    </div>

                    {/* Results */}
                    {citySearchResults.length > 0 && (
                      <div className="mt-1.5 bg-bg border border-stroke rounded-xl overflow-hidden shadow-xl">
                        {citySearchResults.map((r, i) => {
                          const alreadyAdded = allCities.some(c => Math.abs(c.lat - r.latitude) < 0.01 && Math.abs(c.lon - r.longitude) < 0.01);
                          return (
                            <button
                              key={i}
                              onMouseDown={() => !alreadyAdded && addCity(r)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-3 py-2.5 border-b border-stroke/40 last:border-0 flex items-center gap-2.5 text-sm transition-colors ${
                                alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface/70'
                              }`}
                            >
                              <MapPin className="w-3.5 h-3.5 text-[#00D4AA] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{r.name}</div>
                                <div className="text-[10px] text-muted truncate">{[r.admin1, r.country].filter(Boolean).join(', ')}</div>
                              </div>
                              {alreadyAdded
                                ? <span className="text-[10px] text-muted shrink-0">Added</span>
                                : <Plus className="w-3.5 h-3.5 text-[#00D4AA] shrink-0" />
                              }
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {citySearch.trim() && !citySearching && citySearchResults.length === 0 && (
                      <p className="text-xs text-muted mt-2 text-center">No cities found</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* City list */}
              <div className="space-y-2.5">
                {allCities.map((city) => {
                  const isActive = activeCities.includes(city.id);
                  const isCustom = !city.isDefault;
                  return (
                    <div key={city.id} className="flex items-center gap-2 group">
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer" onClick={() => toggleCity(city.id)}>
                        <div
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shrink-0 ${
                            isActive ? 'border-transparent' : 'border-muted group-hover:border-text-primary'
                          }`}
                          style={{ backgroundColor: isActive ? city.color : 'transparent' }}
                        >
                          {isActive && <span className="text-bg text-[10px] font-bold">✓</span>}
                        </div>
                        <span className={`text-sm truncate ${
                          isActive ? 'text-text-primary' : 'text-muted group-hover:text-text-primary transition-colors'
                        }`}>
                          {city.name}
                        </span>
                      </label>
                      {isCustom && (
                        <button
                          onClick={() => removeCustomCity(city.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-[#FF5252] text-muted shrink-0"
                          title="Remove city"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary card */}
            {!loading && data.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6"
              >
                <h3 className="text-muted font-medium mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4" /> Period Summary
                </h3>
                <div className="space-y-3">
                {activeCities.map(cityId => {
                    const city = allCities.find(c => c.id === cityId);
                    if (!city) return null;
                    const cityValues = data.map(d => d[cityId]).filter(v => v !== undefined);
                    const avg = cityValues.length > 0 ? Math.round(cityValues.reduce((a: number, b: number) => a + b, 0) / cityValues.length) : 0;
                    const max = cityValues.length > 0 ? Math.max(...cityValues) : 0;
                    return (
                      <div key={cityId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
                          <span className="text-text-primary">{city.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted text-xs">
                          <span>Avg: <strong className="text-text-primary">{avg}</strong></span>
                          <span>Peak: <strong className="text-text-primary">{max}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Main Chart Area */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 bg-surface backdrop-blur-xl border border-stroke rounded-3xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-display italic mb-1">Atmospheric Quality Index</h2>
                <p className="text-muted text-sm">Multi-station comparative analysis over selected observation window</p>
              </div>
              <div className="flex items-center gap-2 bg-bg border border-stroke rounded-lg px-3 py-1.5">
                <Radio className="w-4 h-4 text-[#00D4AA] animate-pulse" />
                <span className="text-sm font-medium">Live</span>
                {lastUpdated && (
                  <span className="text-xs text-muted border-l border-stroke pl-2 ml-1 font-mono">
                    {lastUpdated} · {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-[400px] w-full relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#00D4AA]" />
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center text-[#FF5252]">
                  {error}
                </div>
              ) : data.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted">
                  Select a monitoring station to visualize atmospheric trend data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{ top: 28, right: 16, left: -8, bottom: 0 }}
                    barCategoryGap="20%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                      dy={8}
                    />
                    <YAxis
                      stroke="#ffffff"
                      tick={{ fill: '#ffffff', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      dx={-4}
                    />
                    {/* AQI 100 threshold line */}
                    <ReferenceLine
                      y={100}
                      stroke="rgba(255,255,255,0.25)"
                      strokeDasharray="6 3"
                      label={{ value: 'Moderate', position: 'insideTopRight', fill: '#ffffff', fontSize: 10, opacity: 0.5 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{
                        backgroundColor: '#0d1117',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: 4 }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={32}
                      iconType="square"
                      wrapperStyle={{ fontSize: '12px', color: '#ffffff', paddingBottom: 8 }}
                    />
                    {allCities.filter(city => activeCities.includes(city.id)).map(city => (
                      <Bar
                        key={city.id}
                        dataKey={city.id}
                        name={city.name}
                        fill={city.color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                      >
                        <LabelList
                          dataKey={city.id}
                          position="top"
                          style={{ fill: '#ffffff', fontSize: 9, fontWeight: 700, opacity: 0.85 }}
                        />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
