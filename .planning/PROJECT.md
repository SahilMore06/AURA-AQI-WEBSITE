# AURA - Air-quality Unified Response Application

## What This Is
AURA is a software-only, real-time air quality SaaS web platform built with Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion. It ingests live PM2.5 data from public APIs (OpenAQ, WAQI, IQAir), surfaces richly animated dashboards, and delivers actionable AI-driven health advisories inside a cinematic, scrollytelling web experience.

## Core Value
To deliver the most visually immersive real-time AQI web dashboard (Awwwards-level quality) that combines live AQI monitoring, historical analytics, multi-city comparison, and AI-generated health advisories in a single platform.

## Context
- **Target Audience:** Concerned Citizens (Viewers), Data Scientists (Analysts), Environmental Team Leads (Admins), and Enterprise Clients (Compliance Managers).
- **Problems Solved:** Fragmented air-quality data across dozen public APIs with no unified real-time view; visually outdated existing dashboards; lack of a singular, immersive platform with collaboration tools and role-based access.
- **Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Framer Motion, D3.js + HTML5 Canvas, Mapbox GL JS, Recharts, Zustand + TanStack Query v5, Supabase (Auth, DB (Postgres), Realtime, Edge Functions). 

## Requirements

### Validated

*None yet — ship to validate*

### Active

- [ ] Interactive scrollytelling landing page with a 3D wireframe-dotted globe.
- [ ] Globe-to-Auth cinematic transition.
- [ ] Supabase OAuth 2.0 Auth (Google, GitHub) + Magic Link with RBAC (Admin, Analyst, Viewer).
- [ ] Multi-step onboarding wizard for new users tracking multiple cities and alert thresholds.
- [ ] Live AQI Dashboard with an animated radial gauge, real-time fetching (<3s delay).
- [ ] iOS-style dock navigation component with spring magnification physics.
- [ ] AI Health Advisory generation using GPT-4o proxy.
- [ ] Realtime PM2.5 data ingestion via Supabase Edge Function cron every 60s.
- [ ] Per-location AQI alert threshold configurations and browser push notifications.
- [ ] Mapbox interactive map with AQI marker pins per city.
- [ ] Dark/Light mode theme syncing with system preferences.

### Out of Scope

- Hardware/IoT integrations — Removed from version 4.0; the application is software-only.
- Desktop-only Dashboard design — Must be a responsive PWA for all viewport sizes.
- Flutter mobile app — V4.0 migrated to a pure React web application.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 App Router | SSR/SSG/ISR hybrid capabilities; ideal for SEO on landing; RSCs | Pending |
| Supabase Backend | Real-time database push, integrated auth and edge functions without setting up separate infrastructure. | Pending |
| D3.js + Canvas for Globe | Performance reasons; lightweight over full Three.js scene for wireframe map representation with scrolling behaviors. | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
