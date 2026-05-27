import type { Event } from '../../domain/Event.js';
import type { EventReaderPort } from '../ports/EventReaderPort.js';
import type { GetUserEventsQuery } from './GetUserEventsQuery.js';

export class GetUserEventsHandler {
  constructor(private readonly reader: EventReaderPort) {}

  async handle(query: GetUserEventsQuery): Promise<Event[]> {
    return this.reader.findByUser(query.userId, {
      limit: query.limit,
      ...(query.before !== undefined ? { before: query.before } : {}),
    });
  }
}
