import type { ClickHouseClient } from '@clickhouse/client';
import type { EventWriterPort } from '../../../application/ports/event-writer-port.js';
import type { Event } from '../../../domain/event.js';
import { dateToClickHouse } from './_datetime.js';

export class ClickHouseEventWriter implements EventWriterPort {
  constructor(private readonly client: ClickHouseClient) {}

  async write(event: Event): Promise<void> {
    await this.client.insert({
      table: 'events',
      format: 'JSONEachRow',
      values: [
        {
          event_id: event.eventId,
          event_name: event.eventName,
          user_id: event.userId,
          timestamp: dateToClickHouse(event.timestamp),
          properties: event.properties,
          ingested_at: dateToClickHouse(event.ingestedAt),
        },
      ],
    });
  }
}
