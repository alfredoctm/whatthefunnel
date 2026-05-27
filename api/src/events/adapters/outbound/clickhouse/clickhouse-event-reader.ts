import type { ClickHouseClient } from '@clickhouse/client';
import type { EventReaderPort } from '../../../application/ports/event-reader-port.js';
import type { Event } from '../../../domain/event.js';
import { clickHouseToDate, dateToClickHouse } from './_datetime.js';

interface EventRow {
  event_id: string;
  event_name: string;
  user_id: string;
  timestamp: string;
  properties: Record<string, string>;
  ingested_at: string;
}

export class ClickHouseEventReader implements EventReaderPort {
  constructor(private readonly client: ClickHouseClient) {}

  async findByUser(userId: string, opts: { limit: number; before?: Date }): Promise<Event[]> {
    const beforeClause =
      opts.before !== undefined ? 'AND timestamp < {before:DateTime64(3)}' : '';

    const query = `
      SELECT event_id, event_name, user_id, timestamp, properties, ingested_at
      FROM events
      WHERE user_id = {userId:String}
      ${beforeClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32}
    `;

    const params: Record<string, string | number> = {
      userId,
      limit: opts.limit,
    };
    if (opts.before !== undefined) {
      params['before'] = dateToClickHouse(opts.before);
    }

    const result = await this.client.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });
    const rows = await result.json<EventRow>();
    return rows.map(rowToEvent);
  }
}

function rowToEvent(row: EventRow): Event {
  return {
    eventId: row.event_id,
    eventName: row.event_name,
    userId: row.user_id,
    timestamp: clickHouseToDate(row.timestamp),
    properties: row.properties,
    ingestedAt: clickHouseToDate(row.ingested_at),
  };
}
