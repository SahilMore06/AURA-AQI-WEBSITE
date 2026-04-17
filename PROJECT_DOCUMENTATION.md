# AURA - Complete Project Documentation

## 📋 Project Summary

**AURA** (Air Quality Real-time Analytics) is a **full-stack Air Quality Monitoring and Prediction Platform** designed to provide real-time air quality data, health risk assessments, and AI-powered pollutant analysis across global cities. It combines real-time data from open APIs with advanced machine learning models to deliver actionable insights about air quality and its health impacts.

---

## 🎯 Project Purpose

The platform enables users to:
- Monitor real-time air quality metrics (AQI, PM2.5, PM10, NO2, Ozone, CO, SO2)
- Get health risk assessments based on air quality
- Identify dominant pollutants in their location
- View global air quality trends and analytics
- Receive alerts when air quality becomes hazardous
- Access personalized settings and preferences

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│         FRONTEND (React + TypeScript)        │
│  • Landing, Dashboard, Maps, Analytics      │
│  • Real-time Updates via Open-Meteo API     │
│  • Global Globe Visualization               │
│  • Charts & Data Visualization (Recharts)   │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼────────┐  ┌────▼─────────┐
   │  Supabase  │  │  ML Backend   │
   │  Database  │  │  (Python/    │
   │  & Auth    │  │   Flask)      │
   └────────────┘  └───┬──────────┘
                       │
                  ┌────▼────────────────┐
                  │  3 ML Models         │
                  │  • AQI Category      │
                  │  • Health Risk       │
                  │  • Pollutant ID      │
                  └─────────────────────┘
```

---

## 📦 Tech Stack

### **Frontend** (`frontend/`)
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS + CSS Animations
- **Routing:** React Router v7
- **State Management:** Zustand
- **Visualization:** 
  - Recharts (Charts & Graphs)
  - D3.js (Advanced Visualizations)
  - Leaflet (Interactive Maps)
  - GSAP (Animations)
- **UI Components:** Radix UI
- **Auth:** Supabase Authentication
- **APIs:** 
  - Open-Meteo Air Quality API (real-time data)
  - Google GenAI API (AI features)
  - Nominatim (Reverse Geocoding)

### **Backend**
- **Database:** Supabase (PostgreSQL-based)
- **ML Framework:** Python with scikit-learn
- **API Server:** Flask with CORS support
- **Model Type:** Random Forest Classifier (200 trees)

### **Deployment**
- Vite dev server on port 3000
- Flask ML API on port 5001

---

## 📊 Datasets

### **Primary Dataset: Global Air Pollution Dataset**

| Metric | Value |
|--------|-------|
| **Total Rows** | 48,000+ |
| **Cities Covered** | 60+ cities globally |
| **Continents** | 6 (Africa, Asia, Europe, North America, Oceania, South America) |
| **Data Points per Record** | 8-13 features |

### **Features Collected**
```
Air Quality Pollutants (AQI Values):
├── PM2.5 AQI Value (Primary - 39.94% importance)
├── PM10 AQI Value (21.97% importance)
├── CO AQI Value (14.7% importance)
├── NO2 AQI Value (7.8% importance)
├── Ozone AQI Value (7.99% importance)
└── SO2 AQI Value (7.6% importance)

