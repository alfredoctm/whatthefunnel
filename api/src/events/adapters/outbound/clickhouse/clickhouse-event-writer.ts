import type { ClickHouseClient } from '@clickhouse/client';
import type { EventWriterPort } from '../../../application/ports/event-writer-port.js';
import type { Event } from '../../../domain/event.js';

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
          // ClickHouse DateTime64 via JSON: 'YYYY-MM-DD HH:MM:SS.sss'
          timestamp: formatDateTime64(event.timestamp),
          properties: event.properties,
          ingested_at: formatDateTime64(event.ingestedAt),
        },
      ],
    });
  }
}

function formatDateTime64(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '');
}
