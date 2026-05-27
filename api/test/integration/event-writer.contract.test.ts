import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { randomUUID } from 'node:crypto';
import type { Event } from '../../src/events/domain/event.js';
import type { EventWriterPort } from '../../src/events/application/ports/event-writer-port.js';
import { InMemoryEventWriter } from '../fakes/in-memory-event-writer.js';
import { ClickHouseEventWriter } from '../../src/events/adapters/outbound/clickhouse/clickhouse-event-writer.js';
import { makeEvent } from '../fixtures/event.js';

interface Setup {
  writer: EventWriterPort;
  readBack: (userId: string) => Promise<Event[]>;
  cleanup: () => Promise<void>;
}

const CLICKHOUSE_URL = process.env['CLICKHOUSE_URL'] ?? 'http://localhost:8123';
const CLICKHOUSE_USER = process.env['CLICKHOUSE_USER'] ?? 'wtf';
const CLICKHOUSE_PASSWORD = process.env['CLICKHOUSE_PASSWORD'] ?? 'wtf';

async function setupInMemory(): Promise<Setup> {
  const writer = new InMemoryEventWriter();
  return {
    writer,
    readBack: async (userId: string) =>
      Promise.resolve(writer.writes.filter((e) => e.userId === userId)),
    cleanup: async () => Promise.resolve(),
  };
}

async function setupClickHouse(): Promise<Setup> {
  const client: ClickHouseClient = createClient({
    url: CLICKHOUSE_URL,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
  });
  await client.command({ query: 'TRUNCATE TABLE events' });
  const writer = new ClickHouseEventWriter(client);
  return {
    writer,
    readBack: async (userId: string) => {
      const result = await client.query({
        query: `SELECT event_id, event_name, user_id, timestamp, properties, ingested_at
                FROM events WHERE user_id = {userId:String}`,
        query_params: { userId },
        format: 'JSONEachRow',
      });
      const rows = await result.json<{
        event_id: string;
        event_name: string;
        user_id: string;
        timestamp: string;
        properties: Record<string, string>;
        ingested_at: string;
      }>();
      return rows.map((r) => ({
        eventId: r.event_id,
        eventName: r.event_name,
        userId: r.user_id,
        timestamp: new Date(r.timestamp.replace(' ', 'T') + 'Z'),
        properties: r.properties,
        ingestedAt: new Date(r.ingested_at.replace(' ', 'T') + 'Z'),
      }));
    },
    cleanup: async () => {
      await client.command({ query: 'TRUNCATE TABLE events' });
      await client.close();
    },
  };
}

const impls = [
  { name: 'InMemoryEventWriter', setup: setupInMemory },
  { name: 'ClickHouseEventWriter', setup: setupClickHouse },
];

describe.each(impls)('EventWriterPort contract: $name', ({ setup }) => {
  let env: Setup;

  beforeEach(async () => {
    env = await setup();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('writes an event observable via the storage', async () => {
    const userId = `user-${randomUUID()}`;
    const event = makeEvent({
      userId,
      eventName: 'test_event',
      timestamp: new Date('2026-05-27T12:00:00.000Z'),
      properties: { foo: 'bar' },
    });

    await env.writer.write(event);
    const found = await env.readBack(userId);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      eventName: 'test_event',
      userId,
      properties: { foo: 'bar' },
    });
  });

  it('writes multiple events for the same user, all observable', async () => {
    const userId = `user-${randomUUID()}`;
    const events: Event[] = [1, 2, 3].map((i) =>
      makeEvent({
        userId,
        eventName: `event_${i}`,
        timestamp: new Date(`2026-05-27T12:0${i}:00.000Z`),
        properties: { i: String(i) },
      }),
    );

    for (const e of events) {
      await env.writer.write(e);
    }
    const found = await env.readBack(userId);

    expect(found).toHaveLength(3);
    const names = found.map((e) => e.eventName).sort();
    expect(names).toEqual(['event_1', 'event_2', 'event_3']);
  });
});