Additional Metrics:
├── Temperature
├── Humidity
├── Wind Speed
└── Location Data (Latitude, Longitude)
```

### **AQI Categories Distribution**
- **Good:** 16,231 records (33.8%)
- **Moderate:** 9,722 records (20.3%)
- **Unhealthy for Sensitive Groups:** 7,091 records (14.8%)
- **Unhealthy:** 5,596 records (11.7%)
- **Very Unhealthy:** 5,572 records (11.6%)
- **Hazardous:** 3,788 records (7.9%)

### **Cities Covered**
60+ major cities across 6 continents including:
- Asia: Mumbai, Delhi, Beijing, Tokyo, Seoul, Bangkok
- Europe: London, Berlin, Paris, Rome, Amsterdam
- North America: New York, Los Angeles, Toronto, Mexico City
- Africa: Lagos, Cairo, Nairobi
- South America: São Paulo, Buenos Aires, Rio de Janeiro
- Oceania: Sydney, Melbourne, Auckland

---

## 🤖 Machine Learning Models

### **Model 1: AQI Category Classification**
- **Type:** Random Forest Classifier (200 estimators)
- **Target:** Predicts 6 AQI categories
- **Accuracy:** 95.22%
- **Input Features:** 6 pollutant AQI values
- **Output:** One of [Good, Moderate, Unhealthy, Very Unhealthy, Hazardous, Unhealthy for Sensitive Groups]
- **File:** `aqi_model.pkl`
- **Purpose:** Classifies overall air quality into standard AQI categories

### **Model 2: Health Risk Assessment**
- **Type:** Random Forest Classifier
- **Target:** Predicts health impact levels
- **Accuracy:** 93.46%
- **Classes:** [Best, Hazardous, Healthy, Moderate, Unhealthy, Very Unhealthy]
- **Purpose:** Assesses specific health implications of air quality
- **File:** `health_model.pkl`

### **Model 3: Dominant Pollutant Identification**
- **Type:** Random Forest Classifier
- **Target:** Identifies which pollutant is primary concern
- **Accuracy:** 99.96%
- **Classes:** [CO, NO2, Ozone, PM2.5]
- **Purpose:** Helps identify which pollutant to focus on for control measures
- **File:** `pollutant_model.pkl`

### **Feature Importance (AQI Model)**
```
PM2.5 AQI Value:    39.94% ⭐⭐⭐ (Most Important)
PM10 AQI Value:     21.97% ⭐⭐
CO AQI Value:       14.70% ⭐
NO2 AQI Value:       7.80%
Ozone AQI Value:     7.99%
SO2 AQI Value:       7.60%
```

**Insight:** PM2.5 (Fine Particulate Matter) is the dominant driver of AQI classification, accounting for ~40% of the model's decision-making, followed by PM10 (~22%).

---

## 📱 Frontend Pages/Features

| Page | Purpose |
|------|---------|
| **Landing** | Welcome page with project overview and value proposition |
| **Auth** | User login/signup with Supabase authentication |
| **Registration** | Extended user profile creation and preferences setup |
| **Dashboard** | Real-time AQI metrics, alerts, trends, health recommendations |
| **Map** | Interactive global map with air quality overlay and heatmap |
| **Analytics** | Detailed charts, historical trends, reports, comparisons |
| **Settings** | User preferences, theme selection, alert thresholds |

### **Dashboard Features**
- Real-time geolocation-based air quality detection
- 24-hour PM2.5 and AQI trend graph
- Health risk assessment with color-coded warnings
- Pollution breakdown showing pollutant-wise distribution
- AI control recommendations (based on dominant pollutant)
- Audio alerts when AQI > 150
- IEEE-formatted dashboard report generation
- Refresh button for manual updates
- Alert management system

### **Map Features**
- Interactive Leaflet map with zoom capabilities
- Air quality heatmap overlay
- Station markers showing current readings
- Click to view detailed station info
- Multiple map styles supported

### **Analytics Features**
- Historical AQI trends over time
- Comparative analysis between cities
- Pollutant correlation analysis (D3.js visualizations)
- Data export capabilities
- IEEE report generation

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### **Tables:**

#### 1. **profiles** (User Profiles)
```sql
- id (UUID, Primary Key) - References auth.users
- full_name (text) - User's full name
- avatar_url (text) - Profile picture URL
- theme (text, default: 'system') - UI theme preference
- alerts_enabled (boolean, default: false) - Alert preference
- aqi_threshold (integer, default: 100) - AQI alert threshold
- created_at (timestamp) - Account creation time
- updated_at (timestamp) - Last profile update
- Constraints: Row-Level Security enabled
```

#### 2. **stations** (Air Quality Monitoring Stations)
```sql
- id (UUID, Primary Key) - Unique station identifier
- name (text) - Station name (e.g., "Downtown Seattle")
- latitude (double precision) - GPS latitude
- longitude (double precision) - GPS longitude
- location_type (text: 'urban'/'suburban'/'rural') - Area classification
- status (text: 'active'/'inactive') - Operational status
- created_at (timestamp) - Station added date
- Constraints: Row-Level Security enabled
```

#### 3. **readings** (Air Quality Measurements)
```sql
- id (UUID, Primary Key) - Measurement ID
- station_id (UUID, FK) - References stations table
- aqi (integer) - Overall Air Quality Index
- pm25 (numeric) - PM2.5 concentration (µg/m³)
- pm10 (numeric) - PM10 concentration (µg/m³)
- o3 (numeric) - Ozone concentration (ppb)
- no2 (numeric) - Nitrogen Dioxide (ppb)
- so2 (numeric) - Sulfur Dioxide (ppb)
- co (numeric) - Carbon Monoxide (ppm)
- temperature (numeric) - Temperature (°C)
- humidity (numeric) - Humidity (%)
- timestamp (timestamp with timezone) - Measurement time
- Constraints: Row-Level Security enabled
```

### **Security Policies:**
```sql
profiles:
  - SELECT: Users can view their own profile
  - UPDATE: Users can update their own profile
  - INSERT: Users can create their own profile

