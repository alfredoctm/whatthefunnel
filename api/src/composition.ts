import Fastify, { type FastifyInstance } from 'fastify';
import type { EventWriterPort } from './events/application/ports/EventWriterPort.js';
import type { EventReaderPort } from './events/application/ports/EventReaderPort.js';
import { IngestEventHandler } from './events/application/commands/IngestEventHandler.js';
import { GetUserEventsHandler } from './events/application/queries/GetUserEventsHandler.js';
import { registerEventsRoutes } from './events/adapters/inbound/http/events.js';

export interface Deps {
  eventWriter: EventWriterPort;
  eventReader: EventReaderPort;
}

export function buildApp(deps: Deps): FastifyInstance {
  const app = Fastify({ logger: false });
  const ingest = new IngestEventHandler(deps.eventWriter);
  const getUserEvents = new GetUserEventsHandler(deps.eventReader);
  registerEventsRoutes(app, { ingest, getUserEvents });
  return app;
}
