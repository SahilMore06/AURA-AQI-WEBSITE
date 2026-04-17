"""
Enhanced Global Air Quality Dataset Generator
──────────────────────────────────────────────
Generates a comprehensive dataset with:
  • 60+ real-world cities with latitude/longitude coordinates
  • AQI quality labels: Best / Better / Good / Moderate / Bad / Worse / Worst
  • Realistic per-pollutant distributions based on actual city profiles
  • City health classification & dominant pollutant identification
  • AI pollution control recommendation labels
"""
import pandas as pd
import numpy as np
import os
import json

np.random.seed(42)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── COMPREHENSIVE CITY DATABASE ──────────────────────────────────────────────
# Format: (City, Country, Continent, dominant_pollutant, base_aqi_range, population_millions, latitude, longitude)
CITIES = [
    # ═══ GOOD (AQI 0–50) — "Best" & "Better" quality ═════════════════════════
    ("Helsinki",       "Finland",       "Europe",        "NO2",    (5,   25),   0.7,   60.1699,  24.9384),
    ("Zurich",         "Switzerland",   "Europe",        "NO2",    (5,   28),   0.4,   47.3769,   8.5417),
    ("Stockholm",      "Sweden",        "Europe",        "NO2",    (8,   30),   1.0,   59.3293,  18.0686),
    ("Reykjavik",      "Iceland",       "Europe",        "NO2",    (3,   18),   0.1,   64.1466, -21.9426),
    ("Wellington",     "New Zealand",   "Oceania",       "Ozone",  (5,   22),   0.4,  -41.2865, 174.7762),
    ("Hobart",         "Australia",     "Oceania",       "Ozone",  (5,   20),   0.2,  -42.8821, 147.3272),
    ("Bergen",         "Norway",        "Europe",        "NO2",    (6,   25),   0.3,   60.3913,   5.3221),
    ("Queenstown",     "New Zealand",   "Oceania",       "Ozone",  (3,   15),   0.05, -45.0312, 168.6626),
    ("Bern",           "Switzerland",   "Europe",        "NO2",    (8,   30),   0.1,   46.9480,   7.4474),
    ("Vancouver",      "Canada",        "North America", "Ozone",  (10,  35),   2.6,   49.2827,-123.1207),
    ("Copenhagen",     "Denmark",       "Europe",        "NO2",    (8,   35),   1.3,   55.6761,  12.5683),
    ("Sydney",         "Australia",     "Oceania",       "Ozone",  (10,  40),   5.3,  -33.8688, 151.2093),
    ("Honolulu",       "USA",           "North America", "Ozone",  (8,   30),   1.0,   21.3069,-157.8583),
    ("Edmonton",       "Canada",        "North America", "NO2",    (10,  40),   1.4,   53.5461,-113.4938),

    # ═══ MODERATE (AQI 51–100) — "Good" quality ══════════════════════════════
    ("Berlin",         "Germany",       "Europe",        "NO2",    (30,  65),   3.6,   52.5200,  13.4050),
    ("Tokyo",          "Japan",         "Asia",          "PM2.5",  (35,  70),  14.0,   35.6762, 139.6503),
    ("London",         "UK",            "Europe",        "NO2",    (35,  75),   9.0,   51.5074,  -0.1278),
    ("New York",       "USA",           "North America", "NO2",    (40,  80),   8.3,   40.7128, -74.0060),
    ("Paris",          "France",        "Europe",        "NO2",    (35,  78),  11.0,   48.8566,   2.3522),
    ("Los Angeles",    "USA",           "North America", "Ozone",  (40,  90),  13.0,   34.0522,-118.2437),
    ("São Paulo",      "Brazil",        "South America", "Ozone",  (40,  95),  22.0,  -23.5505, -46.6333),
    ("Madrid",         "Spain",         "Europe",        "NO2",    (35,  75),   6.7,   40.4168,  -3.7038),
    ("Rome",           "Italy",         "Europe",        "NO2",    (40,  80),   4.3,   41.9028,  12.4964),
    ("Singapore",      "Singapore",     "Asia",          "PM2.5",  (30,  75),   5.9,    1.3521, 103.8198),
    ("Seoul",          "South Korea",   "Asia",          "PM2.5",  (40,  90),  10.0,   37.5665, 126.9780),
    ("Bangkok",        "Thailand",      "Asia",          "PM2.5",  (38,  85),  10.5,   13.7563, 100.5018),
    ("Nairobi",        "Kenya",         "Africa",        "PM2.5",  (35,  80),   4.7,   -1.2921,  36.8219),
    ("Buenos Aires",   "Argentina",     "South America", "CO",     (30,  75),  15.4,  -34.6037, -58.3816),

    # ═══ UNHEALTHY FOR SENSITIVE (AQI 101–150) — "Moderate" quality ═══════════
    ("Mexico City",    "Mexico",        "North America", "Ozone",  (70, 145),  21.8,   19.4326, -99.1332),
    ("Mumbai",         "India",         "Asia",          "PM2.5",  (80, 145),  20.7,   19.0760,  72.8777),
    ("Shanghai",       "China",         "Asia",          "PM2.5",  (75, 140),  28.5,   31.2304, 121.4737),
    ("Jakarta",        "Indonesia",     "Asia",          "PM2.5",  (85, 150),  10.6,   -6.2088, 106.8456),
    ("Kolkata",        "India",         "Asia",          "PM2.5",  (90, 150),  14.9,   22.5726,  88.3639),
    ("Chengdu",        "China",         "Asia",          "PM2.5",  (75, 140),  16.3,   30.5728, 104.0668),
    ("Hanoi",          "Vietnam",       "Asia",          "PM2.5",  (80, 145),   8.1,   21.0278, 105.8342),
    ("Lima",           "Peru",          "South America", "CO",     (70, 135),  10.7,  -12.0464, -77.0428),
    ("Istanbul",       "Turkey",        "Europe",        "PM2.5",  (65, 130),  15.5,   41.0082,  28.9784),
    ("Johannesburg",   "South Africa",  "Africa",        "PM2.5",  (65, 130),   5.6,  -26.2041,  28.0473),

    # ═══ UNHEALTHY (AQI 151–200) — "Bad" quality ════════════════════════════
    ("Beijing",        "China",         "Asia",          "PM2.5",  (120, 200), 21.5,   39.9042, 116.4074),
    ("Lagos",          "Nigeria",       "Africa",        "CO",     (130, 200), 15.4,    6.5244,   3.3792),
    ("Cairo",          "Egypt",         "Africa",        "PM2.5",  (130, 195), 20.9,   30.0444,  31.2357),
    ("Karachi",        "Pakistan",      "Asia",          "PM2.5",  (140, 200), 16.1,   24.8607,  67.0011),
    ("Wuhan",          "China",         "Asia",          "PM2.5",  (120, 195), 11.1,   30.5928, 114.3055),
    ("Ulaanbaatar",    "Mongolia",      "Asia",          "PM2.5",  (130, 200),  1.5,   47.8864, 106.9057),
    ("Kathmandu",      "Nepal",         "Asia",          "PM2.5",  (125, 195),  1.4,   27.7172,  85.3240),
    ("Accra",          "Ghana",         "Africa",        "CO",     (120, 185),  4.0,    5.6037,  -0.1870),
    ("Ho Chi Minh",    "Vietnam",       "Asia",          "PM2.5",  (115, 190),  9.0,   10.8231, 106.6297),

    # ═══ VERY UNHEALTHY (AQI 201–300) — "Worse" quality ═════════════════════
    ("Delhi",          "India",         "Asia",          "PM2.5",  (180, 300), 32.0,   28.7041,  77.1025),
    ("Dhaka",          "Bangladesh",    "Asia",          "PM2.5",  (180, 290), 22.0,   23.8103,  90.4125),
    ("Lahore",         "Pakistan",      "Asia",          "PM2.5",  (190, 300), 13.5,   31.5204,  74.3587),
    ("Faisalabad",     "Pakistan",      "Asia",          "PM2.5",  (185, 295),  3.2,   31.4504,  73.1350),
    ("Peshawar",       "Pakistan",      "Asia",          "PM2.5",  (180, 290),  2.0,   34.0151,  71.5249),
    ("Lucknow",        "India",         "Asia",          "PM2.5",  (175, 285),  3.4,   26.8467,  80.9462),
    ("Kanpur",         "India",         "Asia",          "PM2.5",  (180, 295),  3.1,   26.4499,  80.3319),
    ("Patna",          "India",         "Asia",          "PM2.5",  (190, 300),  2.5,   25.6093,  85.1376),

    # ═══ HAZARDOUS (AQI 301–500) — "Worst" quality ══════════════════════════
    ("Ghaziabad",      "India",         "Asia",          "PM2.5",  (280, 480),  2.4,   28.6692,  77.4538),
    ("Noida",          "India",         "Asia",          "PM2.5",  (270, 460),  0.6,   28.5355,  77.3910),
    ("Bhiwadi",        "India",         "Asia",          "PM2.5",  (300, 500),  0.2,   28.2096,  76.8610),
    ("Hotan",          "China",         "Asia",          "PM2.5",  (290, 490),  0.4,   37.1100,  79.9300),
    ("Muzaffarnagar",  "India",         "Asia",          "PM2.5",  (300, 500),  0.5,   29.4727,  77.7085),
]

