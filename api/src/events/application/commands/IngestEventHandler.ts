import { randomUUID } from 'node:crypto';
import type { Event } from '../../domain/Event.js';
import type { EventWriterPort } from '../ports/EventWriterPort.js';
import type { IngestEventCommand } from './IngestEventCommand.js';

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