stations:
  - SELECT: Anyone can view active stations
  - UPDATE/DELETE: Admin only

readings:
  - SELECT: Anyone can view all readings
  - INSERT/UPDATE: Only authorized data sources
```

### **Triggers:**
```sql
on_auth_user_created:
  - Auto-creates profile when new user signs up
  - Copies full_name and avatar_url from auth metadata
```

---

## 🔌 API Endpoints (ML Backend - Flask)

### **Base URL:** `http://localhost:5001`

```
GET  /                          # Health check & model info
POST /predict                   # AQI category prediction
POST /health-risk               # Health risk assessment
POST /pollutant                 # Dominant pollutant prediction
GET  /cities/quality            # Cities grouped by air quality
POST /batch-predict             # Bulk predictions
```

### **Example Requests:**

#### 1. AQI Prediction
```json
POST /predict
Request Body:
{
  "co": 35.2,
  "ozone": 82.1,
  "no2": 65.3,
  "pm25": 145.2,
  "pm10": 178.5,
  "so2": 28.4
}

Response:
{
  "prediction": "Unhealthy",
  "confidence": 96.47,
  "quality": "Bad",
  "health_risk": "Unhealthy"
}
```

#### 2. Health Risk Assessment
```json
POST /health-risk
Request Body:
{
  "co": 35.2,
  "ozone": 82.1,
  "no2": 65.3,
  "pm25": 145.2,
  "pm10": 178.5,
  "so2": 28.4
}

Response:
{
  "health_class": "Unhealthy",
  "risk_level": "High",
  "vulnerable_groups": ["Children", "Elderly", "Respiratory patients"]
}
```

#### 3. Dominant Pollutant
```json
POST /pollutant
Request Body:
{
  "co": 35.2,
  "ozone": 82.1,
  "no2": 65.3,
  "pm25": 145.2,
  "pm10": 178.5,
  "so2": 28.4
}

Response:
{
  "dominant_pollutant": "PM2.5",
  "concentration": 145.2,
  "health_effect": "Particulate Matter"
}
```

#### 4. Cities by Quality
```json
GET /cities/quality

Response:
{
  "quality_groups": {
    "Good": ["Sydney", "Vancouver", "Dublin"],
    "Moderate": ["London", "Berlin", "Amsterdam"],
    "Unhealthy": ["Delhi", "Beijing", "Cairo"],
    "Hazardous": ["Lagos", "Mumbai"]
  }
}
```

---

## 📂 Project Structure

```
AQI FINAL/
├── frontend/                  # React Web Application
│   ├── src/
│   │   ├── pages/            # React pages
│   │   │   ├── Landing.tsx      # Home page
│   │   │   ├── Auth.tsx         # Login/Signup
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── Map.tsx          # Interactive map
│   │   │   ├── Analytics.tsx    # Analytics page
│   │   │   ├── Settings.tsx     # User settings
│   │   │   └── Registration.tsx # User profile setup
│   │   ├── components/       # Reusable UI components
│   │   │   ├── AuraLogo.tsx     # SVG logo component
│   │   │   ├── VideoGenerator.tsx
│   │   │   ├── dock/IosDockBar.tsx
│   │   │   ├── globe/ScrollGlobe.tsx
│   │   │   └── ui/wireframe-dotted-globe.tsx
│   │   ├── store/            # Zustand state management
│   │   │   └── authStore.ts
│   │   ├── lib/              # Utilities and clients
│   │   │   ├── supabase.ts     # Supabase client
│   │   │   └── utils.ts        # Helper functions
│   │   ├── utils/            # Additional utilities
│   │   │   └── ieeeDashboardReport.ts
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   ├── index.css         # Global styles
│   │   └── types.d.ts        # TypeScript definitions
│   ├── supabase/             # Database configuration
│   │   ├── config.toml       # Supabase config
│   │   ├── functions/        # Edge functions
│   │   │   └── generate-advisory/index.ts
│   │   └── migrations/       # Database migrations
│   │       ├── 20240331000000_aura_schema.sql
│   │       └── 20260401000000_create_user_profiles.sql
│   ├── vite.config.ts        # Vite build configuration
│   ├── tsconfig.json         # TypeScript config
│   ├── package.json          # Dependencies
│   ├── index.html            # HTML template
│   └── metadata.json         # App metadata
│
├── backend/                   # Machine Learning Backend (Python/Flask)
│   ├── train_model.py        # AQI category model training script
│   ├── train_health_model.py # Health risk model training script
│   ├── predict.py            # Flask API server for ML predictions
│   ├── generate_dataset.py   # Dataset generation script
│   │
│   ├── aqi_model.pkl         # Trained AQI classifier (Binary)
│   ├── label_encoder.pkl     # AQI label encoder
│   ├── health_model.pkl      # Trained health risk classifier
│   ├── health_label_encoder.pkl  # Health label encoder
│   ├── pollutant_model.pkl   # Trained pollutant classifier
│   ├── pollutant_label_encoder.pkl # Pollutant label encoder
│   │
│   ├── model_meta.json       # AQI model metadata
│   ├── health_model_meta.json # Health model metadata
│   ├── dataset_meta.json     # Dataset information
│   │
│   ├── global_air_pollution_dataset.csv  # Main training dataset (48K rows)
│   ├── city_health_aqi_dataset.csv       # Alternate dataset
│   └── requirements.txt      # Python dependencies
│
├── PROJECT_DOCUMENTATION.md   # This documentation file
├── 🚀 START AURA.command     # One-click launcher (double-click in Finder)
└── README.md
```