# ── AI POLLUTION CONTROL RECOMMENDATIONS DATABASE ───────────────────────────
CONTROL_RECOMMENDATIONS = {
    "PM2.5": {
        "source": "Vehicle exhausts, industrial emissions, crop burning, construction dust",
        "strategies": [
            "Deploy AI-optimized traffic management to reduce congestion hotspots",
            "Install smart air purification towers at high-density intersections",
            "Use satellite + ML to detect and prevent crop burning events in real-time",
            "Implement IoT dust suppression systems on construction sites",
            "AI-powered emission monitoring for industrial zones with auto-alerts",
            "Deploy predictive models to issue early warnings 48hrs before PM2.5 spikes",
        ],
        "tech": "Random Forest + LSTM forecasting, satellite imagery CNNs, IoT sensor networks",
    },
    "NO2": {
        "source": "Vehicle engines (diesel), power plants, industrial boilers",
        "strategies": [
            "AI traffic signal optimization to minimize idling and stop-go emissions",
            "ML-based fleet electrification planning for public transport routes",
            "Smart congestion pricing using real-time pollution sensors",
            "Predictive maintenance alerts for industrial emission control equipment",
            "AI route optimization for delivery vehicles to cut diesel NOx output",
            "Deploy neural network models to identify illegal emission vehicles",
        ],
        "tech": "Reinforcement learning for traffic, computer vision for enforcement, time-series forecasting",
    },
    "Ozone": {
        "source": "Secondary pollutant formed from NOx + VOCs under sunlight",
        "strategies": [
            "AI-based VOC emission tracking from industrial and commercial sources",
            "ML models to predict ozone formation windows and issue advisories",
            "Smart scheduling of industrial activities to avoid peak sunlight hours",
            "Deploy anomaly detection on VOC sensors for early leak identification",
            "AI urban planning tools to optimize green cover for ozone absorption",
            "Predictive models correlating weather + traffic + ozone for proactive response",
        ],
        "tech": "Chemical transport models + ML, anomaly detection, weather-coupled forecasting",
    },
    "CO": {
        "source": "Incomplete combustion — vehicles, generators, cooking stoves, wildfires",
        "strategies": [
            "AI-powered wildfire detection using satellite and drone imagery",
            "ML-optimized clean cooking stove distribution in underserved areas",
            "Smart grid management to reduce reliance on diesel generators",
            "Real-time CO hotspot mapping with IoT sensor fusion and edge AI",
            "Predictive models for generator usage spikes during power outages",
            "AI-based ventilation management for enclosed urban corridors",
        ],
        "tech": "YOLOv8 fire detection, IoT edge computing, smart grid optimization",
    },
    "PM10": {
        "source": "Road dust, construction, mining, agricultural activities, natural dust storms",
        "strategies": [
            "AI-controlled road sweeping schedules based on dust prediction models",
            "ML dust storm early warning using satellite and weather data fusion",
            "Smart sprinkler systems triggered by real-time PM10 sensor readings",
            "AI monitoring of mining and quarrying operations for compliance",
            "Drone-based dust mapping for construction site management",
            "Predictive models for agricultural dust events during harvest season",
        ],
        "tech": "Satellite dust tracking, drone surveying, IoT sprinkler automation",
    },
    "SO2": {
        "source": "Coal-burning power plants, oil refineries, smelting, volcanic activity",
        "strategies": [
            "AI optimization of flue gas desulfurization (FGD) systems",
            "ML-based coal quality prediction to minimize sulfur content selection",
            "Real-time refinery emission monitoring with AI anomaly detection",
            "Predictive maintenance for scrubber systems to prevent SO2 leaks",
            "AI energy mix optimization to phase out high-sulfur fuel sources",
            "Smart cap-and-trade systems using ML for emission credit pricing",
        ],
        "tech": "Process optimization AI, predictive maintenance, energy transition models",
    },
}

