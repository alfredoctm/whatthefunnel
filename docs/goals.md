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
One endpoint:
- `POST /events` — ingest a single event

## Infrastructure
- Fully Docker Compose based — one command to run the whole stack
- Target: any developer comfortable with Docker, no DevOps expertise required
- ClickHouse as the primary storage engine (non-negotiable)

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