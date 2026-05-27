import type { FastifyInstance } from 'fastify';
import type { IngestEventHandler } from '../../../application/commands/IngestEventHandler.js';

interface IngestRequestBody {
  eventName: string;
  userId: string;
  timestamp: string;
  properties?: Record<string, string>;
}

export function registerEventsRoutes(app: FastifyInstance, ingest: IngestEventHandler): void {
  app.post<{ Body: IngestRequestBody }>('/events', async (req, reply) => {
    const body = req.body;
    await ingest.handle({
      eventName: body.eventName,
      userId: body.userId,
      timestamp: new Date(body.timestamp),
      properties: body.properties ?? {},
    });
    return reply.code(201).send();
  });
}