# ── AQI CATEGORY & QUALITY LABELING ─────────────────────────────────────────
def aqi_to_category(aqi):
    if aqi <= 50:  return "Good"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy for Sensitive Groups"
    if aqi <= 200: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

def aqi_to_health(aqi):
    if aqi <= 25:  return "Best"
    if aqi <= 50:  return "Healthy"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

def aqi_to_quality(aqi):
    """Human-friendly quality label: Best → Worst."""
    if aqi <= 25:  return "Best"
    if aqi <= 50:  return "Better"
    if aqi <= 100: return "Good"
    if aqi <= 150: return "Moderate"
    if aqi <= 200: return "Bad"
    if aqi <= 300: return "Worse"
    return "Worst"

def get_dominant(co, ozone, no2, pm25, pm10, so2):
    pollutants = {"CO": co, "Ozone": ozone, "NO2": no2, "PM2.5": pm25, "PM10": pm10, "SO2": so2}
    return max(pollutants, key=pollutants.get)

# ── GENERATE DATASET ────────────────────────────────────────────────────────
print("📊 Generating enhanced global AQI dataset...")
rows = []
N_PER_CITY = 800  # rows per city — total ~48,000

for city, country, continent, bias_pollutant, (aq_lo, aq_hi), population, lat, lng in CITIES:
    for _ in range(N_PER_CITY):
        aqi = np.random.randint(max(1, aq_lo - 20), min(500, aq_hi + 15))
        aqi = max(1, min(500, aqi))

        # Generate pollutant AQI sub-indices based on city's dominant pollutant
        base = max(1, aqi - np.random.randint(0, 12))
        noise = lambda: max(0, int(np.random.normal(0, 6)))

        if bias_pollutant == "PM2.5":
            pm25 = base + noise()
            pm10 = int(pm25 * np.random.uniform(0.6, 0.9))
            ozone = max(0, int(aqi * np.random.uniform(0.1, 0.5)))
            no2   = max(0, int(aqi * np.random.uniform(0.1, 0.4)))
            co    = max(0, int(aqi * np.random.uniform(0.05, 0.3)))
            so2   = max(0, int(aqi * np.random.uniform(0.02, 0.15)))
        elif bias_pollutant == "Ozone":
            ozone = base + noise()
            pm25  = max(0, int(aqi * np.random.uniform(0.2, 0.6)))
            pm10  = max(0, int(pm25 * np.random.uniform(0.5, 0.8)))
            no2   = max(0, int(aqi * np.random.uniform(0.1, 0.3)))
            co    = max(0, int(aqi * np.random.uniform(0.05, 0.2)))
            so2   = max(0, int(aqi * np.random.uniform(0.02, 0.1)))
        elif bias_pollutant == "NO2":
            no2   = base + noise()
            pm25  = max(0, int(aqi * np.random.uniform(0.2, 0.5)))
            pm10  = max(0, int(pm25 * np.random.uniform(0.5, 0.8)))
            ozone = max(0, int(aqi * np.random.uniform(0.1, 0.4)))
            co    = max(0, int(aqi * np.random.uniform(0.05, 0.25)))
            so2   = max(0, int(aqi * np.random.uniform(0.02, 0.1)))
        else:  # CO
            co    = base + noise()
            pm25  = max(0, int(aqi * np.random.uniform(0.3, 0.7)))
            pm10  = max(0, int(pm25 * np.random.uniform(0.5, 0.8)))
            ozone = max(0, int(aqi * np.random.uniform(0.1, 0.3)))
            no2   = max(0, int(aqi * np.random.uniform(0.1, 0.3)))
            so2   = max(0, int(aqi * np.random.uniform(0.02, 0.1)))

        category = aqi_to_category(aqi)
        health = aqi_to_health(aqi)
        quality = aqi_to_quality(aqi)
        dominant = get_dominant(co, ozone, no2, pm25, pm10, so2)

        # Get AI control recommendation for the dominant pollutant
        ctrl = CONTROL_RECOMMENDATIONS.get(dominant, CONTROL_RECOMMENDATIONS["PM2.5"])
        rec_idx = np.random.randint(0, len(ctrl["strategies"]))

        rows.append({
            "City": city,
            "Country": country,
            "Continent": continent,
            "Latitude": lat,
            "Longitude": lng,
            "Population_Millions": population,
            "AQI Value": aqi,
            "AQI Category": category,
            "AQI Quality": quality,
            "Health Risk": health,
            "CO AQI Value": co,
            "CO AQI Category": aqi_to_category(co),
            "Ozone AQI Value": ozone,
            "Ozone AQI Category": aqi_to_category(ozone),
            "NO2 AQI Value": no2,
            "NO2 AQI Category": aqi_to_category(no2),
            "PM2.5 AQI Value": pm25,
            "PM2.5 AQI Category": aqi_to_category(pm25),
            "PM10 AQI Value": pm10,
            "PM10 AQI Category": aqi_to_category(pm10),
            "SO2 AQI Value": so2,
            "SO2 AQI Category": aqi_to_category(so2),
            "Dominant Pollutant": dominant,
            "Pollution Source": ctrl["source"],
            "AI Control Strategy": ctrl["strategies"][rec_idx],
            "AI Tech Stack": ctrl["tech"],
        })

