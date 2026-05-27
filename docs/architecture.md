# Architecture

What the Funnel (WTF) is a single-bounded-context analytics service: a thin
Fastify API in front of ClickHouse. This document is the canonical reference
for the system's shape. Each Phase 2 feature updates the diagrams below as it
lands.

## C4 Level 1 — Context

```mermaid
C4Context
  title Context — What The Funnel

  Person(operator, "Operator", "Solo dev or small team running WTF on their own infra")
  System_Ext(source, "Event source", "Any app or script that POSTs events")
  System_Ext(viewer, "Profile viewer", "Anything that GETs a user's event log (curl, future UI, future SDK)")

  System(wtf, "WTF", "Self-hostable, open-source product analytics. Ingests events, serves per-user event logs.")

  Rel(source, wtf, "Sends events", "HTTP POST /events")
  Rel(viewer, wtf, "Reads user event logs", "HTTP GET /users/:id/events")
  Rel(operator, wtf, "Operates & deploys", "docker compose")
```

## C4 Level 2 — Containers

```mermaid
C4Container
  title Containers — WTF

  Person(operator, "Operator")
  System_Ext(source, "Event source")
  System_Ext(viewer, "Profile viewer")

  Container_Boundary(wtf, "WTF") {
    Container(api, "api", "Node 22 + Fastify (TypeScript, ESM)", "POST /events, GET /users/:id/events. Hexagonal + CQRS internals.")
    ContainerDb(ch, "clickhouse", "ClickHouse 24.8", "Events table — MergeTree, monthly partitions, ORDER BY (event_name, hour, user_id, ts).")
  }

  Rel(source, api, "POST events", "HTTPS / JSON")
  Rel(viewer, api, "GET user events", "HTTPS / JSON")
  Rel(api, ch, "Inserts + reads via @clickhouse/client", "HTTP 8123")
  Rel(operator, wtf, "docker compose up", "")
```

## C4 Level 3 — Components inside `api`

```mermaid
C4Component
  title Components — events aggregate inside api

  Container_Ext(source, "Event source", "External system")
  Container_Ext(viewer, "Profile viewer", "External system")
  ContainerDb_Ext(ch, "clickhouse", "ClickHouse")

  Container_Boundary(api, "api (Fastify)") {
    Component(routes, "events HTTP routes", "Fastify inbound adapter", "POST /events, GET /users/:id/events. Translates HTTP <-> commands/queries.")
    Component(ingest, "IngestEventHandler", "Command handler", "Generates eventId + ingestedAt, calls EventWriterPort.")
    Component(getUserEvents, "GetUserEventsHandler", "Query handler", "Calls EventReaderPort.findByUser with limit + optional before cursor.")
    Component(writerPort, "EventWriterPort", "TS interface", "write(event)")
    Component(readerPort, "EventReaderPort", "TS interface", "findByUser(userId, opts)")
    Component(chWriter, "ClickHouseEventWriter", "Outbound adapter", "implements EventWriterPort. Insert via JSONEachRow.")
    Component(chReader, "ClickHouseEventReader", "Outbound adapter", "implements EventReaderPort. Parameterized SELECT with optional `before` clause.")
    Component(comp, "buildApp / server.ts", "Composition root", "Only file that imports across aggregates. Constructs real adapters, wires handlers, boots Fastify.")
  }

  Rel(source, routes, "POST /events")
  Rel(viewer, routes, "GET /users/:id/events")
  Rel(routes, ingest, "Builds IngestEventCommand, calls handle()")
  Rel(routes, getUserEvents, "Builds GetUserEventsQuery, calls handle()")
  Rel(ingest, writerPort, "write(event)")
  Rel(getUserEvents, readerPort, "findByUser(...)")
  Rel(comp, chWriter, "Instantiates as concrete impl of port")
  Rel(comp, chReader, "Instantiates as concrete impl of port")
  Rel(chWriter, ch, "INSERT JSONEachRow")
  Rel(chReader, ch, "SELECT ... WHERE user_id = ?")
```

## Sequence — `POST /events`

```mermaid
sequenceDiagram
  autonumber
  participant Client as Event source
  participant Fastify as Fastify route<br/>(events.ts)
  participant Handler as IngestEventHandler
  participant Port as EventWriterPort
  participant CH as ClickHouseEventWriter<br/>+ @clickhouse/client
  participant DB as ClickHouse events

  Client->>Fastify: POST /events { eventName, userId, timestamp, properties }
  Fastify->>Handler: handle({ eventName, userId, timestamp: Date, properties })
  Note over Handler: Generates eventId (UUID)<br/>and ingestedAt (now)
  Handler->>Port: write(event)
  Port->>CH: write(event)
  CH->>DB: INSERT JSONEachRow (formats DateTime64 as 'YYYY-MM-DD HH:MM:SS.sss')
  DB-->>CH: ok
  CH-->>Port: void
  Port-->>Handler: void
  Handler-->>Fastify: void
  Fastify-->>Client: 201 Created
```

## Sequence — `GET /users/:user_id/events`

```mermaid
sequenceDiagram
  autonumber
  participant Client as Profile viewer
  participant Fastify as Fastify route<br/>(events.ts)
  participant Handler as GetUserEventsHandler
  participant Port as EventReaderPort
  participant CH as ClickHouseEventReader<br/>+ @clickhouse/client
  participant DB as ClickHouse events

  Client->>Fastify: GET /users/u1/events?limit=50&before=...
  Note over Fastify: Parses limit (Number)<br/>and before (Date) from querystring
  Fastify->>Handler: handle({ userId, limit, before? })
  Handler->>Port: findByUser(userId, { limit, before? })
  Port->>CH: findByUser(...)
  CH->>DB: SELECT event_id, event_name, user_id, timestamp, properties, ingested_at<br/>FROM events<br/>WHERE user_id = ?<br/>[AND timestamp < ?]<br/>ORDER BY timestamp DESC<br/>LIMIT ?
  DB-->>CH: rows (JSONEachRow)
  Note over CH: Maps each row to Event domain object<br/>(timestamp 'YYYY-MM-DD HH:MM:SS.sss' -> Date)
  CH-->>Port: Event[]
  Port-->>Handler: Event[]
  Handler-->>Fastify: Event[]
  Fastify-->>Client: 200 OK<br/>JSON Event[]
```

## Why this matters

The point of these diagrams isn't documentation for its own sake — it's that
the **same** structure shows up at every level: at the Container level there's
one aggregate, at the Component level the aggregate has clearly-named ports
with two implementations each (real + fake), and at the Sequence level the call
chain is short and predictable. When new aggregates land (`users/`, …), they
slot in as sibling components without touching anything else.

If a future change makes any of these diagrams misleading, that change is the
problem — update the code or update the diagram, but never let the picture and
the code disagree.
