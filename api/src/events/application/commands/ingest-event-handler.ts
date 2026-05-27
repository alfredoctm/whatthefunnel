import { randomUUID } from 'node:crypto';
import type { Event } from '../../domain/event.js';
import type { EventWriterPort } from '../ports/event-writer-port.js';
import type { IngestEventCommand } from './ingest-event-command.js';

export class IngestEventHandler {
  constructor(private readonly writer: EventWriterPort) {}

  async handle(cmd: IngestEventCommand): Promise<void> {
    const event: Event = {
      eventId: randomUUID(),
      eventName: cmd.eventName,
      userId: cmd.userId,
      timestamp: cmd.timestamp,
      properties: cmd.properties,
      ingestedAt: new Date(),
    };
    await this.writer.write(event);
  }
}
