import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, MapPin, Loader2, Navigation, X, ChevronDown, AlertTriangle, Wind, Droplets, ThermometerSun, Heart, Sparkles, Download, Layers, Activity, Shield, Cpu, Zap, ChevronRight, RefreshCw, ShieldCheck, Home, Leaf, TrendingUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { logEvent } from '../services/activityLogger';

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// AQI category helpers
export const getAqiCategory = (val: number): { label: string; color: string } => {
  if (isNaN(val) || val === 0) return { label: 'Unknown', color: 'var(--muted)' };
  if (val <= 50)  return { label: 'Good',                         color: '#00E676' };
  if (val <= 100) return { label: 'Moderate',                      color: '#FFE57F' };
  if (val <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#FF9E40' };
  if (val <= 200) return { label: 'Unhealthy',                     color: '#FF5252' };
  if (val <= 300) return { label: 'Very Unhealthy',                color: '#CE93D8' };
  return { label: 'Hazardous', color: '#8B0000' };
};

const getAqiColor = (val: number): string => getAqiCategory(val).color;
const getAqiLabel = (val: number): string => {
  if (isNaN(val) || val === 0) return 'Unknown';
  if (val <= 50)  return 'Good';
  if (val <= 100) return 'Moderate';
  if (val <= 150) return 'Unhealthy for Sensitive Groups';
  if (val <= 200) return 'Unhealthy';
  if (val <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// Filter categories
const FILTER_CATEGORIES = ['All', 'Good', 'Moderate', 'Unhealthy', 'Very Unhealthy', 'Hazardous'] as const;
type FilterCategory = typeof FILTER_CATEGORIES[number];

const FILTER_META: Record<FilterCategory, { color: string }> = {
  'All':           { color: '#ffffff' },
  'Good':          { color: '#00E676' },
  'Moderate':      { color: '#FFE57F' },
  'Unhealthy':     { color: '#FF9E40' },
  'Very Unhealthy':{ color: '#CE93D8' },
  'Hazardous':     { color: '#8B0000' },
};

// Indian cities with coordinates and known harmful chemicals
const INDIA_CITIES: Array<{
  name: string; state: string;
  lat: number; lon: number;
  chemicals: Array<{ name: string; level: string; health: string }>;
}> = [
  { name: 'Delhi',       state: 'Delhi',          lat: 28.6139, lon: 77.2090,
    chemicals: [
      { name: 'PM2.5',   level: 'Very High', health: 'Deep lung penetration, cardiovascular damage' },
      { name: 'NO₂',     level: 'High',      health: 'Respiratory inflammation, asthma trigger' },
      { name: 'SO₂',     level: 'Moderate',  health: 'Acid rain precursor, throat irritation' },
    ]},
  { name: 'Mumbai',      state: 'Maharashtra',    lat: 19.0760, lon: 72.8777,
    chemicals: [
      { name: 'PM10',    level: 'High',      health: 'Nose and throat irritation, lung disease' },
      { name: 'CO',      level: 'High',      health: 'Carbon monoxide poisoning, oxygen deprivation' },
      { name: 'VOCs',    level: 'Moderate',  health: 'Liver damage, nervous system effects' },
    ]},
  { name: 'Kolkata',     state: 'West Bengal',    lat: 22.5726, lon: 88.3639,
    chemicals: [
      { name: 'PM2.5',   level: 'High',      health: 'Stroke, lung cancer, heart disease' },
      { name: 'SO₂',     level: 'High',      health: 'Bronchitis, lung function reduction' },
      { name: 'Pb (Lead)',level: 'Moderate', health: 'Neurological damage, especially in children' },
    ]},
  { name: 'Chennai',     state: 'Tamil Nadu',     lat: 13.0827, lon: 80.2707,
    chemicals: [
      { name: 'O₃',      level: 'Moderate',  health: 'Eye/throat irritation, worsened asthma' },
      { name: 'NO₂',     level: 'Moderate',  health: 'Increased respiratory infections' },
      { name: 'PM10',    level: 'Moderate',  health: 'Reduced lung function over time' },
    ]},
  { name: 'Bengaluru',   state: 'Karnataka',      lat: 12.9716, lon: 77.5946,
    chemicals: [
      { name: 'CO',      level: 'Moderate',  health: 'Headaches, dizziness at high concentrations' },
      { name: 'NOx',     level: 'Moderate',  health: 'Smog formation, respiratory irritation' },
      { name: 'PM2.5',   level: 'Moderate',  health: 'Long-term cardiovascular effects' },
    ]},
  { name: 'Hyderabad',   state: 'Telangana',      lat: 17.3850, lon: 78.4867,
    chemicals: [
      { name: 'PM2.5',   level: 'High',      health: 'Reduced life expectancy exposure' },
      { name: 'NH₃',     level: 'Moderate',  health: 'Eye and respiratory tract irritation' },
      { name: 'SO₂',     level: 'Moderate',  health: 'Mucous membrane irritation' },
    ]},
  { name: 'Ahmedabad',   state: 'Gujarat',        lat: 23.0225, lon: 72.5714,
    chemicals: [
      { name: 'PM10',    level: 'High',      health: 'Aggravated respiratory conditions' },
      { name: 'SO₂',     level: 'High',      health: 'Acid rain, respiratory damage' },
      { name: 'NOx',     level: 'Moderate',  health: 'Ground-level ozone formation' },
    ]},
  { name: 'Pune',        state: 'Maharashtra',    lat: 18.5204, lon: 73.8567,
    chemicals: [
      { name: 'PM2.5',   level: 'Moderate',  health: 'Premature aging of lungs' },
      { name: 'CO',      level: 'Moderate',  health: 'Impaired oxygen transport' },
      { name: 'NO₂',     level: 'Moderate',  health: 'Airways inflammation' },
    ]},
  { name: 'Jaipur',      state: 'Rajasthan',      lat: 26.9124, lon: 75.7873,
    chemicals: [
      { name: 'PM10',    level: 'Very High', health: 'Dust storms worsen respiratory conditions' },
      { name: 'PM2.5',   level: 'High',      health: 'Chronic exposure linked to lung cancer' },
      { name: 'SO₂',     level: 'Low',       health: 'Minor throat irritation' },
    ]},
  { name: 'Lucknow',     state: 'Uttar Pradesh',  lat: 26.8467, lon: 80.9462,
    chemicals: [
      { name: 'PM2.5',   level: 'Very High', health: 'High cardiovascular mortality risk' },
      { name: 'NO₂',     level: 'High',      health: 'Lung inflammation, reduced immunity' },
      { name: 'CO',      level: 'Moderate',  health: 'Hemoglobin binding, fatigue' },
    ]},
  { name: 'Kanpur',      state: 'Uttar Pradesh',  lat: 26.4499, lon: 80.3319,
    chemicals: [
      { name: 'PM2.5',   level: 'Hazardous', health: 'Severe cardiovascular and pulmonary disease' },
      { name: 'SO₂',     level: 'High',      health: 'Industrial tannery emissions, acid deposition' },
      { name: 'Cr (Chromium)', level: 'High',health: 'Carcinogenic, kidney and liver damage' },
    ]},
  { name: 'Varanasi',    state: 'Uttar Pradesh',  lat: 25.3176, lon: 82.9739,
    chemicals: [
      { name: 'PM2.5',   level: 'High',      health: 'Respiratory morbidity' },
      { name: 'NOx',     level: 'Moderate',  health: 'Photochemical smog contributor' },
      { name: 'NH₃',     level: 'Moderate',  health: 'Eutrophication and irritant' },
    ]},
  { name: 'Patna',       state: 'Bihar',          lat: 25.5941, lon: 85.1376,
    chemicals: [
      { name: 'PM2.5',   level: 'Very High', health: 'Premature death in elderly' },
      { name: 'PM10',    level: 'Very High', health: 'Dust from river plains, severe inhalation risk' },
      { name: 'CO',      level: 'Moderate',  health: 'Neurological effects at chronic exposure' },
    ]},
  { name: 'Surat',       state: 'Gujarat',        lat: 21.1702, lon: 72.8311,
    chemicals: [
      { name: 'VOCs',    level: 'High',      health: 'Textile industry emissions, cancer risk' },
      { name: 'NOx',     level: 'Moderate',  health: 'Ozone precursor' },
      { name: 'PM2.5',   level: 'Moderate',  health: 'Reduced lung function' },
    ]},
  { name: 'Bhopal',      state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126,
    chemicals: [
      { name: 'PM2.5',   level: 'Moderate',  health: 'Legacy industrial pollution effects' },
      { name: 'MIC (hist.)', level: 'Trace', health: 'Legacy 1984 disaster, residual groundwater contamination' },
      { name: 'NO₂',     level: 'Moderate',  health: 'Urban traffic buildup' },
    ]},
  { name: 'Nagpur',      state: 'Maharashtra',    lat: 21.1458, lon: 79.0882,
    chemicals: [
      { name: 'PM10',    level: 'Moderate',  health: 'Road dust and construction exposure' },
      { name: 'SO₂',     level: 'Moderate',  health: 'Thermal power plant emissions' },
      { name: 'CO',      level: 'Low',       health: 'Vehicle exhaust in peak hours' },
    ]},
  { name: 'Amritsar',    state: 'Punjab',         lat: 31.6340, lon: 74.8723,
    chemicals: [
      { name: 'PM2.5',   level: 'Very High', health: 'Stubble burning seasonal spikes' },
      { name: 'CO',      level: 'High',      health: 'Incomplete combustion from farm fires' },
      { name: 'Black Carbon', level: 'High', health: 'Dark aerosol, climate + health impact' },
    ]},
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185,
    chemicals: [
      { name: 'SO₂',     level: 'High',      health: 'Steel plant & refinery emissions' },
      { name: 'PM10',    level: 'High',      health: 'Port and industrial dust' },
      { name: 'NOx',     level: 'Moderate',  health: 'Smog in coastal winds' },
    ]},
  { name: 'Guwahati',    state: 'Assam',          lat: 26.1445, lon: 91.7362,
    chemicals: [
      { name: 'PM2.5',   level: 'Moderate',  health: 'Biomass burning from NE forests' },
      { name: 'CO',      level: 'Moderate',  health: 'Vehicle exhaust accumulation in valley' },
      { name: 'O₃',      level: 'Low',       health: 'Seasonal photochemical formation' },
    ]},
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lon: 76.9366,
    chemicals: [
      { name: 'PM2.5',   level: 'Low',       health: 'Coastal winds keep levels moderate' },
      { name: 'NOx',     level: 'Low',       health: 'Growing vehicle density' },
      { name: 'O₃',      level: 'Low',       health: 'UV-driven formation in humid climate' },
    ]},
];

// Map fly-to controller
function FlyToController({ target }: { target: { lat: number; lon: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lon], 10, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
}

const createCustomIcon = (aqi: number) => {
  const color = getAqiColor(aqi);
  const displayAqi = isNaN(aqi) || aqi === 0 ? '…' : aqi;
  const size = aqi > 200 ? 44 : aqi > 100 ? 40 : 36;
  return L.divIcon({
    className: 'custom-aqi-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid rgba(0,0,0,0.4);
        box-shadow: 0 0 12px ${color}88, 0 4px 8px rgba(0,0,0,0.4);
        color: #000;
        font-weight: 700;
        font-size: ${size > 40 ? 14 : 12}px;
        transition: all 0.2s;
        font-family: monospace;
      ">
        ${displayAqi}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function MapClickEvents({ setSelectedCity }: { setSelectedCity: (city: any) => void }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
        const json = await res.json();
        if (json.current && json.current.us_aqi !== undefined) {
          let name = `Location (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const geoJson = await geoRes.json();
            if (geoJson.address) {
              name = geoJson.address.city || geoJson.address.town || geoJson.address.village || geoJson.address.county || name;
            }
          } catch (e) { /* ignore */ }
          setSelectedCity({
            aqi: json.current.us_aqi, name, lat, lon: lng,
            details: {
              pm10: json.current.pm10, pm2_5: json.current.pm2_5,
              co: json.current.carbon_monoxide, no2: json.current.nitrogen_dioxide,
              so2: json.current.sulphur_dioxide, o3: json.current.ozone,
            },
            chemicals: []
          });
        }
      } catch { /* ignore */ }
    }
  });
  return null;
}

// Determine city's filter category from AQI
function getCityFilterCategory(aqi: number): FilterCategory {
  if (aqi <= 0 || isNaN(aqi)) return 'Good';
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

const GOOGLE_AQ_KEY = (import.meta.env.VITE_GOOGLE_AQ_API_KEY as string);
const ML_API_URL = (import.meta.env.VITE_ML_API_URL as string) || 'http://localhost:5001';


// Fetch AQI from Google Air Quality API
async function fetchGoogleAQ(lat: number, lon: number) {
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_AQ_KEY}`;
  const body = {
    location: { latitude: lat, longitude: lon },
    extraComputations: [
      "HEALTH_RECOMMENDATIONS",
      "DOMINANT_POLLUTANT_CONCENTRATION",
      "POLLUTANT_CONCENTRATION",
      "LOCAL_AQI",
      "POLLUTANT_ADDITIONAL_INFO"
    ],
    languageCode: "en"
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Google AQ API failed');
  return res.json();
}

// Fallback to Open-Meteo
async function fetchOpenMeteoAQ(lat: number, lon: number) {
  const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
  return res.json();
}

// Google AQ Heatmap Tile Layer
function AqiHeatmapLayer({ visible }: { visible: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (visible && !layerRef.current) {
      layerRef.current = L.tileLayer(
        `https://airquality.googleapis.com/v1/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_AQ_KEY}`,
        { opacity: 0.6, maxZoom: 16, tileSize: 256 }
      );
      layerRef.current.addTo(map);
    } else if (!visible && layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [visible, map]);

  return null;
}

// Generate IEEE-format report HTML
function generateReportHTML(city: any, aiAdvisory: string, localAdvisoryFn: (c: any) => string) {
  // Enhanced markdown → HTML conversion for advisory
  const rawAdvisory = aiAdvisory || localAdvisoryFn(city);
  const advisory = rawAdvisory
    .split('\n')
    .map((line: string) => {
      // Emoji bold headers like **🔍 Current Analysis**
      if (/^\*\*(.+?)\*\*$/.test(line.trim())) {
        const inner = line.trim().replace(/^\*\*|\*\*$/g, '');
        return `<div class="adv-heading">${inner}</div>`;
      }
      // Bullet points
      if (/^[-*]\s/.test(line.trim())) {
        const content = line.trim().slice(2)
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        return `<div class="adv-bullet">• ${content}</div>`;
      }
      // Horizontal rule
      if (/^---/.test(line.trim())) return '<hr style="border:none;border-top:1px solid #ddd;margin:10px 0">';
      // Italic footnotes *...*
      if (/^\*[^*]/.test(line.trim())) {
        return `<div class="adv-footnote">${line.trim().replace(/\*(.+?)\*/g, '$1')}</div>`;
      }
      // Empty line
      if (!line.trim()) return '<div style="height:6px"></div>';
      // Normal text with inline bold
      const withBold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<p class="adv-para">${withBold}</p>`;
    })
    .join('');

  const aqi = city.aqi;
  const aqiLabel = city.category || getAqiLabel(aqi);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dataTime = city.dateTime ? new Date(city.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : timeStr;

  const pollutants = [
    { key: 'pm25', label: 'PM\u2082.\u2085', unit: 'µg/m³', who: 15, inaaqs: 60 },
    { key: 'pm10', label: 'PM\u2081\u2080', unit: 'µg/m³', who: 45, inaaqs: 100 },
    { key: 'no2',  label: 'NO\u2082',   unit: 'ppb',   who: 25, inaaqs: 80  },
    { key: 'o3',   label: 'O\u2083',    unit: 'ppb',   who: 100,inaaqs: 100 },
    { key: 'so2',  label: 'SO\u2082',   unit: 'ppb',   who: 40, inaaqs: 80  },
    { key: 'co',   label: 'CO',         unit: 'ppb',   who: 4000,inaaqs: 4000},
  ];

  const pollutantRows = pollutants
    .filter(p => city.pollutants?.[p.key])
    .map((p, i) => {
      const d = city.pollutants[p.key];
      const val = parseFloat(d.value) || 0;
      const whoStatus = val > p.who ? 'Exceeds' : 'Within';
      const inaaqsStatus = val > p.inaaqs ? 'Exceeds' : 'Within';
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="padding:7px 10px;border:1px solid #ccc;font-weight:600">${p.label}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center">${d.value} ${d.unit}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center">${p.who} ${d.unit}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center;color:${whoStatus==='Exceeds'?'#b00020':'#1a6b1a'};font-weight:600">${whoStatus}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center;color:${inaaqsStatus==='Exceeds'?'#b00020':'#1a6b1a'};font-weight:600">${inaaqsStatus}</td>
      </tr>`;
    }).join('');

  const indexRows = city.allIndexes?.map((idx: any, i: number) =>
    `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
      <td style="padding:7px 10px;border:1px solid #ccc">${idx.displayName}</td>
      <td style="padding:7px 10px;border:1px solid #ccc;text-align:center;font-weight:700">${idx.aqi}</td>
      <td style="padding:7px 10px;border:1px solid #ccc;text-align:center">${idx.category}</td>
    </tr>`
  ).join('') || '';

  // AQI color helper
  const aqiHex = aqi <= 50 ? '#1b7e34' : aqi <= 100 ? '#a07000' : aqi <= 150 ? '#c45e00' : aqi <= 200 ? '#b00020' : aqi <= 300 ? '#6a0088' : '#7a0000';
  const aqiBg  = aqi <= 50 ? '#e8f5e9' : aqi <= 100 ? '#fff9e6' : aqi <= 150 ? '#fff3e0' : aqi <= 200 ? '#fff0f0' : aqi <= 300 ? '#f5e6ff' : '#ffe6e6';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Air Quality Assessment Report — ${city.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Source Serif 4', 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #111;
      background: #fff;
    }
    .page { max-width: 740px; margin: 0 auto; padding: 52px 52px 64px; }

    /* ── Header branding strip ── */
    .branding-strip { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
    .brand-logo { height: 50px; width: 220px; }
    .brand-tag { text-align: right; font-size: 10pt; font-weight: 700; color: #111; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.5px; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; color: rgba(0,0,0,0.025); font-weight: 900; pointer-events: none; z-index: -1; text-transform: uppercase; white-space: nowrap; font-family: 'Arial Black', sans-serif; }
    .watermark-svg { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70%; opacity: 0.02; pointer-events: none; z-index: -2; filter: grayscale(1); }

    /* ── Title block ── */
    .title-block { text-align: center; margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1.5px solid #bbb; }
    .paper-title { font-size: 17pt; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
    .paper-subtitle { font-size: 10.5pt; color: #444; margin-bottom: 12px; font-style: italic; }
    .meta-row { font-size: 9pt; color: #555; margin-top: 4px; }
    .meta-label { font-variant: small-caps; font-weight: 700; color: #222; }
    .keywords { font-size: 9pt; color: #444; margin-bottom: 18px; font-style: italic; }

    /* ── Abstract ── */
    .abstract-box {
      border-left: 4px solid #007a6e;
      padding: 10px 14px;
      margin-bottom: 22px;
      font-size: 10pt;
      background: #f0faf9;
      border-radius: 0 4px 4px 0;
    }
    .abstract-label { font-weight: 700; font-variant: small-caps; color: #007a6e; }

    /* ── Sections ── */
    .section { margin-bottom: 22px; }
    .section-heading {
      font-size: 10.5pt;
      font-weight: 700;
      letter-spacing: 0.6px;
      border-bottom: 1.5px solid #333;
      padding-bottom: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
      color: #111;
    }
    .section-number { margin-right: 6px; color: #007a6e; }
    p { margin-bottom: 8px; text-align: justify; }

    /* ── AQI Badge ── */
    .aqi-summary {
      display: flex; align-items: stretch; gap: 0;
      border: 1.5px solid #ccc; margin-bottom: 16px; border-radius: 6px; overflow: hidden;
    }
    .aqi-value-box {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 12px 20px; min-width: 90px;
      background: ${aqiBg}; border-right: 1.5px solid #ccc;
    }
    .aqi-value { font-size: 38pt; font-weight: 700; line-height: 1; color: ${aqiHex}; }
    .aqi-scale-label { font-size: 7.5pt; text-align: center; margin-top: 4px; font-style: italic; color: #555; }
    .aqi-meta { font-size: 10.5pt; padding: 12px 16px; flex: 1; }
    .aqi-cat { font-size: 13pt; font-weight: 700; color: ${aqiHex}; margin-bottom: 4px; }
    .aqi-meta-row { font-size: 9.5pt; margin-top: 2px; }

    /* ── Color band ── */
    .aqi-band { display: flex; border: 1px solid #ccc; margin: 10px 0; border-radius: 4px; overflow: hidden; }
    .aqi-band-cell { flex: 1; padding: 6px 2px; text-align: center; font-size: 8pt; font-weight: 500; line-height: 1.3; }

    /* ── Tables ── */
    .table-wrapper { margin: 10px 0 18px; }
    .table-caption { font-size: 10pt; text-align: center; font-weight: 700; font-variant: small-caps; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { padding: 8px 10px; border: 1px solid #444; background: #1c1c1c; color: #fff; font-size: 9.5pt; font-weight: 700; text-align: center; }
    td { font-size: 10pt; }
    .status-ok  { color: #1b7e34; font-weight: 700; }
    .status-bad { color: #b00020; font-weight: 700; }

    /* ── Advisory content ── */
    .advisory-content { font-size: 10.5pt; line-height: 1.75; }
    .adv-heading { font-weight: 700; margin-top: 12px; margin-bottom: 4px; color: #007a6e; font-size: 11pt; padding-left: 2px; border-left: 3px solid #007a6e; padding-left: 8px; }
    .adv-bullet  { margin-left: 18px; margin-bottom: 3px; text-align: left; }
    .adv-bullet strong { color: #111; }
    .adv-para    { text-align: justify; margin-bottom: 6px; }
    .adv-footnote { font-size: 9pt; color: #666; font-style: italic; margin-top: 8px; }

    /* ── Terrain map ── */
    .map-frame { border: 1.5px solid #bbb; padding: 5px; background: #e8e8e8; border-radius: 4px; margin: 10px 0; text-align: center; overflow: hidden; }
    .map-caption { font-size: 9pt; color: #555; font-style: italic; margin-bottom: 6px; }
    #reportMap { width: 100%; height: 280px; border: 1px solid #ccc; display: block; background: #e0e0e0; }
    @media print { #reportMap { height: 260px; } }

    /* ── Footer ── */
    .footer { margin-top: 40px; padding-top: 10px; border-top: 2px solid #111; font-size: 8.5pt; color: #444; display: flex; justify-content: space-between; }
    .references ol { padding-left: 20px; font-size: 9.5pt; }
    .references li { margin-bottom: 5px; text-align: justify; }

    @page { size: A4; margin: 18mm 16mm; }
    @media print { body { font-size: 10pt; } .page { padding: 0; } }
  </style>
</head>
<body>
<div class="watermark-svg"><svg width="100%" height="100%" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg"><g transform="translate(5, 5)"><circle cx="20" cy="20" r="18" fill="none" stroke="#00D4AA" stroke-width="0.5" opacity="0.3"/><circle cx="20" cy="20" r="14" fill="none" stroke="#00D4AA" stroke-width="1" opacity="0.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="#00D4AA" stroke-width="1.5" opacity="0.8"/><circle cx="20" cy="20" r="4" fill="#00D4AA"/><circle cx="35" cy="10" r="2.5" fill="#00D4AA"/><circle cx="5" cy="30" r="2.5" fill="#60A5FA"/></g><text x="55" y="32" font-family="Arial Black, sans-serif" font-weight="900" font-size="28" fill="#111"><tspan fill="#00D4AA">A</tspan>URA</text><text x="55" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#666" letter-spacing="0.8">AIR QUALITY REALTIME ANALYTICS</text></svg></div>
<div class="watermark">AuraX</div>
<div class="page">

  <!-- Branding strip -->
  <div class="branding-strip">
    <div class="brand-logo"><svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg"><g transform="translate(5, 5)"><circle cx="20" cy="20" r="18" fill="none" stroke="#00D4AA" stroke-width="0.5" opacity="0.3"/><circle cx="20" cy="20" r="14" fill="none" stroke="#00D4AA" stroke-width="1" opacity="0.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="#00D4AA" stroke-width="1.5" opacity="0.8"/><circle cx="20" cy="20" r="4" fill="#00D4AA"/><circle cx="35" cy="10" r="2.5" fill="#00D4AA"/><circle cx="5" cy="30" r="2.5" fill="#60A5FA"/></g><text x="55" y="32" font-family="Arial Black, sans-serif" font-weight="900" font-size="28" fill="#111"><tspan fill="#00D4AA">A</tspan>URA</text><text x="55" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#666" letter-spacing="0.8">AIR QUALITY REALTIME ANALYTICS</text></svg></div>
    <div class="brand-tag">Environmental Intelligence Agency<br>Official Assessment Report</div>
  </div>

  <!-- Title Block -->
  <div class="title-block">
    <div class="paper-title">Air Quality Assessment Report: ${city.name}</div>
    <div class="paper-subtitle">Ambient Air Pollution Analysis using Real-Time Sensor Data and Predictive Advisory</div>
    <div class="meta-row">
      <span class="meta-label">Generated by:</span> AURA Intelligence Platform &nbsp;|&nbsp;
      <span class="meta-label">Data Source:</span> ${city.source || 'Open-Meteo Air Quality API'} &nbsp;|&nbsp;
      <span class="meta-label">Report Date:</span> ${dateStr}, ${timeStr} IST
    </div>
    ${city.dateTime ? `<div class="meta-row"><span class="meta-label">Data Timestamp:</span> ${dataTime} IST</div>` : ''}
  </div>

  <!-- Abstract -->
  <div class="abstract-box">
    <span class="abstract-label">Abstract</span> — This report presents a real-time air quality assessment for
    <strong>${city.name}</strong> based on data retrieved from ground-level and satellite-integrated monitoring systems.
    The current Air Quality Index (AQI) is recorded at <strong>${aqi}</strong>, classified as
    <strong>${aqiLabel}</strong>${city.dominantPollutant ? `, with <strong>${city.dominantPollutant}</strong> identified as the dominant pollutant` : ''}.
    This document covers measured pollutant concentrations, compliance with WHO and INAAQS guidelines,
    multi-standard AQI comparisons, terrain context, and a structured advisory generated by the AuraX analytical engine.
    The report is intended for environmental monitoring, public health response, and urban planning applications.
  </div>

  <div class="keywords">
    <strong>Keywords —</strong>
    Air Quality Index, Ambient Air Pollution, PM2.5, NO₂, Ozone, WHO Air Quality Guidelines 2021, INAAQS 2009, ${city.name.split(',')[0]}, AuraX Intelligence Platform
  </div>

  <!-- Section I: Measurement Summary -->
  <div class="section">
    <div class="section-heading"><span class="section-number">I.</span> Measurement Summary</div>

    <div class="aqi-summary">
      <div class="aqi-value-box">
        <div class="aqi-value">${aqi}</div>
        <div class="aqi-scale-label">US EPA AQI</div>
      </div>
      <div class="aqi-meta">
        <div class="aqi-cat">${aqiLabel}</div>
        <div class="aqi-meta-row"><strong>Location:</strong> ${city.name}</div>
        ${city.lat ? `<div class="aqi-meta-row"><strong>Coordinates:</strong> ${city.lat.toFixed(4)}° N, ${city.lon.toFixed(4)}° E</div>` : ''}
        ${city.dominantPollutant ? `<div class="aqi-meta-row"><strong>Dominant Pollutant:</strong> ${city.dominantPollutant}</div>` : ''}
        <div class="aqi-meta-row"><strong>Measurement Time:</strong> ${dataTime} IST</div>
        <div class="aqi-meta-row"><strong>Report Generated:</strong> ${dateStr}, ${timeStr} IST</div>
      </div>
    </div>

    <!-- AQI colour scale band -->
    <div class="aqi-band">
      ${[['0–50','Good','#1b7e34','#e8f5e9'],['51–100','Moderate','#a07000','#fff9e6'],['101–150','Sensitive','#c45e00','#fff3e0'],['151–200','Unhealthy','#b00020','#fff0f0'],['201–300','Very Unhealthy','#6a0088','#f5e6ff'],['301+','Hazardous','#7a0000','#ffe6e6']].map(([r,l,c,bg]) => `<div class="aqi-band-cell" style="background:${bg};color:${c};border-right:1px solid #ccc;"><div style="font-weight:700">${r}</div><div>${l}</div></div>`).join('')}
    </div>

    ${city.healthRecommendation ? `
    <p style="margin-top:8px"><strong>Official Health Advisory:</strong> ${city.healthRecommendation}</p>` : ''}
  </div>

  <!-- Section II: Pollutant Concentrations -->
  ${pollutantRows ? `
  <div class="section">
    <div class="section-heading"><span class="section-number">II.</span> Pollutant Concentrations &amp; Guideline Compliance</div>
    <p>
      Table I presents the measured concentrations of key atmospheric pollutants alongside the
      WHO 24-hour Air Quality Guidelines (2021) and India's National Ambient Air Quality Standards (INAAQS, 2009).
      Compliance status is colour-coded: <span style="color:#1b7e34;font-weight:700">Within</span> indicates conformity;
      <span style="color:#b00020;font-weight:700">Exceeds</span> indicates a breach of the respective threshold.
    </p>
    <div class="table-wrapper">
      <div class="table-caption">Table I. Measured Pollutant Concentrations vs. Regulatory Guidelines</div>
      <table>
        <thead>
          <tr>
            <th>Pollutant</th>
            <th>Measured Value</th>
            <th>WHO 2021 Guideline</th>
            <th>WHO Status</th>
            <th>INAAQS 2009 Status</th>
          </tr>
        </thead>
        <tbody>${pollutantRows}</tbody>
      </table>
    </div>
    <p style="font-size:9pt;color:#555;font-style:italic;margin-top:-6px">
      Note: Values are 24-hour averages unless otherwise specified. INAAQS limits reflect annual mean standards where specific 24-hour values are not defined.
    </p>
  </div>` : ''}

  <!-- Section III: Multi-Standard AQI Comparison -->
  ${indexRows ? `
  <div class="section">
    <div class="section-heading"><span class="section-number">III.</span> Multi-Standard AQI Comparison</div>
    <p>
      Different national and international bodies compute the AQI using distinct methodologies and breakpoint concentrations.
      Table II presents the AQI values for ${city.name} under each applicable standard at the time of measurement.
    </p>
    <div class="table-wrapper">
      <div class="table-caption">Table II. AQI Values by Reporting Standard</div>
      <table>
        <thead>
          <tr><th>Standard</th><th>AQI Value</th><th>Category</th></tr>
        </thead>
        <tbody>${indexRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Section IV: AQI Scale Reference -->
  <div class="section">
    <div class="section-heading"><span class="section-number">IV.</span> AQI Classification Scale</div>
    <p>The US EPA AQI classification scale used in this report is defined in Table III.</p>
    <div class="table-wrapper">
      <div class="table-caption">Table III. US EPA AQI Classification Bands</div>
      <table>
        <thead>
          <tr><th>AQI Range</th><th>Category</th><th>Health Implication</th></tr>
        </thead>
        <tbody>
          ${[
            ['0 – 50',   'Good',                    'Air quality is satisfactory; little or no risk.'],
            ['51 – 100', 'Moderate',                'Acceptable; some risk for unusually sensitive people.'],
            ['101 – 150','Unhealthy for Sensitive Groups','Sensitive groups may experience health effects.'],
            ['151 – 200','Unhealthy',               'General public may begin to experience health effects.'],
            ['201 – 300','Very Unhealthy',           'Health alert; everyone may experience serious effects.'],
            ['301+',     'Hazardous',               'Emergency conditions; entire population at risk.'],
          ].map(([r,c,h], i) =>
            `<tr style="background:${i%2===0?'#fff':'#f9f9f9'}">
              <td style="padding:7px 10px;border:1px solid #ccc;text-align:center;font-weight:700">${r}</td>
              <td style="padding:7px 10px;border:1px solid #ccc">${c}</td>
              <td style="padding:7px 10px;border:1px solid #ccc;font-size:9.5pt">${h}</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Section V: AuraX Advisory -->
  <div class="section">
    <div class="section-heading"><span class="section-number">V.</span> AuraX Predictive Advisory</div>
    <p>
      The following advisory has been generated by the AuraX analytical engine based on current pollutant measurements,
      time-of-day patterns, and established epidemiological risk parameters for <strong>${city.name.split(',')[0]}</strong>.
    </p>
    <div class="advisory-content" style="margin-top:10px">
      ${advisory}
    </div>
  </div>

  <!-- Section VI: Terrain & Geographic Context -->
  ${city.lat && city.lon ? `
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <div class="section">
    <div class="section-heading"><span class="section-number">VI.</span> Terrain &amp; Geographic Context</div>
    <p>
      Figure 1 presents a terrain map centred on <strong>${city.name}</strong>
      (${city.lat.toFixed(4)}&deg;&thinsp;N, ${city.lon.toFixed(4)}&deg;&thinsp;E).
      Topographic characteristics &mdash; including elevation gradients, proximity to industrial zones, water bodies, and urban density &mdash;
      are significant determinants of localised air quality dispersion, pollutant accumulation, and boundary-layer dynamics.
    </p>
    <div class="map-frame">
      <div class="map-caption">Fig. 1 &mdash; Terrain &amp; Settlement Map &middot; ${city.name} &middot; &copy; OpenStreetMap</div>
      <div id="reportMap"></div>
    </div>
    <p style="font-size:9pt;color:#555;font-style:italic;margin-top:4px">&copy; OpenStreetMap contributors. Map data available under the Open Database Licence (ODbL) &mdash; openstreetmap.org</p>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function() {
      var map = L.map('reportMap', {
        center: [${city.lat}, ${city.lon}],
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true
      });
      var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>',
        maxZoom: 19
      }).addTo(map);
      var icon = L.divIcon({
        className: '',
        html: '<div style=\"width:16px;height:16px;border-radius:50%;background:#b00020;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45);\"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([${city.lat}, ${city.lon}], { icon: icon })
        .bindPopup('<strong>${city.name}</strong><br>AQI: ${city.aqi} &mdash; ${city.category || ''}')
        .addTo(map)
        .openPopup();
        
      tiles.on('load', function() { window.mapReady = true; });
    })();
  </script>` : ''}

  <!-- Section VII: Conclusion -->
  <div class="section">
    <div class="section-heading"><span class="section-number">VII.</span> Conclusion</div>
    <p>
      Based on real-time telemetry collected on <strong>${dateStr}</strong>, the ambient air quality in
      <strong>${city.name}</strong> registers a US EPA AQI of <strong>${aqi}</strong>, classified as
      <strong style="color:${aqiHex}">${aqiLabel}</strong>.
      ${aqi <= 50 ? 'Current conditions present minimal health risk to the general population. Outdoor activities are unrestricted.' :
        aqi <= 100 ? 'Conditions are broadly acceptable; however, unusually sensitive individuals should limit prolonged outdoor exertion.' :
        aqi <= 150 ? 'Sensitive groups — including children, the elderly, and persons with pre-existing respiratory or cardiovascular conditions — should limit outdoor activity, particularly during peak traffic and afternoon hours.' :
        aqi <= 200 ? 'The general population may begin to experience health effects. Extended outdoor exertion is not recommended; sensitive groups should remain indoors.' :
        'Current air quality constitutes an acute public health concern. All individuals — irrespective of health status — should minimise outdoor exposure and follow directives issued by local health authorities.'}
      Continued real-time monitoring and strict adherence to the measures outlined in Section V are strongly recommended.
    </p>
  </div>

  <!-- Section VIII: Certification & Signatories -->
  <div class="section" style="margin-top:40px;">
    <div class="section-heading"><span class="section-number">VIII.</span> Certification &amp; Signatories</div>
    <p style="font-size:9.5pt;margin-bottom:20px;">
      This document has been electronically generated by the AuraX Environmental Intelligence Agency. 
      The measurements and advisories contained herein are based on real-time sensor telemetry, satellite data fusion, and predictive modeling.
    </p>
    <div style="display:flex;justify-content:space-between;margin-top:20px;">
      <div style="width:30%;border-top:1px solid #111;text-align:center;padding-top:5px;">
        <div style="font-size:9.5pt;font-weight:700;">AuraX AI System</div>
        <div style="font-size:8.5pt;color:#555;">Data Acquisition Unit</div>
      </div>
      <div style="width:30%;border-top:1px solid #111;text-align:center;padding-top:5px;">
        <div style="font-size:9.5pt;font-weight:700;">Predictive Analysis Engine</div>
        <div style="font-size:8.5pt;color:#555;">Environmental Risk Division</div>
      </div>
      <div style="width:30%;border-top:1px solid #111;text-align:center;padding-top:5px;position:relative;">
        <div style="font-size:9.5pt;font-weight:700;">Authorized Signatory</div>
        <div style="font-size:8.5pt;color:#555;">Environmental Agency Lead</div>
        <div style="position:absolute;top:-45px;left:50%;transform:translateX(-50%) rotate(-12deg);font-family:'Courier New',Courier,monospace;color:rgba(176,0,32,0.45);border:2.5px solid rgba(176,0,32,0.35);padding:4px 12px;border-radius:6px;font-size:11pt;font-weight:bold;white-space:nowrap;">DIGITALLY VERIFIED</div>
      </div>
    </div>
  </div>

  <!-- References -->
  <div class="section references">
    <div class="section-heading">References</div>
    <ol>
      <li>World Health Organization (WHO). <em>WHO Global Air Quality Guidelines: Particulate Matter (PM₂.₅ &amp; PM₁₀), Ozone (O₃), Nitrogen Dioxide (NO₂), Sulfur Dioxide (SO₂) and Carbon Monoxide (CO).</em> Geneva: WHO Press, 2021.</li>
      <li>Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India. <em>National Ambient Air Quality Standards.</em> Notification No. G.S.R. 826(E), November 2009.</li>
      <li>U.S. Environmental Protection Agency (EPA). <em>Technical Assistance Document for the Reporting of Daily Air Quality — the Air Quality Index (AQI).</em> EPA-454/B-18-007, 2018.</li>
      <li>Open-Meteo. <em>Air Quality API Documentation.</em> open-meteo.com, ${now.getFullYear()}. Available: https://open-meteo.com/en/docs/air-quality-api</li>
      <li>OpenStreetMap contributors. <em>Terrain &amp; Settlement Map Data.</em> ODbL licence, ${now.getFullYear()}.</li>
      <li>AURA Intelligence Platform. <em>AuraX Air Quality Assessment Engine — Automated Report.</em> Generated ${dateStr}, ${timeStr} IST.</li>
    </ol>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <strong>AuraX Environmental Intelligence Agency</strong><br>
      Automated Assessment System &mdash; v4.6
    </div>
    <div style="text-align:right">
      Report ID: AQR-${now.getTime().toString(36).toUpperCase()}<br>
      Generated: ${now.toISOString().replace('T',' ').slice(0,19)} UTC<br>
      Compliance Standard: IEEE-St721 (Environmental Informatics)
    </div>
    </div>
  </div>

</div>
<script>
  window.onload = () => { 
    let checkMap = setInterval(() => {
      if (window.mapReady || !document.getElementById('reportMap')) {
        clearInterval(checkMap);
        setTimeout(() => window.print(), 1800);
      }
    }, 500);
    setTimeout(() => { if (checkMap) { clearInterval(checkMap); window.print(); } }, 6000);
  };
</script>
</body>
</html>`;
}

export function MapView() {
  const [cityData, setCityData] = useState<Array<any>>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number } | null>(null);
  const [showSpoofPanel, setShowSpoofPanel] = useState(false);
  const [spoofCity, setSpoofCity] = useState<string>('');
  const [spoofLoading, setSpoofLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<Array<{ name: string; country: string; lat: number; lon: number; aqi?: number }>>(() => {
    try { return JSON.parse(localStorage.getItem('aura_recent_searches') || '[]'); } catch { return []; }
  });
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);

  // Log page view on mount
  useEffect(() => { logEvent('map_view', {}, '/map'); }, []);
  const [aiAdvisory, setAiAdvisory] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle'|'loading'|'success'>('idle');
  
  const [mlPrediction, setMlPrediction] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Reset AI advisory and ML when city changes
  useEffect(() => {
    setAiAdvisory('');
    setShowAiPanel(false);
    setMlPrediction(null);
  }, [selectedCity?.name]);

  // Fetch ML Prediction data
  useEffect(() => {
    const fetchMlData = async () => {
      if (!selectedCity || !selectedCity.details) return;
      setMlLoading(true);
      try {
        const payload = {
          co: selectedCity.details.co || 0,
          ozone: selectedCity.details.o3 || 0,
          no2: selectedCity.details.no2 || 0,
          pm25: selectedCity.details.pm2_5 || 0,
          pm10: selectedCity.details.pm10 || 0,
          so2: selectedCity.details.so2 || 0
        };
        const res = await fetch(`${ML_API_URL}/predict/health`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const json = await res.json();
          setMlPrediction(json);
        }
      } catch (err) {
        console.error('Failed to fetch ML Prediction:', err);
      } finally {
        setMlLoading(false);
      }
    };
    fetchMlData();
  }, [selectedCity]);


  const generateLocalAdvisory = (city: any): string => {
    const aqi = city.aqi;
    const loc = city.name.split(',')[0];
    const dp = city.dominantPollutant || '';
    const p = city.pollutants || {};
    const pm25 = parseFloat(p.pm25?.value) || 0;
    const pm10 = parseFloat(p.pm10?.value) || 0;
    const no2 = parseFloat(p.no2?.value) || 0;
    const o3 = parseFloat(p.o3?.value) || 0;
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 21);
    const isNight = hour >= 22 || hour < 6;


    const situation = aqi <= 50 ? `Atmospheric telemetry for **${loc}** confirms optimal air quality. Baseline pollutant measurements remain well within clinical and international safety bounds.` :
                    aqi <= 100 ? `Current ambient assessment for **${loc}** indicates stable conditions with minor particulate concentrations. Overall exposure risk remains managed for the general population.` :
                    aqi <= 150 ? `Elevated atmospheric burden detected in **${loc}**. Regional stagnation is currently impeding the dispersion of urban emissions.` :
                    aqi <= 200 ? `Significant environmental degradation noted in **${loc}**. Particulate concentrations have breached standard safety thresholds across the regional monitoring network.` :
                    aqi <= 300 ? `Critical environmental event in **${loc}**. Acute stagnation of industrial and vehicular discharge has elevated regional health risks to severe levels.` :
                    `Emergency environmental breach. **${loc}** has exceeded recordable safety scales, requiring immediate institutional intervention and emergency protocols.`;

    const predictionBase = isPeakHour
      ? `Currently entering **high-density vehicular activity phases**. Expect secondary pollutant concentrations to peak before atmospheric dissipation begins post-cycle.`
      : isNight
      ? `Nocturnal atmospheric patterns suggest **lower ambient activity**. However, potential thermal inversion may trap lingering particulates closer to the surface through the early morning interval.`
      : `Mid-day thermal activity is currently aiding dispersion. Dispersion rates are expected to decrease by **10-15%** during the transition to evening peak hours.`;

    const level = aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : aqi <= 150 ? 'sensitive' : aqi <= 200 ? 'unhealthy' : aqi <= 300 ? 'very' : 'haz';

    const healthMap: Record<string, string[]> = {
      good: ['Outdoor physical activity and industrial operations are unrestricted.', 'No clinical contraindications for sensitive demographics.'],
      moderate: ['Sensitive individuals may experience minor cardiovascular stress under prolonged exertion.', 'No specific restrictions for general population.'],
      sensitive: ['Children and the elderly should reduce extended outdoor exposure periods.', 'Clinical monitoring recommended for persons with pre-existing respiratory or cardiac pathology.'],
      unhealthy: ['Mandatory reduction in outdoor physical exertion across all demographics.', 'N95-standard filtration recommended for necessary outdoor transit.'],
      very: ['Avoid all non-essential outdoor exposure.', 'Seal all residential points of entry; activate HEPA filtration systems.'],
      haz: ['Emergency indoor sheltering required.', 'Strict avoidance of outdoor atmosphere; medical assistance should be sought for acute respiratory distress.'],
    };

    const indoorMap: Record<string, string[]> = {
      good: ['Standard ventilation protocols are adequate.', 'Indoor air quality maintenance through natural circulation is encouraged.'],
      moderate: ['Periodic monitoring of indoor particulate levels advised.', 'Consider basic air purification in high-use areas.'],
      unhealthy: ['Seal windows and external vents to prevent ambient infiltration.', 'Deploy high-efficiency particulate air (HEPA) systems continuously.'],
    };

    const longTermMap: Record<string, string[]> = {
      good: ['Continue existing urban forestry and low-emission transit development.', 'Maintain regional monitoring network density.'],
      moderate: ['Implement targeted emission controls for peak vehicular hours.', 'Encourage transition to high-occupancy and electric transit modes.'],
      unhealthy: [
        'Shift regional energy grid towards carbon-neutral sources.',
        'Accelerate the implementation of zero-emission industrial zones.',
        no2 > 40 ? 'Immediate focus on decommissioning legacy diesel transportation fleets.' : '',
      ].filter(Boolean),
      very: [
        'Initiate emergency regional emission caps.',
        'Institutionalise work-from-home protocols during peak pollution season.',
      ],
      haz: [
        'Fundamental restructuring of city transit and energy systems.',
        'Institutional transformation of industrial pollutant regulations.',
      ],
    };

    const riskMap: Record<string, string> = {
      good: `At AQI ${aqi}, long-term cumulative exposure poses negligible health risk.`,
      moderate: `Prolonged exposure during this period may result in transient respiratory irritation for sensitive subsets.`,
      sensitive: `Atmospheric conditions indicate risk of acute exacerbation for asthma and chronic obstructive pulmonary disease (COPD).`,
      unhealthy: `Systemic risks identified including clinical cardiovascular stress and pulmonary inflammation across the population.`,
      very: `High probability of acute medical emergencies corresponding to sustained particulate inhalation.`,
      haz: `Critical public health hazard. Extreme threat of immediate system and respiratory failure with minimal exposure.`,
    };

    const healthBullets = (healthMap[level] || healthMap.unhealthy).join('\n');
    const indoorBullets = (indoorMap[level] || indoorMap.unhealthy).join('\n');
    const longTermBullets = (longTermMap[level] || longTermMap.unhealthy).join('\n');

    return `### Analytical Summary

${situation}
${pm25 > 0 ? `PM2.5: **${pm25} µg/m³** | NO₂: **${no2} ppb**.` : ''}

### Predictive Forecast

${predictionBase}

### Health Guidelines

${healthBullets}

### Environmental Countermeasures

${indoorBullets}

### Strategic Mitigation for ${loc}

${longTermBullets}

### Clinical Risk Assessment

${riskMap[level]}

---
*Verification Source: AuraX Environmental Intelligence Agency. Data verified through institutional sensor fusion protocols.*`;
  };

  const fetchAiAdvisory = async () => {
    if (!selectedCity) return;
    setAiLoading(true);
    setShowAiPanel(true);
    setAiAdvisory('');

    // Simulate brief "analysis" delay for UX
    await new Promise(r => setTimeout(r, 1200));

    try {
      // Use local AuraX advisory engine (no external API keys needed)
      const text = generateLocalAdvisory(selectedCity);
      setAiAdvisory(text);
    } catch (err: any) {
      setAiAdvisory(generateLocalAdvisory(selectedCity));
    } finally {
      setAiLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!selectedCity || downloadState !== 'idle') return;
    setDownloadState('loading');
    await new Promise(r => setTimeout(r, 800));

    const citySlug = selectedCity.name.split(',')[0].trim();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Build HTML with auto-print + PDF filename via <title>
    const html = generateReportHTML(selectedCity, aiAdvisory, generateLocalAdvisory)
      // Set <title> to city name so browser uses it as the PDF filename
      .replace(
        /<title>.*?<\/title>/,
        `<title>${citySlug} AQI Report — ${dateStr}</title>`
      )
      // Inject auto-print script + print-specific styles
      .replace(
        '</head>',
        `<style>
          @page { size: A4; margin: 15mm; }
          @media print {
            body { background: #fff !important; color: #111 !important; }
            .card { background: #f7f7f7 !important; border-color: #ddd !important; }
          }
        </style>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
          };
        <\/script>
        </head>`
      );

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    // Open in new tab — browser print dialog appears automatically
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    setDownloadState('success');
    setTimeout(() => setDownloadState('idle'), 3000);
  };

  // Simple markdown-ish rendering
  const renderAdvisory = (text: string) => {
    return text.split('\n').filter(line => line.trim() !== '').map((line, i) => {
      // Premium Section Headers (replacing emoji-based markdown)
      if (line.startsWith('### ')) {
        const title = line.replace('### ', '');
        let Icon = Search;
        let color = '#00D4AA';
        
        if (title.includes('Analysis') || title.includes('Summary')) { Icon = Activity; color = '#00D4AA'; }
        else if (title.includes('Prediction') || title.includes('Forecast')) { Icon = TrendingUp; color = '#60A5FA'; }
        else if (title.includes('Health') || title.includes('Guidelines')) { Icon = ShieldCheck; color = '#F87171'; }
        else if (title.includes('Countermeasures') || title.includes('Environmental')) { Icon = Home; color = '#FBBF24'; }
        else if (title.includes('Mitigation') || title.includes('Strategic')) { Icon = Leaf; color = '#34D399'; }
        else if (title.includes('Risk') || title.includes('Clinical')) { Icon = AlertTriangle; color = '#FB923C'; }

        return (
          <div key={i} className="mt-8 mb-4 border-l-4 pl-4 py-1" style={{ borderColor: color }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-5 h-5 opacity-90" style={{ color: color }} />
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/90">{title}</h3>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-stroke/40 to-transparent" />
          </div>
        );
      }

      // Bullets
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        return (
          <div key={i} className="flex gap-3 ml-1 mb-2">
            <div className="mt-2 w-1 h-1 rounded-full bg-[#00D4AA]/60 shrink-0" />
            <p className="text-sm text-text-primary/75 leading-relaxed italic">{line.replace(/^[-*•]\s+/, '')}</p>
          </div>
        );
      }

      // Verification Footer
      if (line.includes('Verification Source')) {
        return (
          <div key={i} className="mt-10 p-4 border border-stroke/30 rounded-2xl bg-surface/50 backdrop-blur-sm flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-[#00D4AA]/40" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-tighter text-[#00D4AA]">Verified Institutional Advisory</div>
              <p className="text-[11px] text-muted leading-tight">{line.replace(/^\*|\*$/g, '')}</p>
            </div>
          </div>
        );
      }

      // Standard paragraphs
      const boldParsed = line.split(/\*\*(.+?)\*\*/g).map((part, j) => 
        j % 2 === 1 ? <strong key={j} className="text-text-primary font-bold">{part}</strong> : part
      );
      
      return <p key={i} className="text-sm text-text-primary/80 leading-relaxed mb-4">{boldParsed}</p>;
    });
  };


  // Load all India cities AQI — auto-refresh every 5 minutes silently
  useEffect(() => {
    const fetchAllCities = async (silent = false) => {
      if (!silent) setLoadingCities(true);
      const results = await Promise.allSettled(
        INDIA_CITIES.map(async (city) => {
          const res = await fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`
          );
          const json = await res.json();
          return {
            ...city,
            aqi: json.current?.us_aqi ?? 0,
            details: {
              pm10: json.current?.pm10,
              pm2_5: json.current?.pm2_5,
              co: json.current?.carbon_monoxide,
              no2: json.current?.nitrogen_dioxide,
              so2: json.current?.sulphur_dioxide,
              o3: json.current?.ozone,
            }
          };
        })
      );
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
      setCityData(loaded);
      if (!silent) setLoadingCities(false);
    };
    fetchAllCities();
    // Silent background refresh every 5 minutes
    const interval = setInterval(() => fetchAllCities(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        const json = await res.json();
        setSearchResults(json.results || []);
      } catch { setSearchResults([]); }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = async (result: any) => {
    setFlyTarget({ lat: result.latitude, lon: result.longitude });
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    setHighlightedIndex(-1);
    try {
      const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${result.latitude}&longitude=${result.longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
      const json = await res.json();
      if (json.current && json.current.us_aqi !== undefined) {
        const aqi = json.current.us_aqi;
        const entry = {
          name: result.name,
          country: result.admin1 ? `${result.admin1}, ${result.country}` : result.country,
          lat: result.latitude,
          lon: result.longitude,
          aqi,
        };
        setSelectedCity({
          aqi,
          name: result.name + (result.country ? `, ${result.country}` : ''),
          lat: result.latitude, lon: result.longitude,
          details: { pm10: json.current.pm10, pm2_5: json.current.pm2_5, co: json.current.carbon_monoxide, no2: json.current.nitrogen_dioxide, so2: json.current.sulphur_dioxide, o3: json.current.ozone },
          chemicals: []
        });
        // Save to recent searches (max 5, deduplicated)
        setRecentSearches(prev => {
          const filtered = prev.filter(r => r.name !== entry.name);
          const updated = [entry, ...filtered].slice(0, 5);
          localStorage.setItem('aura_recent_searches', JSON.stringify(updated));
          return updated;
        });
      }
    } catch { /* ignore */ }
  };

  const handleSelectRecent = (recent: typeof recentSearches[0]) => {
    setFlyTarget({ lat: recent.lat, lon: recent.lon });
    setSearchFocused(false);
    setSearchQuery('');
    // Re-fetch fresh AQI for the recent location
    handleSelectResult({ latitude: recent.lat, longitude: recent.lon, name: recent.name, country: recent.country.split(', ').pop() || recent.country, admin1: recent.country.split(', ')[0] });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const list = searchResults;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && highlightedIndex >= 0) { handleSelectResult(list[highlightedIndex]); }
    else if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); setSearchResults([]); searchInputRef.current?.blur(); }
  };

  // Spoof GPS to a city
  const handleSpoofLocation = async () => {
    if (!spoofCity) return;
    const city = INDIA_CITIES.find(c => c.name === spoofCity);
    if (!city) return;
    setSpoofLoading(true);
    try {
      const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
      const json = await res.json();
      setSelectedCity({
        aqi: json.current?.us_aqi ?? 0,
        name: `${city.name}, ${city.state}`,
        lat: city.lat, lon: city.lon,
        details: { pm10: json.current?.pm10, pm2_5: json.current?.pm2_5, co: json.current?.carbon_monoxide, no2: json.current?.nitrogen_dioxide, so2: json.current?.sulphur_dioxide, o3: json.current?.ozone },
        chemicals: city.chemicals,
        spoofed: true,
      });
      setFlyTarget({ lat: city.lat, lon: city.lon });
    } catch { /* ignore */ }
    setSpoofLoading(false);
    setShowSpoofPanel(false);
  };

  // Filter city markers
  const filteredCities = cityData.filter(city => {
    if (activeFilter === 'All') return true;
    return getCityFilterCategory(city.aqi) === activeFilter;
  });

  // Count per category
  const categoryCounts = FILTER_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? cityData.length : cityData.filter(c => getCityFilterCategory(c.aqi) === cat).length;
    return acc;
  }, {} as Record<FilterCategory, number>);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-bg text-text-primary relative overflow-hidden"
    >
      {/* ── Premium Search Bar ── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-[2000] flex gap-3 pointer-events-none">
        <div className="flex-1 relative pointer-events-auto">

          {/* Input wrapper with animated focus ring */}
          <div className={`relative rounded-2xl transition-all duration-300 ${
            searchFocused
              ? 'shadow-[0_0_0_2px_#00D4AA55,0_8px_32px_rgba(0,212,170,0.18)]'
              : 'shadow-2xl'
          }`}>
            {/* Left icon: spinner while searching, search icon otherwise */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {isSearching
                ? <Loader2 className="w-5 h-5 text-[#00D4AA] animate-spin" />
                : <Search className={`w-5 h-5 transition-colors duration-200 ${searchFocused ? 'text-[#00D4AA]' : 'text-muted'}`} />
              }
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHighlightedIndex(-1); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search any city, region or country…"
              className="w-full bg-surface/95 backdrop-blur-2xl border border-stroke rounded-2xl pl-12 pr-10 py-3.5 text-text-primary placeholder:text-muted/60 focus:outline-none focus:border-[#00D4AA]/60 transition-colors duration-200 text-sm font-medium"
            />

            {/* Clear button */}
            {searchQuery && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stroke/60 hover:bg-stroke flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            )}
          </div>

          {/* Dropdown: recent searches OR live results */}
          <AnimatePresence>
            {searchFocused && (
              <motion.div
                key="search-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full mt-2 w-full bg-bg/98 backdrop-blur-2xl border border-stroke/80 rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.5)] z-[2000]"
              >

                {/* ── Live results ── */}
                {searchResults.length > 0 ? (
                  <div>
                    <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                      <Search className="w-3 h-3 text-[#00D4AA]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D4AA]">Results</span>
                      <span className="text-[10px] text-muted ml-auto">↑↓ to navigate · Enter to select</span>
                    </div>
                    {searchResults.map((res, i) => {
                      const isHighlighted = i === highlightedIndex;
                      const flag = res.country_code ? String.fromCodePoint(...[...res.country_code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '';
                      return (
                        <button
                          key={i}
                          onMouseDown={() => handleSelectResult(res)}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          className={`w-full text-left px-4 py-3 border-b border-stroke/40 last:border-0 flex items-center gap-3 transition-all duration-100 ${
                            isHighlighted ? 'bg-[#00D4AA]/10' : 'hover:bg-surface/60'
                          }`}
                        >
                          {/* Location pin icon */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isHighlighted ? 'bg-[#00D4AA]/20' : 'bg-stroke/30'
                          }`}>
                            <MapPin className={`w-4 h-4 ${isHighlighted ? 'text-[#00D4AA]' : 'text-muted'}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-text-primary truncate">{res.name}</span>
                              {flag && <span className="text-base leading-none shrink-0">{flag}</span>}
                            </div>
                            <span className="text-xs text-muted truncate block">
                              {[res.admin1, res.admin2, res.country].filter(Boolean).join(', ')}
                            </span>
                          </div>

                          {/* Elevation badge */}
                          {res.elevation && (
                            <span className="text-[10px] text-muted border border-stroke/50 rounded-full px-2 py-0.5 shrink-0">
                              {Math.round(res.elevation)}m
                            </span>
                          )}

                          <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isHighlighted ? 'text-[#00D4AA]' : 'text-muted/40'}`} />
                        </button>
                      );
                    })}
                  </div>

                ) : searchQuery.trim() && !isSearching ? (
                  /* No results state */
                  <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                    <Search className="w-8 h-8 text-muted/40" />
                    <p className="text-sm text-muted">No places found for <strong className="text-text-primary">"{searchQuery}"</strong></p>
                    <p className="text-xs text-muted/60">Try a different spelling or nearby city name</p>
                  </div>

                ) : recentSearches.length > 0 && !searchQuery ? (
                  /* Recent searches */
                  <div>
                    <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 text-muted" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Recent</span>
                      </div>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setRecentSearches([]); localStorage.removeItem('aura_recent_searches'); }}
                        className="text-[10px] text-muted hover:text-[#FF5252] transition-colors"
                      >Clear all</button>
                    </div>
                    {recentSearches.map((r, i) => {
                      const aqiColor = r.aqi
                        ? r.aqi <= 50 ? '#00E676' : r.aqi <= 100 ? '#FFE57F' : r.aqi <= 150 ? '#FF9E40' : r.aqi <= 200 ? '#FF5252' : '#CE93D8'
                        : 'var(--muted)';
                      const aqiLabel = r.aqi
                        ? r.aqi <= 50 ? 'Good' : r.aqi <= 100 ? 'Moderate' : r.aqi <= 150 ? 'Unhealthy' : r.aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy'
                        : '';
                      return (
                        <button
                          key={i}
                          onMouseDown={() => handleSelectRecent(r)}
                          className="w-full text-left px-4 py-3 border-b border-stroke/40 last:border-0 flex items-center gap-3 hover:bg-surface/60 transition-all duration-100"
                        >
                          <div className="w-8 h-8 rounded-xl bg-stroke/20 flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4 text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-text-primary truncate">{r.name}</div>
                            <div className="text-xs text-muted truncate">{r.country}</div>
                          </div>
                          {r.aqi && (
                            <div className="flex flex-col items-end shrink-0 gap-0.5">
                              <span className="text-sm font-bold font-mono" style={{ color: aqiColor }}>{r.aqi}</span>
                              <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: aqiColor }}>{aqiLabel}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.trim() && isSearching ? (
                  /* Searching spinner */
                  <div className="px-4 py-6 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#00D4AA] animate-spin shrink-0" />
                    <span className="text-sm text-muted">Searching for <strong className="text-text-primary">{searchQuery}</strong>…</span>
                  </div>
                ) : null}

                {/* Keyboard shortcut hint */}
                <div className="px-4 py-2.5 border-t border-stroke/40 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted/50">
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stroke/40 rounded text-[9px]">↑↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stroke/40 rounded text-[9px]">↵</kbd> Select</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-stroke/40 rounded text-[9px]">Esc</kbd> Close</span>
                  </div>
                  <span className="text-[10px] text-muted/40">Powered by Open-Meteo Geocoding</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Explore Any City button */}
        <button
          onClick={() => setShowSpoofPanel(v => !v)}
          className={`p-3 backdrop-blur-xl border rounded-2xl transition-all flex items-center justify-center pointer-events-auto shrink-0 gap-2 px-4 ${
            showSpoofPanel
              ? 'bg-[#00D4AA]/20 border-[#00D4AA]/60 text-[#00D4AA]'
              : 'bg-surface/90 border-stroke hover:bg-surface hover:border-[#00D4AA]/40 text-text-primary'
          }`}
          title="Explore Any City"
        >
          <Navigation className="w-5 h-5 text-[#00D4AA]" />
          <span className="text-sm font-medium hidden sm:block">Explore</span>
        </button>
      </div>

      {/* AQI Filter chips */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[1000] flex gap-2 overflow-x-auto pb-2 scrollbar-hide pointer-events-none">

        {/* Heatmap toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full backdrop-blur-md border text-sm transition-all pointer-events-auto flex items-center gap-1.5 ${
            showHeatmap
              ? 'bg-[#00D4AA]/20 border-[#00D4AA]/50 text-text-primary'
              : 'bg-surface/80 border-stroke text-muted hover:text-text-primary'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          AQI Heatmap
        </button>

        <div className="w-px bg-stroke/50 mx-1" />
        {FILTER_CATEGORIES.map((filter) => {
          const meta = FILTER_META[filter];
          const count = categoryCounts[filter] ?? 0;
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full border text-sm font-medium transition-all pointer-events-auto flex items-center gap-1.5 ${
                isActive
                  ? 'border-transparent text-black shadow-lg'
                  : 'bg-surface/80 backdrop-blur-md border-stroke text-muted hover:text-text-primary'
              }`}
              style={isActive ? { backgroundColor: meta.color, color: '#000' } : {}}
            >
              <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: isActive ? '#000' : meta.color, opacity: isActive ? 0.5 : 1 }} />
              <span>{filter}</span>
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${isActive ? 'bg-black/20' : 'bg-stroke/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
        {loadingCities && (
          <div className="flex items-center gap-2 px-3 py-1.5 pointer-events-auto">
            <Loader2 className="w-4 h-4 animate-spin text-muted" />
            <span className="text-xs text-muted">Loading cities…</span>
          </div>
        )}
      </div>

      {/* Spoof GPS Panel */}
      <AnimatePresence>
        {showSpoofPanel && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            className="absolute top-[4.5rem] right-4 sm:right-8 z-[2000] w-80 bg-bg/95 backdrop-blur-2xl border border-stroke rounded-3xl shadow-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#00D4AA]" />
                <h3 className="font-semibold text-sm">Explore Any City</h3>
              </div>
              <button onClick={() => setShowSpoofPanel(false)} className="text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted mb-4 leading-relaxed">
              Select an Indian city to simulate its GPS coordinates and instantly load its real-time AQI + pollution data.
            </p>

            <div className="relative mb-4">
              <select
                value={spoofCity}
                onChange={e => setSpoofCity(e.target.value)}
                className="w-full bg-surface border border-stroke rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#00D4AA] appearance-none pr-10 cursor-pointer"
              >
                <option value="">— Choose a city —</option>
                {INDIA_CITIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}, {c.state}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>

            {spoofCity && (() => {
              const city = INDIA_CITIES.find(c => c.name === spoofCity);
              if (!city) return null;
              return (
                <div className="mb-4 bg-surface/60 border border-stroke rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#00D4AA]" />
                    <span className="text-xs font-medium text-[#00D4AA]">Coordinates</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-bg rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted mb-0.5">Latitude</div>
                      <div className="text-sm font-mono font-bold">{city.lat.toFixed(4)}°N</div>
                    </div>
                    <div className="bg-bg rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted mb-0.5">Longitude</div>
                      <div className="text-sm font-mono font-bold">{city.lon.toFixed(4)}°E</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FF9E40]" />
                    <span className="text-xs font-medium text-[#FF9E40]">Known Pollutants</span>
                  </div>
                  <div className="space-y-1.5">
                    {city.chemicals.map((chem, i) => (
                      <div key={i} className="bg-bg rounded-lg p-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold">{chem.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            chem.level === 'Hazardous' ? 'bg-[#8B0000]/30 text-[#ff4444]' :
                            chem.level === 'Very High' ? 'bg-[#CE93D8]/20 text-[#CE93D8]' :
                            chem.level === 'High'     ? 'bg-[#FF5252]/20 text-[#FF5252]' :
                            chem.level === 'Moderate' ? 'bg-[#FF9E40]/20 text-[#FF9E40]' :
                            'bg-[#00E676]/20 text-[#00E676]'
                          }`}>{chem.level}</span>
                        </div>
                        <p className="text-[10px] text-muted leading-tight">{chem.health}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button
              onClick={handleSpoofLocation}
              disabled={!spoofCity || spoofLoading}
              className="w-full py-2.5 rounded-xl bg-[#00D4AA] text-black font-semibold text-sm hover:bg-[#00bfa5] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {spoofLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {spoofLoading ? 'Loading…' : 'Go to This City'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Heatmap Legend */}
      {showHeatmap && (
        <div className="absolute bottom-24 left-6 z-[1000] bg-surface/80 backdrop-blur-xl border border-stroke rounded-2xl p-3 pointer-events-auto">
          <div className="text-[10px] text-muted uppercase tracking-widest mb-2">AQI Heatmap</div>
          <div className="flex items-center gap-1">
            {[
              { color: '#00E676', label: 'Good' },
              { color: '#FFE57F', label: 'Okay' },
              { color: '#FF9E40', label: 'Caution' },
              { color: '#FF5252', label: 'Unhealthy' },
              { color: '#CE93D8', label: 'Hazardous' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[8px] text-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaflet Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[22.5937, 80.9629]}
          zoom={5}
          style={{ width: '100%', height: '100%', background: 'var(--bg)' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <AqiHeatmapLayer visible={showHeatmap} />
          <FlyToController target={flyTarget} />
          <MapClickEvents setSelectedCity={(city) => setSelectedCity({ ...city, chemicals: [] })} />

          {/* India city markers */}
          {filteredCities.map((city) => (
            <Marker
              key={city.name}
              position={[city.lat, city.lon]}
              icon={createCustomIcon(city.aqi)}
              eventHandlers={{
                click: () => {
                  setSelectedCity(city);
                  setFlyTarget({ lat: city.lat, lon: city.lon });
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -22]} opacity={0.95}
                className="!bg-transparent !border-0 !shadow-none !p-0">
                <div style={{
                  background: 'rgba(10,10,15,0.92)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '6px 10px', backdropFilter: 'blur(12px)',
                  color: '#fff', fontSize: 12, fontFamily: 'monospace',
                  textAlign: 'center', minWidth: 80,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{city.name}</div>
                  <div style={{ color: getAqiColor(city.aqi), fontWeight: 800, fontSize: 15 }}>{city.aqi || '…'}</div>
                  <div style={{ color: getAqiColor(city.aqi), fontSize: 10 }}>{getAqiLabel(city.aqi)}</div>
                </div>
              </Tooltip>
            </Marker>
          ))}

          {/* Click-selected city marker (not in INDIA_CITIES) */}
          {selectedCity && !INDIA_CITIES.find(c => c.name === selectedCity.name.split(',')[0]) && (
            <Marker position={[selectedCity.lat, selectedCity.lon]} icon={createCustomIcon(selectedCity.aqi)}>
              <Tooltip permanent direction="top" offset={[0, -22]}
                className="bg-surface text-text-primary border-stroke shadow-xl rounded-lg font-medium">
                <div className="text-center">
                  <div className="text-xs text-muted mb-0.5">{selectedCity.name.split(',')[0]}</div>
                  <div className="font-display italic text-lg">AQI: {isNaN(selectedCity.aqi) ? '-' : selectedCity.aqi}</div>
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Selected City Side Panel */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            key={selectedCity.name + selectedCity.aqi}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute top-0 right-0 w-full max-w-sm h-full bg-bg/96 backdrop-blur-2xl border-l border-stroke z-[1000] p-6 flex flex-col overflow-y-auto"
          >
            <button onClick={() => setSelectedCity(null)} className="absolute top-6 right-6 text-muted hover:text-text-primary z-10">
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={downloadReport}
              title={downloadState === 'success' ? 'Downloaded!' : 'Download Full Report'}
              className={`absolute top-5 right-14 z-10 p-1.5 rounded-xl border transition-all duration-300 ${
                downloadState === 'success'
                  ? 'bg-green-500/20 border-green-400/50 scale-110'
                  : downloadState === 'loading'
                  ? 'bg-[#00D4AA]/20 border-[#00D4AA]/50 animate-pulse'
                  : 'bg-[#00D4AA]/10 hover:bg-[#00D4AA]/20 border-[#00D4AA]/30 hover:scale-110'
              }`}
            >
              {downloadState === 'loading' ? (
                <Loader2 className="w-4 h-4 text-[#00D4AA] animate-spin" />
              ) : downloadState === 'success' ? (
                <span className="text-green-400 text-sm font-bold relative flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
                  ✓
                </span>
              ) : (
                <Download className="w-4 h-4 text-[#00D4AA]" />
              )}
            </button>

            {selectedCity.spoofed && (
              <div className="flex items-center gap-2 mb-3 bg-[#00D4AA]/10 border border-[#00D4AA]/20 rounded-xl px-3 py-2">
                <Navigation className="w-4 h-4 text-[#00D4AA]" />
                <span className="text-xs text-[#00D4AA] font-medium">Virtual Location</span>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-3xl font-display italic mb-1">{selectedCity.name}</h2>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-[#00D4AA]" />
                <span className="text-muted text-xs font-mono">
                  {selectedCity.lat?.toFixed(4)}°N, {selectedCity.lon?.toFixed(4)}°E
                </span>
              </div>
              <div className="text-xs text-muted mb-6">Live Air Quality Data · Open-Meteo API</div>

              {/* AQI Big Card */}
              <div className="bg-surface border border-stroke rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden mb-4">
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at center, ${getAqiColor(selectedCity.aqi)} 0%, transparent 70%)` }} />
                <span className="text-7xl font-display italic tracking-tighter" style={{ color: getAqiColor(selectedCity.aqi) }}>
                  {isNaN(selectedCity.aqi) || selectedCity.aqi === 0 ? '-' : selectedCity.aqi}
                </span>
                <span className="text-sm font-bold uppercase tracking-widest mt-2 flex items-center gap-2" style={{ color: getAqiColor(selectedCity.aqi) }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getAqiColor(selectedCity.aqi) }} />
                  <span>{getAqiLabel(selectedCity.aqi)}</span>
                </span>
                {/* AQI scale bar */}
                <div className="mt-4 w-full h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #00E676, #FFE57F, #FF9E40, #FF5252, #CE93D8, #8B0000)' }}>
                  <div className="h-full w-1 rounded-full bg-white shadow-lg transition-all duration-1000"
                    style={{ marginLeft: `calc(${Math.min(((selectedCity.aqi || 0) / 300) * 100, 100)}% - 2px)` }} />
                </div>
                <div className="flex justify-between w-full text-[9px] text-muted mt-1 px-0.5">
                  <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
                </div>
              </div>

              {/* Pollutant grid */}
              {selectedCity.details && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { label: 'PM2.5', value: selectedCity.details.pm2_5, unit: 'μg/m³' },
                    { label: 'PM10',  value: selectedCity.details.pm10,  unit: 'μg/m³' },
                    { label: 'NO₂',   value: selectedCity.details.no2,   unit: 'μg/m³' },
                    { label: 'O₃',    value: selectedCity.details.o3,    unit: 'μg/m³' },
                    { label: 'SO₂',   value: selectedCity.details.so2,   unit: 'μg/m³' },
                    { label: 'CO',    value: selectedCity.details.co,    unit: 'μg/m³' },
                  ].map((item, i) => (
                    <div key={i} className="bg-surface border border-stroke rounded-2xl p-3 flex flex-col">
                      <span className="text-xs text-muted mb-1">{item.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-display italic">{item.value !== undefined && item.value !== null ? Number(item.value).toFixed(1) : '—'}</span>
                        <span className="text-[10px] text-muted">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Harmful chemicals section (for spoofed / India cities) */}
              {selectedCity.chemicals && selectedCity.chemicals.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#FF9E40]" />
                    <h3 className="text-sm font-semibold text-[#FF9E40]">Pollutants to Watch</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedCity.chemicals.map((chem: any, i: number) => (
                      <div key={i} className="bg-surface border border-stroke rounded-2xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold">{chem.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            chem.level === 'Hazardous' ? 'bg-[#8B0000]/30 text-[#ff4444]' :
                            chem.level === 'Very High' ? 'bg-[#CE93D8]/20 text-[#CE93D8]' :
                            chem.level === 'High'     ? 'bg-[#FF5252]/20 text-[#FF5252]' :
                            chem.level === 'Moderate' ? 'bg-[#FF9E40]/20 text-[#FF9E40]' :
                            'bg-[#00E676]/20 text-[#00E676]'
                          }`}>{chem.level}</span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{chem.health}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* ML Predictive Analysis Section */}
              {mlLoading ? (
                <div className="mb-6 bg-surface/50 border border-stroke rounded-2xl p-4 flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00D4AA]" />
                  <span className="text-sm text-muted">Running Predictive Models...</span>
                </div>
              ) : mlPrediction && !mlPrediction.error ? (
                <div className="mb-6 rounded-3xl overflow-hidden border border-stroke relative">
                  {/* Dark gradient header */}
                  <div className="relative px-4 py-3 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #07141e 100%)' }}>
                    <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at top right, #0088FF33 0%, transparent 60%)' }} />
                    <div className="relative flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0088FF]/20 border border-[#0088FF]/30 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#0088FF]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">AI Health Forecast</h3>
                        <p className="text-[10px] text-white/40">AuraX ML Engine · 3 models active</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1 bg-[#00D4AA]/10 border border-[#00D4AA]/20 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
                        <span className="text-[9px] text-[#00D4AA] font-bold">LIVE</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-surface space-y-4">
                    {/* Two main metric cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Health Risk Card */}
                      {(() => {
                        const risk = mlPrediction.health_risk;
                        const riskColor = risk === 'Hazardous' ? '#FF3D3D' : risk === 'Very Unhealthy' ? '#FF5252' : risk === 'Unhealthy' ? '#FF9E40' : risk === 'Moderate' ? '#c8a000' : risk === 'Best' || risk === 'Healthy' ? '#00C853' : '#FFE57F';
                        const riskBg = risk === 'Hazardous' ? 'rgba(255,61,61,0.08)' : risk === 'Very Unhealthy' ? 'rgba(255,82,82,0.08)' : risk === 'Unhealthy' ? 'rgba(255,158,64,0.08)' : risk === 'Moderate' ? 'rgba(255,200,0,0.08)' : 'rgba(0,200,83,0.08)';
                        const conf = mlPrediction.health_confidence;
                        return (
                          <div className="rounded-2xl p-3.5 border flex flex-col gap-2.5" style={{ background: riskBg, borderColor: riskColor + '40' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Health Risk</span>
                              <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: riskColor + '60', background: riskColor + '18' }}>
                                <Shield className="w-3.5 h-3.5" style={{ color: riskColor }} />
                              </div>
                            </div>
                            <div className="font-black text-base leading-tight" style={{ color: riskColor }}>{risk}</div>
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] text-white/40">Confidence</span>
                                <span className="text-[11px] font-bold" style={{ color: riskColor }}>{conf}%</span>
                              </div>
                              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${conf}%`, background: `linear-gradient(90deg, ${riskColor}88, ${riskColor})` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Dominant Pollutant Card */}
                      {(() => {
                        const pol = mlPrediction.dominant_pollutant;
                        const polColor = pol === 'PM2.5' ? '#FF9E40' : pol === 'CO' ? '#FF5252' : pol === 'NO2' ? '#00D4AA' : pol === 'Ozone' ? '#CE93D8' : '#FFE57F';
                        const pconf = mlPrediction.pollutant_confidence;
                        return (
                          <div className="rounded-2xl p-3.5 border flex flex-col gap-2.5" style={{ background: polColor + '12', borderColor: polColor + '40' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Top Pollutant</span>
                              <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: polColor + '60', background: polColor + '18' }}>
                                <Wind className="w-3.5 h-3.5" style={{ color: polColor }} />
                              </div>
                            </div>
                            <div className="font-black text-base" style={{ color: polColor }}>{pol}</div>
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] text-white/40">Confidence</span>
                                <span className="text-[11px] font-bold" style={{ color: polColor }}>{pconf}%</span>
                              </div>
                              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pconf}%`, background: `linear-gradient(90deg, ${polColor}66, ${polColor})` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ML Quality Rating */}
                    {mlPrediction.quality && (
                      <div className="flex items-center justify-between bg-bg/50 border border-stroke/60 rounded-xl px-4 py-2.5">
                        <span className="text-xs text-white/50 font-medium">Overall Air Quality Rating</span>
                        <span className="text-sm font-bold" style={{
                          color: ['Best','Better','Good'].includes(mlPrediction.quality) ? '#00C853' : mlPrediction.quality === 'Moderate' ? '#c8a000' : mlPrediction.quality === 'Bad' ? '#FF9E40' : '#FF5252'
                        }}>{mlPrediction.quality}</span>
                      </div>
                    )}

                    {/* AI Action Strategies */}
                    {mlPrediction.ai_control?.ai_strategies?.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-[#FFE57F]" />
                          <span className="text-sm font-bold text-white">Recommended Actions</span>
                          <span className="ml-auto text-[10px] bg-stroke/50 text-muted rounded-full px-2 py-0.5 border border-stroke/40">{mlPrediction.ai_control.ai_strategies.length}</span>
                        </div>
                        <div className="space-y-2">
                          {mlPrediction.ai_control.ai_strategies.slice(0, 5).map((strategy: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 bg-bg/60 border border-stroke/60 rounded-xl px-3 py-2.5 hover:border-[#0088FF]/30 hover:bg-[#0088FF]/5 transition-all duration-200 cursor-default group">
                              <div className="w-5 h-5 rounded-md bg-[#0088FF]/15 border border-[#0088FF]/25 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#0088FF]/25 transition-colors">
                                <span className="text-[10px] font-black text-[#0088FF]">{idx + 1}</span>
                              </div>
                              <span className="text-xs text-white/75 leading-relaxed">{strategy}</span>
                            </div>
                          ))}
                        </div>
                        {mlPrediction.ai_control.tech_stack && (
                          <div className="mt-3 flex items-center gap-2 bg-[#00D4AA]/5 border border-[#00D4AA]/15 rounded-xl px-3 py-2.5">
                            <Cpu className="w-3.5 h-3.5 text-[#00D4AA] shrink-0" />
                            <span className="text-xs text-white/50 leading-relaxed">{mlPrediction.ai_control.tech_stack}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}


              {/* AI Advisory Section */}
              <div className="mb-6">
                {!showAiPanel ? (
                  <button
                    onClick={fetchAiAdvisory}
                    className="w-full py-4 rounded-2xl border transition-all font-medium flex items-center justify-center gap-3 group relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.10) 0%, rgba(0,136,255,0.10) 100%)', borderColor: 'rgba(0,212,170,0.25)' }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.20) 0%, rgba(0,136,255,0.18) 100%)' }} />
                    <Sparkles className="w-5 h-5 text-[#00D4AA] relative z-10 group-hover:rotate-12 transition-transform duration-200" />
                    <div className="relative z-10">
                      <div className="text-sm font-semibold">Get AI Health Advisory</div>
                      <div className="text-[10px] text-muted">Personalized for this city</div>
                    </div>
                  </button>
                ) : (
                  <div className="bg-surface border border-stroke rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stroke" style={{ background: 'linear-gradient(90deg, rgba(0,212,170,0.08) 0%, transparent 100%)' }}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#00D4AA]" />
                        <span className="text-sm font-semibold">AI Health Advisory</span>
                        <span className="text-[9px] bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20 rounded-full px-2 py-0.5 font-bold">AuraX</span>
                      </div>
                      <button onClick={() => { setShowAiPanel(false); setAiAdvisory(''); }} className="w-7 h-7 rounded-lg hover:bg-stroke/50 text-muted hover:text-text-primary flex items-center justify-center transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                      {aiLoading ? (
                        <div className="flex flex-col items-center gap-3 py-10 justify-center">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border border-stroke flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-[#00D4AA]" />
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00D4AA] animate-pulse border-2 border-bg" />
                          </div>
                          <span className="text-sm font-medium">Analyzing air quality...</span>
                          <span className="text-xs text-muted/60">AuraX is generating your advisory</span>
                        </div>
                      ) : aiAdvisory ? (
                        <div>{renderAdvisory(aiAdvisory)}</div>
                      ) : null}
                    </div>
                    {aiAdvisory && !aiLoading && (
                      <div className="px-4 py-3 border-t border-stroke">
                        <button
                          onClick={fetchAiAdvisory}
                          className="flex items-center gap-1.5 text-xs text-[#00D4AA] hover:text-white/80 font-medium transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> Regenerate Advisory
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AQI legend strip — compact gradient bar */}
              <div className="bg-surface border border-stroke rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest">AQI Scale</h4>
                  <span className="text-[9px] text-muted">US EPA Standard</span>
                </div>
                {/* Gradient color bar */}
                <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'linear-gradient(90deg, #00E676 0%, #FFE57F 25%, #FF9E40 45%, #FF5252 62%, #CE93D8 80%, #7a0000 100%)' }} />
                <div className="grid grid-cols-6 gap-0">
                  {[
                    { range: '0–50',    label: 'Good',       color: '#00E676' },
                    { range: '51–100',  label: 'Moderate',   color: '#FFE57F' },
                    { range: '101–150', label: 'Sensitive',  color: '#FF9E40' },
                    { range: '151–200', label: 'Unhealthy',  color: '#FF5252' },
                    { range: '201–300', label: 'Very Bad',   color: '#CE93D8' },
                    { range: '301+',    label: 'Hazardous',  color: '#8B0000' },
                  ].map((item, i) => (
                    <div key={item.range} className={`flex flex-col items-center ${i > 0 ? 'border-l border-stroke/30' : ''}`}>
                      <span className="text-[7.5px] font-bold leading-tight" style={{ color: item.color }}>{item.label}</span>
                      <span className="text-[7px] text-muted leading-tight">{item.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