---

## 🚀 How It Works

### **Real-time Data Flow:**

1. **User Opens Dashboard**
   - Frontend initializes and checks authentication status
   - If logged in or mock admin mode, proceed to dashboard

2. **Geolocation Detection**
   - Browser requests user's current location (with permission)
   - Falls back to default (Mumbai: 28.7041°N, 77.1025°E) if denied

3. **Real-time Data Fetch**
   - API call to Open-Meteo: Gets current AQI, PM2.5, PM10, etc.
   - Extracts 24-hour historical data for trend graph

4. **Reverse Geocoding**
   - Nominatim API converts lat/lon to city/state name

5. **ML Model Predictions**
   - Current pollutant values sent to Flask ML API
   - Models predict: AQI category, health risk, dominant pollutant

6. **UI Rendering**
   - Dashboard displays all metrics with color coding
   - Chart renders 24-hour trend
   - Health recommendations generated based on dominant pollutant

7. **Alert System**
   - If AQI ≥ 151, triggers:
     - Visual alert (border highlight)
     - Audio notification
     - Push notification (if enabled)

8. **User Actions**
   - Manual refresh button re-fetches data
   - Click map to view other stations
   - Navigate to Analytics for historical comparisons

### **AI Control Recommendations:**

Based on the dominant pollutant identified, the system suggests:

```
PM2.5 (Fine Particulate Matter):
├── Control Measure: Air Purifiers with HEPA filters
├── Activity: Avoid outdoor activities
├── Protection: N95/N99 masks for outdoor exposure
└── Indoor: Keep windows closed, use AC with recirculation

Ozone (O3):
├── Control Measure: Limited outdoor activities
├── Health: Limit vigorous exercise
├── Storage: Keep rescue inhalers nearby
└── Time: Avoid peak ozone times (2-10 PM)

NO2 (Nitrogen Dioxide):
├── Source: Vehicle emissions
├── Protection: Respiratory ventilation masks
├── Activity: Avoid high-traffic routes
└── Indoor: Ensure proper ventilation

CO (Carbon Monoxide):
├── Source: Incomplete combustion
├── Action: Seek fresh air immediately
├── Check: Ventilation systems, gas appliances
└── Installation: CO detectors recommended
```

---

## 📊 Machine Learning Pipeline

```
┌──────────────────────────┐
│   Raw CSV Data (48K)     │
│  • 60+ cities, 6 continents
│  • 6 features, 1 target
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Data Cleaning            │
│ • Remove null values     │
│ • Validate ranges        │
│ • Handle outliers        │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Feature Engineering      │
│ • Select key features    │
│ • Scale if needed        │
│ • Create interactions    │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Label Encoding           │
│ • Encode categorical     │
│   target variables       │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Train/Test Split         │
│ • 80% training           │
│ • 20% testing            │
│ • Stratified sampling    │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Random Forest Training   │
│ • 200 estimators         │
│ • Random state: 42       │
│ • n_jobs: -1 (parallel)  │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Model Evaluation         │
│ • Accuracy Score         │
│ • Classification Report  │
│ • Feature Importances    │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Model Serialization      │
│ • Save .pkl files        │
│ • Save encoders          │
│ • Generate metadata JSON │
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Flask API Deployment     │
│ • Load models in memory  │
│ • Expose prediction      │
│   endpoints              │
│ • Handle requests        │
└──────────────────────────┘
```

