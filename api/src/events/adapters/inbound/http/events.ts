import type { FastifyInstance } from 'fastify';
import type { IngestEventHandler } from '../../../application/commands/IngestEventHandler.js';
import type { GetUserEventsHandler } from '../../../application/queries/GetUserEventsHandler.js';

interface IngestRequestBody {
  eventName: string;
  userId: string;
  timestamp: string;
  properties?: Record<string, string>;
}

interface GetUserEventsParams {
  user_id: string;
}

interface GetUserEventsQuerystring {
  limit?: string;
  before?: string;
}

export interface EventsHttpHandlers {
  ingest: IngestEventHandler;
  getUserEvents: GetUserEventsHandler;
}

export function registerEventsRoutes(app: FastifyInstance, handlers: EventsHttpHandlers): void {
  app.post<{ Body: IngestRequestBody }>('/events', async (req, reply) => {
    const body = req.body;
    await handlers.ingest.handle({
      eventName: body.eventName,
      userId: body.userId,
      timestamp: new Date(body.timestamp),
      properties: body.properties ?? {},
    });
    return reply.code(201).send();
  });

  app.get<{ Params: GetUserEventsParams; Querystring: GetUserEventsQuerystring }>(
    '/users/:user_id/events',
    async (req, reply) => {
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 50;
      const before = req.query.before !== undefined ? new Date(req.query.before) : undefined;
      const events = await handlers.getUserEvents.handle({
        userId: req.params.user_id,
        limit,
        ...(before !== undefined ? { before } : {}),
      });
      return reply.send(events);
    },
  );
}
