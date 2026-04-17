# Requirements

## v1 Requirements

### Foundation & Entry
- [ ] **CORE-01**: User can view a full-screen landing page with a scrollytelling D3.js 3D wireframe-dotted globe (F01).
- [ ] **CORE-02**: User can experience a zoom-to-city globe transition dissolving into a smooth authentication page on scroll completion (F02).
- [ ] **CORE-03**: User can toggle between system-aware Dark/Light modes seamlessly across the platform (F12).

### Authentication & Profiles
- [ ] **AUTH-01**: User can register/log in using Google, GitHub OAuth, or Magic Link via Supabase Auth (F03).
- [ ] **AUTH-02**: User can complete a 3-step onboarding wizard gathering names, desired cities, and AQI alert thresholds (F04).
- [ ] **AUTH-03**: Application enforces Admin, Analyst, and Viewer Roles using Supabase Row Level Security (RLS) (F05).

### Dashboard & UI Navigation
- [ ] **DASH-01**: User can navigate the application via a persistent, animated iOS-style dock with spring magnification physics (F07).
- [ ] **DASH-02**: User can view a real-time live AQI breakdown utilizing radial gauges and statistics for their selected city, auto-refreshing via Supabase Realtime under 3s (F06).

### AI & Notifications
- [ ] **AI-01**: User can read an AI-generated, plain-language health advisory text corresponding to the current AQI of their city, typed out using a typewriter effect (F08).
- [ ] **NOTIF-01**: User receives browser push notifications broadcast via Realtime when local AQI exceeds configured threshold settings (Administrators set values) (F10).

### Map Integration
- [ ] **MAP-01**: User can interact with an interactive Mapbox AQI map indicating cities via custom SVG markers, colored by AQI category, and filterable (F11).

### Infrastructure
- [ ] **DATA-01**: Application backend fetches and ingests PM2.5 points from OpenAQ, WAQI, IQAir every 60 seconds using Supabase Edge Functions with deduplication mechanisms (F09).

## Out of Scope
- Historical Analytics (Phase 2 feature)
- Offline PWA Mode caching (Phase 2 feature)
- Collaborative Workspaces (Phase 2 feature)
- White-label Configuration (Phase 2 feature)
- AQI Forecast prediction model (Phase 2 feature)

## Traceability
*(To be populated on Roadmap generation)*
