import Fastify, { type FastifyInstance } from 'fastify';
import type { EventWriterPort } from './events/application/ports/event-writer-port.js';
import type { EventReaderPort } from './events/application/ports/event-reader-port.js';
import { IngestEventHandler } from './events/application/commands/ingest-event-handler.js';
import { GetUserEventsHandler } from './events/application/queries/get-user-events-handler.js';
import { registerEventsRoutes } from './events/adapters/inbound/http/events.js';

export interface Deps {
  eventWriter: EventWriterPort;
  eventReader: EventReaderPort;
}

export function buildApp(deps: Deps): FastifyInstance {
  const app = Fastify({ logger: false });

  // Liveness probe — used by docker-compose healthcheck and any future
  // orchestrator. Cross-cutting concern; not owned by an aggregate.
  app.get('/health', () => ({ status: 'ok' }));

  const ingest = new IngestEventHandler(deps.eventWriter);
  const getUserEvents = new GetUserEventsHandler(deps.eventReader);
  registerEventsRoutes(app, { ingest, getUserEvents });
  return app;
}
