import Fastify, { type FastifyInstance } from 'fastify';
import type { EventWriterPort } from './events/application/ports/EventWriterPort.js';
import { IngestEventHandler } from './events/application/commands/IngestEventHandler.js';
import { registerEventsRoutes } from './events/adapters/inbound/http/events.js';

export interface Deps {
  eventWriter: EventWriterPort;
}

export function buildApp(deps: Deps): FastifyInstance {
  const app = Fastify({ logger: false });
  const ingestHandler = new IngestEventHandler(deps.eventWriter);
  registerEventsRoutes(app, ingestHandler);
  return app;
}
