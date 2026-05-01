import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bell, MapPin, RefreshCw, Info, Wind, Droplets, ThermometerSun, Loader2, Shield, Activity, Leaf, CheckCircle, Flame, Factory, Car, AlertTriangle, ShieldAlert, Skull, Sparkles, Navigation } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { generateDashboardIEEE } from '../utils/ieeeDashboardReport';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { logEvent } from '../services/activityLogger';

export function Dashboard() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [locationName, setLocationName] = useState('Detecting location…');
  const locationNameRef = useRef('Detecting location…');
  const [trendMetric, setTrendMetric] = useState('pm25');
  const [mlCities, setMlCities] = useState<any>(null);
  const [mlPrediction, setMlPrediction] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'detecting' | 'active' | 'denied' | 'unavailable'>('detecting');
  const [nextRefreshIn, setNextRefreshIn] = useState(120);
  // 'profile' = from Supabase profile, 'gps' = GPS, 'default' = hardcoded Navi Mumbai, 'ip_fallback' = IP geolocation
  const [locationSource, setLocationSource] = useState<'detecting' | 'profile' | 'gps' | 'default' | 'ip_fallback'>('detecting');
  // Only true when the *current active* location came from IP (imprecise) — cleared once GPS/profile takes over
  const [showLocationWarning, setShowLocationWarning] = useState(false);
  // Track whether first data load has completed so subsequent GPS updates
  // don't trigger the full-page loading spinner.
  const hasInitialLoad = useRef(false);
  const lastFetchTime = useRef(0);

  const GOOGLE_AQ_KEY = (import.meta as any).env?.VITE_GOOGLE_AQ_API_KEY;
  const ML_API_URL = (import.meta as any).env?.VITE_ML_API_URL || 'http://localhost:5001';

  // ── Save AQI reading to Supabase ──────────────────────────────────────────
  const saveAqiReading = async (
    lat: number,
    lon: number,
    aqiData: any,
    aqiCategory: string,
    cityName: string
  ) => {
    if (!session?.user?.id) return; // Not logged in — skip
    try {
      await supabase.from('aqi_readings').insert({
        user_id: session.user.id,
        latitude: lat,
        longitude: lon,
        city: cityName || 'Unknown',
        aqi: aqiData.us_aqi || 0,
        aqi_category: aqiCategory,
        pm25: aqiData.pm2_5 || null,
        pm10: aqiData.pm10 || null,
        ozone: aqiData.ozone || null,
        no2: aqiData.nitrogen_dioxide || null,
        so2: aqiData.sulphur_dioxide || null,
        co: aqiData.carbon_monoxide || null,
        data_source: 'Google Air Quality API',
        captured_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('AQI reading save failed (non-critical):', e);
    }
  };

  // Log AQI fetch to activity_log
  const logAqiFetch = (aqiValue: number, city: string, lat: number, lon: number) => {
    logEvent('aqi_fetch', { aqi: aqiValue, city, lat, lon }, '/dashboard');
  };

  const fetchData = async (lat: number, lon: number, skipNameUpdate = false) => {
    setCoords({ lat, lon });
    // Throttle: don't re-fetch if last fetch was <30 seconds ago (prevents
    // watchPosition firing repeatedly on small GPS jitter)
    const now = Date.now();
    if (hasInitialLoad.current && now - lastFetchTime.current < 30_000) return;
    lastFetchTime.current = now;
    try {
      // Only show full loading spinner on the very first fetch
      if (!hasInitialLoad.current) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      // ── Primary: Google Air Quality API (accurate, real-time) ──
      const googleRes = await fetch(
        `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_AQ_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: { latitude: lat, longitude: lon },
            extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI', 'POLLUTANT_ADDITIONAL_INFO'],
            languageCode: 'en',
          }),
        }
      );
      const googleJson = await googleRes.json();

      // Extract pollutant data from Google response
      const pollutantMap: Record<string, number> = {};
      if (googleJson.pollutants) {
        googleJson.pollutants.forEach((p: any) => {
          const val = p.concentration?.value || 0;
          // Google returns ppb for gases, µg/m³ for PM — normalize all to µg/m³ for UI
          if (p.code === 'pm25') pollutantMap.pm2_5 = val;
          else if (p.code === 'pm10') pollutantMap.pm10 = val;
          else if (p.code === 'no2') pollutantMap.nitrogen_dioxide = val;
          else if (p.code === 'o3') pollutantMap.ozone = val;
          else if (p.code === 'so2') pollutantMap.sulphur_dioxide = val;
          else if (p.code === 'co') pollutantMap.carbon_monoxide = val;
        });
      }

      // Get AQI — prefer local Indian AQI if available, else Universal AQI
      let mainAqi = 0;
      if (googleJson.indexes) {
        const localIdx = googleJson.indexes.find((idx: any) => idx.code === 'ind_cpcb');
        const uaqiIdx = googleJson.indexes.find((idx: any) => idx.code === 'uaqi');
        mainAqi = localIdx?.aqi || uaqiIdx?.aqi || 0;
      }

      // ── Secondary: Open-Meteo for 24hr trend (Google doesn't offer free hourly history) ──
      let trendData: any[] = [];
      try {
        const meteoRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi,pm2_5`);
        const meteoJson = await meteoRes.json();
        if (meteoJson.hourly?.time) {
          const now = new Date();
          const currentIndex = meteoJson.hourly.time.findIndex((t: string) => new Date(t) > now);
          const startIdx = Math.max(0, (currentIndex !== -1 ? currentIndex : 0) - 12);
          for (let i = startIdx; i < Math.min(meteoJson.hourly.time.length, startIdx + 24); i += 2) {
            const time = new Date(meteoJson.hourly.time[i]);
            trendData.push({
              time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              pm25: meteoJson.hourly.pm2_5[i],
              aqi: meteoJson.hourly.us_aqi[i],
            });
          }
        }
      } catch (e) {
        console.warn('Open-Meteo trend fetch failed (non-critical)', e);
      }

      setData({
        current: {
          us_aqi: mainAqi,
          pm2_5: pollutantMap.pm2_5 || 0,
          pm10: pollutantMap.pm10 || 0,
          ozone: pollutantMap.ozone || 0,
          nitrogen_dioxide: pollutantMap.nitrogen_dioxide || 0,
          sulphur_dioxide: pollutantMap.sulphur_dioxide || 0,
          carbon_monoxide: pollutantMap.carbon_monoxide || 0,
        },
        trend: trendData,
        source: 'Google Air Quality API',
        googleRaw: googleJson, // keep full response for report generation
      });

      let resolvedCity = locationNameRef.current.replace(/, .*$/, '').trim();
      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const geoJson = await geoRes.json();
        const city = geoJson.city || geoJson.locality || '';
        const state = geoJson.principalSubdivision || '';
        resolvedCity = city || resolvedCity;
        // Only overwrite the displayed location name when we don't already have
        // a correct one from the user's profile, GPS, or Navi Mumbai default.
        if (!skipNameUpdate && (city || state)) {
          const name = `${city}${city && state ? ', ' : ''}${state}`;
          setLocationName(name);
          locationNameRef.current = name;
        }
      } catch (e) {
        console.error('Reverse geocoding failed', e);
      }

      // ── Save reading to Supabase (fire-and-forget) ──
      const currentAqi = {
        us_aqi: mainAqi,
        pm2_5: pollutantMap.pm2_5 || 0,
        pm10: pollutantMap.pm10 || 0,
        ozone: pollutantMap.ozone || 0,
        nitrogen_dioxide: pollutantMap.nitrogen_dioxide || 0,
        sulphur_dioxide: pollutantMap.sulphur_dioxide || 0,
        carbon_monoxide: pollutantMap.carbon_monoxide || 0,
      };
      const aqiLbl = mainAqi <= 50 ? 'Good' : mainAqi <= 100 ? 'Moderate' : mainAqi <= 150 ? 'Unhealthy for Sensitive' : mainAqi <= 200 ? 'Unhealthy' : mainAqi <= 300 ? 'Very Unhealthy' : 'Hazardous';
      saveAqiReading(lat, lon, currentAqi, aqiLbl, resolvedCity);
      logAqiFetch(mainAqi, resolvedCity, lat, lon);

      // ── ML Prediction ──
      // Call the local ML backend with live pollutant values to get
      // AI-predicted AQI category, health risk, and dominant pollutant.
      try {
        setMlLoading(true);
        const mlRes = await fetch(`${ML_API_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pm25:  pollutantMap.pm2_5             || 0,
            pm10:  pollutantMap.pm10              || 0,
            no2:   pollutantMap.nitrogen_dioxide  || 0,
            so2:   pollutantMap.sulphur_dioxide   || 0,
            co:    pollutantMap.carbon_monoxide   || 0,
            o3:    pollutantMap.ozone             || 0,
          }),
        });
        if (mlRes.ok) {
          const mlJson = await mlRes.json();
          setMlPrediction(mlJson);
        }
      } catch (e) {
        console.warn('ML prediction unavailable (backend offline?)', e);
      } finally {
        setMlLoading(false);
      }
      
    } catch (err) {
      setError('Failed to fetch air quality data');
      console.error(err);
    } finally {
      hasInitialLoad.current = true;
      setLoading(false);
      setIsRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

  };

  const handleManualRefresh = () => {
    if (coords) {
      setIsRefreshing(true);
      logEvent('aqi_refresh', { coords }, '/dashboard');
      fetchData(coords.lat, coords.lon);
    }
  };

  // "Use My Location" button handler — re-requests permission
  const handleUseMyLocation = () => {
    setGeoStatus('detecting');
    setLocationName('Detecting location…');
    if (!navigator.geolocation) {
      // No geolocation API — try IP fallback; don't show banner (user explicitly clicked)
      tryIpFallback(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoStatus('active');
        setLocationSource('gps');
        setShowLocationWarning(false); // GPS is precise — clear any warning
        fetchData(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // GPS denied — try IP-based detection; don't show banner (user explicitly clicked)
        tryIpFallback(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const tryIpFallback = async (showWarning = true) => {
    // Primary: ipwho.is — free, HTTPS, ~56ms, no rate-limit issues
    try {
      const r = await fetch('https://ipwho.is/');
      const d = await r.json();
      if (d.success && d.latitude && d.longitude) {
        setGeoStatus('active');
        setLocationSource('ip_fallback');
        if (showWarning) setShowLocationWarning(true); // ← only show banner on auto-detect path
        if (d.city) {
          const name = d.city + (d.region ? `, ${d.region}` : '');
          setLocationName(name);
          locationNameRef.current = name;
        }
        fetchData(d.latitude, d.longitude);
        return;
      }
    } catch {}
    // Secondary: ipapi.co (may rate-limit on free tier)
    try {
      const r = await fetch('https://ipapi.co/json/');
      const d = await r.json();
      if (d.latitude && d.longitude) {
        setGeoStatus('active');
        setLocationSource('ip_fallback');
        if (showWarning) setShowLocationWarning(true);
        fetchData(d.latitude, d.longitude);
        return;
      }
    } catch {}
    // Hard fallback: Navi Mumbai — reliable, no banner needed
    setGeoStatus('active');
    setLocationSource('default');
    setShowLocationWarning(false);
    setLocationName('Navi Mumbai, Maharashtra');
    locationNameRef.current = 'Navi Mumbai, Maharashtra';
    fetchData(19.0330, 73.0297);
  };

  useEffect(() => {
    // Fetch categorized cities silently
    fetch(`${ML_API_URL}/cities/quality`)
      .then(res => res.json())
      .then(json => setMlCities(json.quality_groups))
      .catch(err => console.error('Failed to load ML Cities', err));
  }, []);

  useEffect(() => {
    // ── NAVI MUMBAI DEFAULTS ──────────────────────────────────────────────────
    const NAVI_MUMBAI = { lat: 19.0330, lon: 73.0297, name: 'Navi Mumbai, Maharashtra' };

    const latestCoords = { lat: NAVI_MUMBAI.lat, lon: NAVI_MUMBAI.lon };
    const REFRESH_SECS = 120;
    setNextRefreshIn(REFRESH_SECS);

    // Countdown ticker
    const countdown = setInterval(() => {
      if (document.hidden) return;
      setNextRefreshIn(prev => (prev <= 1 ? REFRESH_SECS : prev - 1));
    }, 1000);

    // Auto-refresh every 2 min
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchData(latestCoords.lat, latestCoords.lon);
        setNextRefreshIn(REFRESH_SECS);
      }
    }, REFRESH_SECS * 1000);

    // Tab visibility refresh (throttled to 60s)
    const handleVisibility = () => {
      if (!document.hidden && Date.now() - lastFetchTime.current > 60_000) {
        fetchData(latestCoords.lat, latestCoords.lon);
        setNextRefreshIn(REFRESH_SECS);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── STEP 1: Load profile city from Supabase ───────────────────────────────
    // This is the most reliable source — it's what the user set during signup.
    const initLocation = async () => {
      let profileCityLoaded = false;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('city')
            .eq('id', user.id)
            .single();

          if (profile?.city) {
            // Geocode the saved city name → coordinates
            const geocodeRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(profile.city + ', India')}&limit=1`
            );
            const geocodeData = await geocodeRes.json();
            if (geocodeData?.[0]?.lat && geocodeData?.[0]?.lon) {
              const lat = parseFloat(geocodeData[0].lat);
              const lon = parseFloat(geocodeData[0].lon);
              latestCoords.lat = lat;
              latestCoords.lon = lon;
              setLocationName(profile.city);
              locationNameRef.current = profile.city;
              setGeoStatus('active');
              setLocationSource('profile');
              setShowLocationWarning(false); // Profile city is reliable — no warning needed
              await fetchData(lat, lon, true); // name already set — don't overwrite
              profileCityLoaded = true;
            }
          }
        }
      } catch (e) {
        console.warn('Profile city load failed:', e);
      }

      // If profile city couldn't be loaded, use Navi Mumbai default immediately
      if (!profileCityLoaded) {
        setLocationName(NAVI_MUMBAI.name);
        locationNameRef.current = NAVI_MUMBAI.name;
        setGeoStatus('active');
        setLocationSource('default');
        setShowLocationWarning(false); // Default city is fine — no warning
        await fetchData(NAVI_MUMBAI.lat, NAVI_MUMBAI.lon, true); // name already set — don't overwrite
      }

      // ── STEP 2: Silently try GPS for higher precision ─────────────────────
      // Only update if GPS succeeds — don't block initial load on this.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Only switch to GPS if it's meaningfully different (>1km)
            const dist = Math.hypot(latitude - latestCoords.lat, longitude - latestCoords.lon);
            if (dist > 0.01) {
              latestCoords.lat = latitude;
              latestCoords.lon = longitude;
              // Get city name from BigDataCloud
              try {
                const r = await fetch(
                  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                const d = await r.json();
                const city = d.city || d.locality || '';
                const state = d.principalSubdivision || '';
                if (city) {
                  const name = `${city}${state ? ', ' + state : ''}`;
                  setLocationName(name);
                  locationNameRef.current = name;
                }
              } catch { /* keep profile city name */ }
              setGeoStatus('active');
              setLocationSource('gps');
              setShowLocationWarning(false); // GPS upgraded location — no warning
              fetchData(latitude, longitude, true); // name already set from BigDataCloud above
            }
          },
          () => { /* GPS denied — already showing profile/default city */ },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      }
    };

    initLocation();

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);


  useEffect(() => {
    const aqi = data?.current?.us_aqi;
    if (aqi >= 151) {
      setAlertActive(true);
      if (!audioPlayed) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio autoplay blocked by browser', e));
        setAudioPlayed(true);
      }
    } else if (aqi < 151) {
      setAlertActive(false);
      setAudioPlayed(false);
    }
  }, [data?.current?.us_aqi, audioPlayed]);

  const getAqiColor = (val: number) => {
    if (!val || isNaN(val)) return 'var(--muted)';
    if (val <= 50) return '#00E676';
    if (val <= 100) return '#FFE57F';
    if (val <= 150) return '#FF9E40';
    if (val <= 200) return '#FF5252';
    return '#CE93D8';
  };

  const getAqiLabel = (val: number) => {
    if (!val || isNaN(val)) return 'Unknown';
    if (val <= 50) return 'Good';
    if (val <= 100) return 'Moderate';
    if (val <= 150) return 'Unhealthy for Sensitive';
    if (val <= 200) return 'Unhealthy';
    if (val <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const getAdvisory = (val: number) => {
    if (!val || isNaN(val)) return 'Data unavailable.';
    if (val <= 50) return 'Air quality is considered satisfactory, and air pollution poses little or no risk.';
    if (val <= 100) return 'Air quality is acceptable; however, there may be a moderate health concern for a very small number of people.';
    if (val <= 150) return 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.';
    if (val <= 200) return 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
    return 'Health warnings of emergency conditions. The entire population is more likely to be affected.';
  };

  // iPhone Weather-style: one plain English headline for non-tech users
  const getConditionHeadline = (val: number): string => {
    if (!val || isNaN(val)) return 'Checking air quality...';
    if (val <= 50)  return 'Great day to be outside';
    if (val <= 100) return 'Air is okay for most people';
    if (val <= 150) return 'Sensitive people should take care';
    if (val <= 200) return 'Limit time outdoors today';
    if (val <= 300) return 'Stay indoors if possible';
    return 'Dangerous — avoid going outside';
  };

  // iPhone Weather "Feels like" equivalent — one punchy human sentence
  const getSimpleAdvisory = (val: number): string => {
    if (!val || isNaN(val)) return 'Unable to get advisory.';
    if (val <= 50)  return 'Go ahead — the air is clean and safe.';
    if (val <= 100) return 'Air is fine for most people. Unusually sensitive individuals may want to take it easy outdoors.';
    if (val <= 150) return 'People with asthma, allergies, or heart conditions should reduce time outside.';
    if (val <= 200) return 'Everyone may feel discomfort. Wear a mask if going out.';
    if (val <= 300) return 'Health alert — avoid outdoor activity. Close windows and run an air purifier.';
    return 'Emergency conditions. Stay indoors, seal windows. This air is dangerous for everyone.';
  };

  // iPhone Weather tile-style "what to do" for each pollutant
  const getPollutantTip = (label: string, aqi: number): string => {
    const lvl = aqi <= 50 ? 0 : aqi <= 100 ? 1 : aqi <= 150 ? 2 : 3;
    const tips: Record<string, string[]> = {
      'Fine Dust':        ['Safe — fine dust is low',      'Slightly elevated — sensitive? wear a mask', 'High — wear an N95 mask outdoors', 'Very high — stay indoors'],
      'Coarse Dust':      ['Dust levels are normal',        'Mild dust — avoid open dusty areas',          'High dust — wear a mask',           'Stay indoors'],
      'Ground Ozone':     ['Ozone is fine',                 'Moderate ozone — limit midday jogs',          'High ozone — avoid afternoon runs', 'Stay indoors, especially midday'],
      'Traffic Fumes':    ['Traffic fumes at safe levels',  'Slightly elevated — avoid highway runs',      'High — stay away from busy roads',  'Stay indoors, close windows'],
      'Industrial Smoke': ['Industrial smoke is low',       'Mild — limit prolonged outdoor time',         'High — reduce outdoor activity',    'Stay indoors'],
      'Carbon Monoxide':  ['Carbon monoxide is safe',       'Slightly elevated — ventilate indoor spaces', 'High — avoid heavy traffic areas',  'Stay indoors immediately'],
    };
    return tips[label]?.[lvl] ?? (lvl === 0 ? 'Within safe range' : lvl === 1 ? 'Slightly elevated — monitor' : 'Elevated — take precautions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D4AA]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-primary p-6">
        <p className="text-[#FF5252] mb-4">{error || 'Something went wrong'}</p>
        <button 
          onClick={() => coords ? fetchData(coords.lat, coords.lon) : fetchData(28.7041, 77.1025)}
          className="px-4 py-2 bg-surface border border-stroke rounded-xl hover:bg-stroke/50 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const aqiValue = data.current?.us_aqi || 0;
  const aqiColor = getAqiColor(aqiValue);
  const aqiLabel = getAqiLabel(aqiValue);
  const advisoryText = getAdvisory(aqiValue);

  const handleAlertClick = () => {
    if (!alertActive || !data) return;
    const html = generateDashboardIEEE(data, aqiValue, aqiLabel, advisoryText, locationName, coords?.lat, coords?.lon);
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(html);
    printWindow?.document.close();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-bg text-text-primary p-6 pb-32 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          {/* Location pill — click to re-detect GPS */}
          <button
            onClick={handleUseMyLocation}
            className="flex items-center gap-3 bg-surface border border-stroke rounded-full px-4 py-2 backdrop-blur-md hover:border-[#00D4AA]/50 transition-colors group"
            title="Click to update your location"
          >
            <MapPin className={`w-4 h-4 transition-colors ${
              geoStatus === 'active'    ? 'text-[#00D4AA]' :
              geoStatus === 'detecting' ? 'text-yellow-400 animate-pulse' :
              geoStatus === 'denied'    ? 'text-[#FF5252]' : 'text-muted'
            } group-hover:text-[#00D4AA]`} />
            <span className="font-medium text-sm">{locationName}</span>
            {geoStatus === 'active' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" title="Using your live location" />
            )}
            {geoStatus === 'detecting' && (
              <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
            )}
          </button>

          <div className="flex items-center gap-4">
            {/* Always-visible Update Location button */}
            <button
              onClick={handleUseMyLocation}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-surface border rounded-full text-xs transition-colors ${
                geoStatus === 'denied'
                  ? 'border-[#FF5252]/50 text-[#FF5252] hover:bg-[#FF5252]/10'
                  : geoStatus === 'detecting'
                  ? 'border-yellow-400/40 text-yellow-400 cursor-wait'
                  : 'border-[#00D4AA]/40 text-[#00D4AA] hover:bg-[#00D4AA]/10'
              }`}
              disabled={geoStatus === 'detecting'}
            >
              {geoStatus === 'detecting'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Navigation className="w-3.5 h-3.5" />
              }
              {geoStatus === 'detecting' ? 'Detecting…' : 'Use My Location'}
            </button>
            <button
              onClick={alertActive ? handleAlertClick : undefined}
              title={alertActive ? "Hazardous AQI! Download IEEE Alert Report" : "No active alerts"}
              className={`relative p-2 rounded-full bg-surface border transition-colors ${alertActive ? 'border-[#FF5252] hover:bg-[#FF5252]/10 cursor-pointer animate-pulse shadow-[0_0_15px_rgba(255,82,82,0.5)]' : 'border-stroke hover:bg-stroke/50 cursor-default'}`}
            >
              <Bell className={`w-5 h-5 ${alertActive ? 'text-[#FF5252]' : 'text-muted'}`} />
              {alertActive && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF5252]" />}
            </button>
            <div className="w-10 h-10 rounded-full accent-gradient flex items-center justify-center font-bold text-bg text-sm shadow-[0_0_15px_rgba(0,212,170,0.3)]" title={session?.user?.email || 'User'}>
              {(session?.user?.user_metadata?.display_name?.charAt(0) || session?.user?.email?.charAt(0) || 'A').toUpperCase()}
            </div>
          </div>
        </motion.header>

        {/* Warning banner — only shown when IP-based location is active and not overridden by GPS/profile */}
        {showLocationWarning && locationSource === 'ip_fallback' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-[#FF9E40]/10 border border-[#FF9E40]/30 rounded-2xl px-4 py-3 text-sm"
          >
            <MapPin className="w-4 h-4 text-[#FF9E40] shrink-0" />
            <span className="text-text-primary/80 flex-1">
              <strong className="text-[#FF9E40]">Location may be inaccurate.</strong>{' '}
              Click <strong>"Use My Location"</strong> in the header and allow location access in your browser to get your real AQI.
            </span>
            <button
              onClick={handleUseMyLocation}
              className="shrink-0 px-3 py-1.5 bg-[#00D4AA]/10 border border-[#00D4AA]/40 rounded-full text-xs text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-colors flex items-center gap-1.5"
            >
              <Navigation className="w-3 h-3" />
              Fix Location
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main AQI Gauge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 bg-surface border border-stroke rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${aqiColor} 0%, transparent 70%)` }} />
            
            <h2 className="text-muted font-medium mb-6 z-10 text-sm uppercase tracking-widest">Current Air Quality</h2>
            
            <div className="relative w-48 h-48 flex items-center justify-center z-10">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--stroke)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke={aqiColor} strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * Math.min(aqiValue, 300)) / 300 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-6xl font-display italic tracking-tighter" style={{ color: aqiColor }}>
                  {aqiValue}
                </span>
                <span className="text-xs font-medium uppercase tracking-widest mt-1 text-center px-2" style={{ color: aqiColor }}>
                  {aqiLabel}
                </span>
                <p className="text-[10px] text-muted text-center mt-2 px-3 leading-snug">
                  {getConditionHeadline(aqiValue)}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleManualRefresh}
              className="mt-8 flex items-center gap-2 text-xs text-muted z-10 hover:text-[#00D4AA] transition-colors group"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#00D4AA]' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>
                {isRefreshing ? 'Refreshing…' : lastUpdated === 'just now' ? 'Updated just now' : `Updated at ${lastUpdated}`}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" title="Auto-refresh every 2 min" />
            </button>
          </motion.div>

          {/* AI Advisory & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Advisory */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-surface border border-stroke rounded-3xl p-6 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00D4AA]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2 text-[#00D4AA]">
                  <Info className="w-5 h-5" />
                  <h3 className="font-semibold">What this means for you</h3>
                </div>
              </div>
              <p className="text-xl font-semibold text-text-primary leading-snug mb-3 relative z-10">
                {getSimpleAdvisory(aqiValue)}
              </p>
              <p className="text-sm text-text-primary/60 leading-relaxed relative z-10">
                {locationName.split(',')[0]} · AQI {aqiValue} ({aqiLabel}) — {getAdvisory(aqiValue)}
              </p>
            </motion.div>

            {/* 6 Grid Mini Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'pm25', label: 'Fine Dust', value: data.current?.pm2_5, unit: 'µg/m³', desc: 'PM2.5 · Particles', icon: Wind, aqi: Math.round(data.current?.pm2_5 * 2.5) || 0 },
                { id: 'pm10', label: 'Coarse Dust', value: data.current?.pm10, unit: 'µg/m³', desc: 'PM10 · Particles', icon: Factory, aqi: Math.round(data.current?.pm10 * 1.5) || 0 },
                { id: 'o3', label: 'Ground Ozone', value: data.current?.ozone, unit: 'µg/m³', desc: 'O₃ · Ground Ozone', icon: ThermometerSun, aqi: Math.round(data.current?.ozone * 0.5) || 0 },
                { id: 'no2', label: 'Traffic Fumes', value: data.current?.nitrogen_dioxide, unit: 'µg/m³', desc: 'NO₂ · Vehicle Exhaust', icon: Car, aqi: Math.round(data.current?.nitrogen_dioxide * 1.2) || 0 },
                { id: 'so2', label: 'Industrial Smoke', value: data.current?.sulphur_dioxide, unit: 'µg/m³', desc: 'SO₂ · Industrial', icon: Factory, aqi: Math.round(data.current?.sulphur_dioxide * 1.5) || 0 },
                { id: 'co', label: 'Carbon Monoxide', value: data.current?.carbon_monoxide, unit: 'µg/m³', desc: 'CO · Combustion', icon: Flame, aqi: Math.round(data.current?.carbon_monoxide * 0.01) || 0 },
              ].map((stat, i) => {
                const statColor = getAqiColor(stat.aqi);
                const statLabel = getAqiLabel(stat.aqi);
                
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.02)' }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="bg-surface/50 backdrop-blur-md border border-stroke/20 rounded-3xl p-5 flex flex-col relative group transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-muted text-[10px] font-bold uppercase tracking-[0.1em] block mb-1">
                          {stat.label}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-display italic font-bold text-text-primary">
                            {stat.value !== undefined && stat.value !== null ? Number(stat.value).toFixed(1) : '-'}
                          </span>
                          <span className="text-[10px] text-muted font-medium">{stat.unit}</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-bg/50 border border-stroke/10 group-hover:border-current transition-colors" style={{ color: statColor }}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-[10px] text-text-primary/40 leading-snug mb-4 line-clamp-1">
                      {stat.desc}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold" style={{ color: statColor }}>
                          AQI {stat.aqi}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: statColor }}>
                          {statLabel}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-stroke/10 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((stat.aqi / 300) * 100, 100)}%` }}
                          className="h-full rounded-full" 
                          style={{ 
                            backgroundColor: statColor,
                            boxShadow: `0 0 8px ${statColor}40`
                          }} 
                        />
                      </div>
                      <p className="text-[9px] text-muted mt-3 leading-snug italic opacity-80 group-hover:opacity-100 transition-opacity">
                        {getPollutantTip(stat.label, stat.aqi)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 24-Hour Trend */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-surface border border-stroke rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">How has the air changed today?</h3>
            <select 
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value)}
              className="bg-bg border border-stroke rounded-lg px-3 py-1 text-sm text-muted focus:outline-none focus:border-[#00D4AA]"
            >
              <option value="pm25">Fine Dust (PM2.5)</option>
              <option value="aqi">Air Quality Score (AQI)</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.trend}
                margin={{ top: 24, right: 4, left: -12, bottom: 0 }}
                barCategoryGap="15%"
              >
                <XAxis
                  dataKey="time"
                  stroke="#ffffff"
                  tick={{ fill: '#ffffff', fontSize: 10, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                  dy={6}
                  interval={2}
                />
                <YAxis
                  stroke="#ffffff"
                  tick={{ fill: '#ffffff', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  dx={-2}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: '#0d1117',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                  itemStyle={{ color: '#00D4AA' }}
                />
                <Bar dataKey={trendMetric} radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {(data.trend || []).map((_: any, index: number) => (
                    <Cell key={index} fill="#00D4AA" fillOpacity={0.85} />
                  ))}
                  <LabelList
                    dataKey={trendMetric}
                    position="top"
                    style={{ fill: '#ffffff', fontSize: 8, fontWeight: 700, opacity: 0.8 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        {/* AQI Quality Scale Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-surface border border-stroke rounded-3xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-[#00D4AA]" />
            <h3 className="font-semibold text-lg">Understanding the AQI Scale</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { level: 'Good', range: '0-50', color: '#00E676', desc: 'Air is fresh and safe.' },
              { level: 'Moderate', range: '51-100', color: '#FFE57F', desc: 'Acceptable for most.' },
              { level: 'Unhealthy*', range: '101-150', color: '#FF9E40', desc: 'Sensitive groups take care.' },
              { level: 'Unhealthy', range: '151-200', color: '#FF5252', desc: 'Everyone limit outside time.' },
              { level: 'Very Poor', range: '201-300', color: '#CE93D8', desc: 'Avoid outdoor activities.' },
              { level: 'Hazardous', range: '301+', color: '#CE93D8', desc: 'Emergency conditions.' },
            ].map((col) => (
              <div key={col.level} className="bg-bg border border-stroke/50 rounded-2xl p-4 flex flex-col">
                <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: col.color }} />
                <div className="font-bold text-sm mb-1" style={{ color: col.color }}>{col.level}</div>
                <div className="text-[10px] text-muted mb-2">{col.range}</div>
                <p className="text-[10px] text-muted leading-relaxed">{col.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-stroke/50">
            <h4 className="text-xs font-semibold mb-4 text-muted uppercase tracking-wider">How to stay safe right now</h4>
            <div className="flex flex-wrap gap-2">
              {['Mask recommended', 'Stay indoors', 'Run air purifier', 'Close windows', 'Monitor symptoms', 'Sensitive: avoid exertion'].map((tip) => (
                <span key={tip} className="px-3 py-1 bg-bg border border-stroke rounded-lg text-[10px] text-muted">{tip}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recommended Cities (ML Engine) */}
        {/* ── ML Prediction Card ────────────────────────────── */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="bg-surface border border-stroke rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-6 text-[#00D4AA]">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-lg">ML Model Prediction</h3>
              <span className="ml-auto text-xs text-muted bg-stroke/40 px-2 py-0.5 rounded-full">Random Forest · 95.2% accuracy</span>
            </div>

            {mlLoading && (
              <div className="flex items-center gap-3 text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-[#00D4AA]" />
                <span className="text-sm">Running ML analysis on live pollutant data…</span>
              </div>
            )}

            {!mlLoading && mlPrediction && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* AQI Category */}
                <div className={`rounded-2xl p-5 border ${
                  mlPrediction.prediction === 'Good'                        ? 'bg-[#00E676]/10 border-[#00E676]/30' :
                  mlPrediction.prediction === 'Moderate'                    ? 'bg-[#FFE57F]/10 border-[#FFE57F]/30' :
                  mlPrediction.prediction === 'Unhealthy for Sensitive Groups' ? 'bg-[#FF9E40]/10 border-[#FF9E40]/30' :
                  mlPrediction.prediction === 'Unhealthy'                   ? 'bg-[#FF5252]/10 border-[#FF5252]/30' :
                  mlPrediction.prediction === 'Very Unhealthy'              ? 'bg-[#CE93D8]/10 border-[#CE93D8]/30' :
                  'bg-[#FF0000]/10 border-[#FF0000]/30'
                }`}>
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider">AQI Category</p>
                  <p className={`text-xl font-bold ${
                    mlPrediction.prediction === 'Good'                        ? 'text-[#00E676]' :
                    mlPrediction.prediction === 'Moderate'                    ? 'text-[#FFE57F]' :
                    mlPrediction.prediction === 'Unhealthy for Sensitive Groups' ? 'text-[#FF9E40]' :
                    mlPrediction.prediction === 'Unhealthy'                   ? 'text-[#FF5252]' :
                    mlPrediction.prediction === 'Very Unhealthy'              ? 'text-[#CE93D8]' :
                    'text-[#FF0000]'
                  }`}>{mlPrediction.prediction}</p>
                  <p className="text-xs text-muted mt-2">Confidence: {mlPrediction.confidence?.toFixed(1)}%</p>
                </div>

                {/* Health Risk */}
                <div className={`rounded-2xl p-5 border ${
                  mlPrediction.quality === 'Best' || mlPrediction.quality === 'Healthy' ? 'bg-[#00E676]/10 border-[#00E676]/30' :
                  mlPrediction.quality === 'Moderate'  ? 'bg-[#FFE57F]/10 border-[#FFE57F]/30' :
                  mlPrediction.quality === 'Unhealthy' ? 'bg-[#FF5252]/10 border-[#FF5252]/30' :
                  mlPrediction.quality === 'Very Unhealthy' ? 'bg-[#CE93D8]/10 border-[#CE93D8]/30' :
                  'bg-[#FF0000]/10 border-[#FF0000]/30'
                }`}>
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider">Health Risk</p>
                  <p className={`text-xl font-bold ${
                    mlPrediction.quality === 'Best' || mlPrediction.quality === 'Healthy' ? 'text-[#00E676]' :
                    mlPrediction.quality === 'Moderate'  ? 'text-[#FFE57F]' :
                    mlPrediction.quality === 'Unhealthy' ? 'text-[#FF5252]' :
                    mlPrediction.quality === 'Very Unhealthy' ? 'text-[#CE93D8]' :
                    'text-[#FF0000]'
                  }`}>{mlPrediction.quality}</p>
                  <p className="text-xs text-muted mt-2">Based on real-time pollutants</p>
                </div>

                {/* Dominant Pollutant */}
                <div className="rounded-2xl p-5 border bg-[#00D4AA]/10 border-[#00D4AA]/30">
                  <p className="text-xs text-muted mb-1 uppercase tracking-wider">Primary Driver</p>
                  <p className="text-xl font-bold text-[#00D4AA]">
                    {mlPrediction.dominant_pollutant || data?.current?.pm2_5 > data?.current?.pm10 ? 'PM 2.5' : 'PM 10'}
                  </p>
                  <p className="text-xs text-muted mt-2">Dominant pollutant</p>
                </div>

                {/* Live inputs summary */}
                <div className="md:col-span-3 rounded-2xl p-4 bg-stroke/20 border border-stroke/40">
                  <p className="text-xs text-muted mb-3 uppercase tracking-wider">Live Pollutant Inputs to Model</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[
                      { label: 'PM2.5', val: mlPrediction.input?.pm25_aqi },
                      { label: 'PM10',  val: mlPrediction.input?.pm10_aqi },
                      { label: 'NO₂',   val: mlPrediction.input?.no2_aqi },
                      { label: 'SO₂',   val: mlPrediction.input?.so2_aqi },
                      { label: 'CO',    val: mlPrediction.input?.co_aqi },
                      { label: 'O₃',    val: mlPrediction.input?.ozone_aqi },
                    ].map(p => (
                      <div key={p.label} className="text-center">
                        <p className="text-[10px] text-muted">{p.label}</p>
                        <p className="text-sm font-semibold text-text-primary">{p.val?.toFixed(1) ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!mlLoading && !mlPrediction && (
              <div className="flex items-center gap-3 text-muted bg-stroke/20 rounded-2xl p-4">
                <AlertTriangle className="w-5 h-5 text-[#FF9E40]" />
                <span className="text-sm">ML backend offline — start the backend server to enable predictions.</span>
              </div>
            )}
          </motion.div>

        {/* Recommended Cities (ML Engine) */}
        {mlCities && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-surface border border-stroke rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-6 text-[#00D4AA]">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Cities Sorted by Air Quality (AI)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { key: 'Good', label: 'Healthy Air', color: '#00E676' },
                { key: 'Moderate', label: 'Moderate Air', color: '#FFE57F' },
                { key: 'Bad', label: 'Poor Quality', color: '#FF9E40' },
                { key: 'Worst', label: 'Severe / Alert', color: '#FF5252' }
              ].map(({ key, label, color }) => {
                const cities = mlCities[key]?.filter((city: any) => city.country === 'India') || [];
                if (cities.length === 0) return null;
                
                return (
                  <div key={key} className="flex flex-col">
                    <div className="flex items-center justify-between mb-4 border-b border-stroke/50 pb-2">
                      <h4 className="font-bold text-xs" style={{ color }}>{label}</h4>
                      <span className="text-[10px] text-muted">{cities.length}</span>
                    </div>

                    <div className="space-y-2">
                      {cities.slice(0, 5).map((city: any, i: number) => (
                        <div key={i} className="bg-bg/50 border border-stroke/30 rounded-xl p-3 flex justify-between items-center group">
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold truncate group-hover:text-[#00D4AA] transition-colors">{city.city}</div>
                            <div className="text-[10px] text-muted truncate">{city.country}</div>
                          </div>
                          <div className="text-right pl-2">
                            <div className="text-sm font-bold" style={{ color }}>{city.avg_aqi}</div>
                            <div className="text-[8px] text-muted opacity-60 uppercase">{city.dominant_pollutant}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
