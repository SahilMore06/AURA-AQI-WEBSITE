# Roadmap

**7 phases** | **12 requirements mapped** | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Setup | Initialize Next.js app, configure Supabase, Tailwind, shadcn/ui. | - | 1 |
| 2 | Landing & Transitions | Build D3.js scrollytelling globe, cinematic transitions, & Framer Motion overlay. | CORE-01, CORE-02, CORE-03 | 3 |
| 3 | Auth & Onboarding | Implement Sign in/out, OAuth, Magic Link logic, and Multi-Step Wizard. | AUTH-01, AUTH-02, AUTH-03 | 2 |
| 4 | Core Dashboard & Navigation | Construct iOS-style dock, animated AQI widgets, and stat grids. | DASH-01, DASH-02 | 3 |
| 5 | Data Ingestion| Deploy Supabase Edge Function to fetch public API details every 60s & broadcast Realtime updates. | DATA-01 | 2 |
| 6 | AI Advisories & Alerts | Setup GPT-4o proxy, typewriter advisories, push notifications, and RLS threshold logic. | AI-01, NOTIF-01 | 3 |
| 7 | Mapbox Dashboard | Render Interactive Mapbox GL elements with Marker layers, Map pin clustering, and choropleth support. | MAP-01 | 2 |

---

### Phase Details

**Phase 1: Foundation & Setup**
Goal: Initialize Next.js app, configure Supabase, Tailwind, shadcn/ui.
Requirements: None
Success criteria:
1. App compiles and renders a basic index page with Dark/Light mode support.

**Phase 2: Landing & Transitions**
**UI hint**: yes
Goal: Build D3.js scrollytelling globe, cinematic transitions, & Framer Motion overlay.
Requirements: CORE-01, CORE-02, CORE-03
Success criteria:
1. Interactive globe renders and reacts seamlessly to scrolling.
2. Sign-in card elegantly dissolves-in successfully towards the end of the scroll interactions.
3. Typography aligns successfully with Phase requirements on performance.

**Phase 3: Auth & Onboarding**
**UI hint**: yes
Goal: Implement Sign in/out, OAuth, Magic Link logic, and Multi-Step Wizard.
Requirements: AUTH-01, AUTH-02, AUTH-03
Success criteria:
1. Supabase successfully returns JWT for authenticated instances.
2. The custom 3 step wizard records tracked cities and roles securely.

**Phase 4: Core Dashboard & Navigation**
**UI hint**: yes
Goal: Construct iOS-style dock, animated AQI widgets, and stat grids.
Requirements: DASH-01, DASH-02
Success criteria:
1. Dashboards successfully render static elements simulating real-time inputs.
2. iOS Dock triggers spring animation upon pointing device interactions.
3. Custom routing shifts properly inside App layout configurations.

**Phase 5: Data Ingestion**
Goal: Deploy Supabase Edge Function to fetch public API details every 60s & broadcast Realtime updates.
Requirements: DATA-01
Success criteria:
1. Supabase database tables organically swell with 60-second AQI logs.
2. Realtime sockets trigger mock signals connected directly to dashboards built.

**Phase 6: AI Advisories & Alerts**
**UI hint**: yes
Goal: Setup GPT-4o proxy, typewriter advisories, push notifications, and RLS threshold logic.
Requirements: AI-01, NOTIF-01
Success criteria:
1. Edge function processes text parameters into full sentences utilizing OpenAI APIs.
2. Notification triggers activate when local AQI exceeds admin expectations.
3. Advisory dynamically reads aloud contextually directly on Dashboards via real-time outputs.

**Phase 7: Mapbox Dashboard**
**UI hint**: yes
Goal: Render Interactive Mapbox GL elements with Marker layers, Map pin clustering, and choropleth support.
Requirements: MAP-01
Success criteria:
1. Map properly renders and accepts AQI nodes based directly on locations array.
2. Responsive mobile views successfully resize container values without overflow breaks.