df = pd.DataFrame(rows)

# ── SAVE MAIN DATASET ───────────────────────────────────────────────────────
csv_path = os.path.join(BASE_DIR, "global_air_pollution_dataset.csv")
df.to_csv(csv_path, index=False)
print(f"✅ Main dataset: {len(df):,} rows → {csv_path}")

# ── ALSO SAVE CITY HEALTH DATASET (for health model) ────────────────────────
health_csv_path = os.path.join(BASE_DIR, "city_health_aqi_dataset.csv")
df.to_csv(health_csv_path, index=False)
print(f"✅ Health dataset: {len(df):,} rows → {health_csv_path}")

# ── GENERATE CITY SUMMARY ───────────────────────────────────────────────────
city_summary = []
for (city, country), g in df.groupby(["City", "Country"]):
    avg_aqi = int(g["AQI Value"].mean())
    row = g.iloc[0]

    # Per-pollutant averages
    pol_avgs = {
        "CO":    round(g["CO AQI Value"].mean(), 1),
        "Ozone": round(g["Ozone AQI Value"].mean(), 1),
        "NO2":   round(g["NO2 AQI Value"].mean(), 1),
        "PM2.5": round(g["PM2.5 AQI Value"].mean(), 1),
        "PM10":  round(g["PM10 AQI Value"].mean(), 1),
        "SO2":   round(g["SO2 AQI Value"].mean(), 1),
    }

    dominant = max(pol_avgs, key=pol_avgs.get)
    ctrl = CONTROL_RECOMMENDATIONS.get(dominant, CONTROL_RECOMMENDATIONS["PM2.5"])

    city_summary.append({
        "city": city,
        "country": country,
        "continent": row["Continent"],
        "latitude": float(row["Latitude"]),
        "longitude": float(row["Longitude"]),
        "population_millions": float(row["Population_Millions"]),
        "avg_aqi": avg_aqi,
        "aqi_category": aqi_to_category(avg_aqi),
        "aqi_quality": aqi_to_quality(avg_aqi),
        "health_risk": aqi_to_health(avg_aqi),
        "dominant_pollutant": dominant,
        "pollutant_averages": pol_avgs,
        "pollution_sources": ctrl["source"],
        "ai_control_strategies": ctrl["strategies"][:3],
        "ai_tech_stack": ctrl["tech"],
    })