---

## 📊 Performance & Accuracy Metrics

| Model | Accuracy | Speed | Use Case |
|-------|----------|-------|----------|
| **AQI Category** | 95.22% | <50ms | Overall quality classification |
| **Health Risk** | 93.46% | <50ms | Health impact assessment |
| **Pollutant ID** | 99.96% | <30ms | Dominant pollutant detection |

### **Dataset Characteristics:**
- **Total Records:** 48,000+
- **Features:** 6 pollutant AQI values + location data
- **Geographic Spread:** 60+ cities across 6 continents
- **Class Balance:** Good (33.8%) → Hazardous (7.9%)
- **Missing Values:** <2% after cleaning

---

## 🔐 Security Features

### **Authentication & Authorization**
- JWT-based authentication via Supabase Auth
- Session management with auto-refresh tokens
- OAuth2 support for social logins
- Protected routes requiring authentication

### **Database Security**
- Row-Level Security (RLS) on all tables
- User data isolation and access control
- Encrypted sensitive information
- Automatic profile creation on signup

### **API Security**
- CORS policy configured for allowed origins
- Environment variables for sensitive keys
- No hardcoded credentials
- API rate limiting recommended

### **Data Privacy**
- User geolocation data stored locally
- Optional opt-in for data collection
- GDPR-compliant data handling
- User can delete account and data

---

## 🎨 UI/UX Design Highlights

### **Visual Design**
- **Color Palette:** Dark theme with cyan accents (#00D4AA)
- **Typography:** Modern sans-serif fonts
- **Icons:** Lucide React icons for consistency
- **Animations:** GSAP & Framer Motion smooth transitions

### **Responsive Layouts**
- **Mobile:** Bottom dock navigation, stacked cards
- **Tablet:** 2-column grid layouts
- **Desktop:** 3-4 column grids with sidebars

### **Interactive Elements**
- **Dashboard:** Real-time metric cards with animations
- **Maps:** Zoom, pan, popup markers
- **Charts:** Interactive tooltips, legend toggles
- **Alerts:** Sliding notifications with sound

### **Accessibility**
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast color schemes
- Alt text for images

---

## 📈 Project Statistics

| Metric | Value |
|--------|-------|
| **Frontend Code** | React + TypeScript (`frontend/`) |
| **Backend Code** | Python Flask API (`backend/`) |
| **Database Tables** | 3 tables (profiles, stations, readings) |
| **ML Models** | 3 trained classifiers |
| **API Endpoints** | 6+ endpoints |
| **Dependencies** | 30+ npm packages, 5+ Python packages |
| **Total Rows Data** | 48,000+ records |
| **Geographic Coverage** | 60+ cities, 6 continents |
| **Avg. Response Time** | <100ms |
| **Model Accuracy** | 95.22-99.96% |

---

## 🔧 Setup & Deployment Instructions

### **Prerequisites:**
- Node.js >=18.0.0
- Python >=3.8
- pip (Python package manager)
- Supabase account (for database & auth)
- Git

### **Frontend Setup:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### **ML Backend Setup:**
```bash
cd backend
pip install flask flask-cors scikit-learn pandas numpy pickle
python predict.py  # Runs on http://localhost:5001
```

### **Environment Variables (.env.local):**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_GOOGLE_GENAI_KEY=your_google_genai_key
```

---

## 🌐 External APIs Used

1. **Open-Meteo Air Quality API**
   - Real-time AQI and pollutant data
   - No authentication required
   - Free tier available

2. **Google GenAI API**
   - AI-powered recommendations
   - Requires API key

3. **Nominatim Reverse Geocoding**
   - Convert coordinates to addresses
   - Open source, no auth required

4. **Supabase**
   - Database hosting
   - Authentication service
   - Real-time subscriptions

---

## 📝 License & Credits

**Project Type:** Educational/Research
**Created:** 2026
**Team:** Multi-disciplinary development team

---

## 🤝 Contributing & Future Enhancements

### **Potential Improvements:**
- [ ] Mobile app (React Native / Flutter)
- [ ] Real-time WebSocket updates
- [ ] Historical data archiving (1+ year)
- [ ] Advanced statistical forecasting
- [ ] Multi-language support
- [ ] Community-powered station network
- [ ] Integration with government AQI databases
- [ ] Machine learning model improvements
- [ ] Advanced filtering and custom reports
- [ ] Integration with IoT sensors

---

**Last Updated:** April 12, 2026

---

This comprehensive documentation provides a complete overview of the AURA project, including architecture, datasets, ML models, API specifications, and deployment instructions.
