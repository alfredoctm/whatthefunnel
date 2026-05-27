import type { Event } from '../../domain/event.js';
import type { EventReaderPort } from '../ports/event-reader-port.js';
import type { GetUserEventsQuery } from './get-user-events-query.js';

export class GetUserEventsHandler {
  constructor(private readonly reader: EventReaderPort) {}

  async handle(query: GetUserEventsQuery): Promise<Event[]> {
    return this.reader.findByUser(query.userId, {
      limit: query.limit,
      ...(query.before !== undefined ? { before: query.before } : {}),
    });
  }
}