city_summary.sort(key=lambda x: x["avg_aqi"])

# ── CATEGORY-WISE CITY GROUPS ───────────────────────────────────────────────
category_groups = {}
for c in city_summary:
    cat = c["aqi_category"]
    if cat not in category_groups:
        category_groups[cat] = []
    category_groups[cat].append({
        "city": c["city"],
        "country": c["country"],
        "avg_aqi": c["avg_aqi"],
        "aqi_quality": c["aqi_quality"],
        "latitude": c["latitude"],
        "longitude": c["longitude"],
        "dominant_pollutant": c["dominant_pollutant"],
    })

# ── QUALITY-WISE GROUPS ─────────────────────────────────────────────────────
quality_groups = {}
for c in city_summary:
    q = c["aqi_quality"]
    if q not in quality_groups:
        quality_groups[q] = []
    quality_groups[q].append({
        "city": c["city"],
        "country": c["country"],
        "avg_aqi": c["avg_aqi"],
        "latitude": c["latitude"],
        "longitude": c["longitude"],
        "dominant_pollutant": c["dominant_pollutant"],
    })

# ── POLLUTANT HOTSPOT ANALYSIS ──────────────────────────────────────────────
pollutant_hotspots = {}
for pol in ["PM2.5", "NO2", "Ozone", "CO", "PM10", "SO2"]:
    hotspot_cities = sorted(city_summary, key=lambda x: x["pollutant_averages"][pol], reverse=True)[:10]
    ctrl = CONTROL_RECOMMENDATIONS[pol]
    pollutant_hotspots[pol] = {
        "top_cities": [{"city": c["city"], "country": c["country"], "avg_value": c["pollutant_averages"][pol],
                        "latitude": c["latitude"], "longitude": c["longitude"]} for c in hotspot_cities],
        "source": ctrl["source"],
        "ai_strategies": ctrl["strategies"],
        "tech_stack": ctrl["tech"],
    }

