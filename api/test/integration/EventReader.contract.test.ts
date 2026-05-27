import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { randomUUID } from 'node:crypto';
import type { Event } from '../../src/events/domain/Event.js';
import type { EventReaderPort } from '../../src/events/application/ports/EventReaderPort.js';
import { InMemoryEventReader } from '../fakes/InMemoryEventReader.js';
import { ClickHouseEventReader } from '../../src/events/adapters/outbound/clickhouse/ClickHouseEventReader.js';
import { ClickHouseEventWriter } from '../../src/events/adapters/outbound/clickhouse/ClickHouseEventWriter.js';

interface Fixture {
  reader: EventReaderPort;
  seed: (events: Event[]) => Promise<void>;
  cleanup: () => Promise<void>;
}

const CLICKHOUSE_URL = process.env['CLICKHOUSE_URL'] ?? 'http://localhost:8123';
const CLICKHOUSE_USER = process.env['CLICKHOUSE_USER'] ?? 'wtf';
const CLICKHOUSE_PASSWORD = process.env['CLICKHOUSE_PASSWORD'] ?? 'wtf';

function makeEvent(partial: {
  userId: string;
  eventName: string;
  timestamp: Date;
}): Event {
  return {
    eventId: randomUUID(),
    eventName: partial.eventName,
    userId: partial.userId,
    timestamp: partial.timestamp,
    properties: {},
    ingestedAt: new Date(),
  };
}

async function inMemoryFixture(): Promise<Fixture> {
  const reader = new InMemoryEventReader();
  return {
    reader,
    seed: async (events) => {
      reader.events.push(...events);
      return Promise.resolve();
    },
    cleanup: async () => Promise.resolve(),
  };
}

async function clickHouseFixture(): Promise<Fixture> {
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
  { name: 'InMemoryEventReader', factory: inMemoryFixture },
  { name: 'ClickHouseEventReader', factory: clickHouseFixture },
];

describe.each(impls)('EventReaderPort contract: $name', ({ factory }) => {
  let fx: Fixture;

  beforeEach(async () => {
    fx = await factory();
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it("returns the user's events in timestamp-descending order", async () => {
    const userId = `user-${randomUUID()}`;
    const otherUserId = `user-${randomUUID()}`;
    await fx.seed([
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

    const events = await fx.reader.findByUser(userId, { limit: 10 });

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.eventName)).toEqual(['b', 'a']);
    expect(events.every((e) => e.userId === userId)).toBe(true);
  });

  it('respects limit', async () => {
    const userId = `user-${randomUUID()}`;
    await fx.seed([
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

    const events = await fx.reader.findByUser(userId, { limit: 2 });

    expect(events.map((e) => e.eventName)).toEqual(['c', 'b']);
  });

  it('respects the `before` cursor', async () => {
    const userId = `user-${randomUUID()}`;
    await fx.seed([
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

    const events = await fx.reader.findByUser(userId, {
      limit: 10,
      before: new Date('2026-05-27T11:30:00.000Z'),
    });

    expect(events.map((e) => e.eventName)).toEqual(['b', 'a']);
  });

  it('returns empty array for an unknown user', async () => {
    await fx.seed([
      makeEvent({
        userId: 'someone',
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
    ]);

    const events = await fx.reader.findByUser('nobody', { limit: 10 });

    expect(events).toEqual([]);
  });
});
