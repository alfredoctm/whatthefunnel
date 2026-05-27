import { describe, it, expect } from '@jest/globals';
import { buildApp } from '../../src/composition.js';
import { InMemoryEventReader } from '../fakes/in-memory-event-reader.js';
import { InMemoryEventWriter } from '../fakes/in-memory-event-writer.js';
import { makeEvent } from '../fixtures/event.js';

describe('GET /users/:user_id/events', () => {
  it("returns the user's events in timestamp-descending order", async () => {
    const eventReader = new InMemoryEventReader([
      makeEvent({
        userId: 'u1',
        eventName: 'signup',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId: 'u1',
        eventName: 'activated',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      // u2 must NOT appear
      makeEvent({
        userId: 'u2',
        eventName: 'other',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);
    const app = buildApp({
      eventWriter: new InMemoryEventWriter(),
      eventReader,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/u1/events?limit=10',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Array<{ eventName: string; userId: string }>;
    expect(body).toHaveLength(2);
    expect(body[0]?.eventName).toBe('activated');
    expect(body[1]?.eventName).toBe('signup');
    expect(body.every((e) => e.userId === 'u1')).toBe(true);

    await app.close();
  });

  it('respects limit', async () => {
    const eventReader = new InMemoryEventReader([
      makeEvent({
        userId: 'u1',
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId: 'u1',
        eventName: 'b',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      makeEvent({
        userId: 'u1',
        eventName: 'c',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);
    const app = buildApp({
      eventWriter: new InMemoryEventWriter(),
      eventReader,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/u1/events?limit=2',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Array<{ eventName: string }>;
    expect(body).toHaveLength(2);
    expect(body.map((e) => e.eventName)).toEqual(['c', 'b']);

    await app.close();
  });

  it('respects the `before` cursor', async () => {
    const eventReader = new InMemoryEventReader([
      makeEvent({
        userId: 'u1',
        eventName: 'a',
        timestamp: new Date('2026-05-27T10:00:00.000Z'),
      }),
      makeEvent({
        userId: 'u1',
        eventName: 'b',
        timestamp: new Date('2026-05-27T11:00:00.000Z'),
      }),
      makeEvent({
        userId: 'u1',
        eventName: 'c',
        timestamp: new Date('2026-05-27T12:00:00.000Z'),
      }),
    ]);
    const app = buildApp({
      eventWriter: new InMemoryEventWriter(),
      eventReader,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users/u1/events?limit=10&before=2026-05-27T11:30:00.000Z',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Array<{ eventName: string }>;
    expect(body.map((e) => e.eventName)).toEqual(['b', 'a']);

    await app.close();
  });
});