# ── SAVE COMPREHENSIVE META ─────────────────────────────────────────────────
meta = {
    "dataset_info": {
        "total_rows": len(df),
        "total_cities": len(CITIES),
        "continents": sorted(df["Continent"].unique().tolist()),
        "features": ["CO AQI Value", "Ozone AQI Value", "NO2 AQI Value", "PM2.5 AQI Value", "PM10 AQI Value", "SO2 AQI Value"],
        "aqi_categories": ["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"],
        "quality_labels": ["Best", "Better", "Good", "Moderate", "Bad", "Worse", "Worst"],
        "health_classes": ["Best", "Healthy", "Moderate", "Unhealthy", "Very Unhealthy", "Hazardous"],
    },
    "category_distribution": df["AQI Category"].value_counts().to_dict(),
    "quality_distribution": df["AQI Quality"].value_counts().to_dict(),
    "city_rankings": city_summary,
    "category_wise_cities": category_groups,
    "quality_wise_cities": quality_groups,
    "pollutant_hotspots": pollutant_hotspots,
    "ai_control_database": CONTROL_RECOMMENDATIONS,
}

meta_path = os.path.join(BASE_DIR, "dataset_meta.json")
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2, ensure_ascii=False)
print(f"✅ Dataset meta: {meta_path}")

# ── PRINT SUMMARY ───────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"📈 AQI Category Distribution:")
print(df["AQI Category"].value_counts().to_string())

print(f"\n⭐ AQI Quality Distribution:")
print(df["AQI Quality"].value_counts().to_string())

print(f"\n🧪 Dominant Pollutant Distribution:")
print(df["Dominant Pollutant"].value_counts().to_string())

print(f"\n🏆 Top 5 BEST Quality Cities:")
for c in city_summary[:5]:
    print(f"   ✅ {c['city']}, {c['country']} ({c['latitude']:.2f}, {c['longitude']:.2f}): AQI {c['avg_aqi']} — Quality: {c['aqi_quality']}")

print(f"\n⚠️  Top 5 WORST Quality Cities:")
for c in city_summary[-5:]:
    print(f"   🔴 {c['city']}, {c['country']} ({c['latitude']:.2f}, {c['longitude']:.2f}): AQI {c['avg_aqi']} — Quality: {c['aqi_quality']}")

print(f"\n🌍 Cities by Quality:")
for q in ["Best", "Better", "Good", "Moderate", "Bad", "Worse", "Worst"]:
    cities = quality_groups.get(q, [])
    print(f"   {q}: {len(cities)} cities")

print(f"\n🎉 Done! Enhanced dataset generated with {len(CITIES)} cities and {len(df):,} total records.")
