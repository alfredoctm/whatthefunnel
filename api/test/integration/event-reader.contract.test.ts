import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { randomUUID } from 'node:crypto';
import type { Event } from '../../src/events/domain/event.js';
import type { EventReaderPort } from '../../src/events/application/ports/event-reader-port.js';
import { InMemoryEventReader } from '../fakes/in-memory-event-reader.js';
import { ClickHouseEventReader } from '../../src/events/adapters/outbound/clickhouse/clickhouse-event-reader.js';
import { ClickHouseEventWriter } from '../../src/events/adapters/outbound/clickhouse/clickhouse-event-writer.js';
import { makeEvent } from '../fixtures/event.js';

interface Setup {
  reader: EventReaderPort;
  seed: (events: Event[]) => Promise<void>;
  cleanup: () => Promise<void>;
}

const CLICKHOUSE_URL = process.env['CLICKHOUSE_URL'] ?? 'http://localhost:8123';
const CLICKHOUSE_USER = process.env['CLICKHOUSE_USER'] ?? 'wtf';
const CLICKHOUSE_PASSWORD = process.env['CLICKHOUSE_PASSWORD'] ?? 'wtf';

function setupInMemory(): Promise<Setup> {
  const reader = new InMemoryEventReader();
  return Promise.resolve({
    reader,
    seed: (events) => {
      reader.events.push(...events);
      return Promise.resolve();
    },
    cleanup: () => Promise.resolve(),
  });
}

async function setupClickHouse(): Promise<Setup> {
  const client: ClickHouseClient = createClient({
    url: CLICKHOUSE_URL,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
  });
  await client.command({ query: 'TRUNCATE TABLE events' });
  const writer = new ClickHouseEventWriter(client);
  const reader = new ClickHouseEventReader(client);
  return {
    reader,
    seed: async (events) => {
      for (const e of events) {
        await writer.write(e);
      }
    },
    cleanup: async () => {
      await client.command({ query: 'TRUNCATE TABLE events' });
      await client.close();
    },
  };
}

const impls = [
  { name: 'InMemoryEventReader', setup: setupInMemory },
  { name: 'ClickHouseEventReader', setup: setupClickHouse },
];

describe.each(impls)('EventReaderPort contract: $name', ({ setup }) => {
  let env: Setup;

  beforeEach(async () => {
    env = await setup();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it("returns the user's events in timestamp-descending order", async () => {
    const userId = `user-${randomUUID()}`;
    const otherUserId = `user-${randomUUID()}`;
    await env.seed([
      makeEvent({
        userId,
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId,
        eventName: 'b',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      makeEvent({
        userId: otherUserId,
        eventName: 'other',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);

    const events = await env.reader.findByUser(userId, { limit: 10 });

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.eventName)).toEqual(['b', 'a']);
    expect(events.every((e) => e.userId === userId)).toBe(true);
  });

  it('respects limit', async () => {
    const userId = `user-${randomUUID()}`;
    await env.seed([
      makeEvent({
        userId,
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId,
        eventName: 'b',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      makeEvent({
        userId,
        eventName: 'c',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);

    const events = await env.reader.findByUser(userId, { limit: 2 });

    expect(events.map((e) => e.eventName)).toEqual(['c', 'b']);
  });

  it('respects the `before` cursor', async () => {
    const userId = `user-${randomUUID()}`;
    await env.seed([
      makeEvent({
        userId,
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId,
        eventName: 'b',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      makeEvent({
        userId,
        eventName: 'c',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);

    const events = await env.reader.findByUser(userId, {
      limit: 10,
      before: new Date('2026-05-27T11:30:00.000Z'),
    });

    expect(events.map((e) => e.eventName)).toEqual(['b', 'a']);
  });

  it('returns empty array for an unknown user', async () => {
    await env.seed([
      makeEvent({
        userId: 'someone',
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
    ]);

    const events = await env.reader.findByUser('nobody', { limit: 10 });

    expect(events).toEqual([]);
  });
});
