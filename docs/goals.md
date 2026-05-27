# Goals — What The Funnel MVP

## Problem Statement
Amplitude is a best-in-class product analytics tool, but it's overkill (and too 
expensive) for solo developers and small startups with side projects. There is no 
good self-hostable, open-source alternative that matches Amplitude's core UX and 
analytical power.

## Target Users
- Solo developers with side projects
- Small startups who can't afford Amplitude

## Goal
Build a self-hostable, open-source product analytics platform that covers the core 
Amplitude use cases, deployable by any developer with Docker in minutes.

## Success Criteria
The MVP is done when:
> "I can point it at one of my own projects, send events via the API, and see 
> user profiles, segmentation, and funnels in a UI."

## MVP Scope (in priority order)
1. **User Profiles** — per-user page showing their full event log, no properties
2. **Event Segmentation** — filter/group events by properties, over time
3. **Funnels** — ordered step conversion analysis

## API (MVP)
- `POST /events` — ingest a single event
- `GET /users/:user_id/events` — read a user's event log (drives User Profiles)
- Additional read endpoints land with Segmentation and Funnels

## Infrastructure
- Fully Docker Compose based — one command runs the whole stack (`api`, `clickhouse`, `web`)
- Target: any developer comfortable with Docker, no DevOps expertise required
- ClickHouse as the primary storage engine (non-negotiable)
- **API:** Node + Fastify + TypeScript (strict, ESM). **UI:** React + Tailwind built statically, served by nginx (which also reverse-proxies `/api/*` to the api service).

## Out of Scope for MVP
- Client/JS SDK
- User properties
- Authentication & multi-tenancy
- Dashboards / saved reports
- Alerts or notifications
- A/B testing

## Learning Goals
- ClickHouse hands-on as a primary storage engine
- AI-automated engineering with Claude — agents, skills, structured workflows