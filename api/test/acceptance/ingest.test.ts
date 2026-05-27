import { describe, it, expect } from '@jest/globals';
import { buildApp } from '../../src/composition.js';
import { InMemoryEventWriter } from '../fakes/InMemoryEventWriter.js';
import { InMemoryEventReader } from '../fakes/InMemoryEventReader.js';

describe('POST /events', () => {
  it('writes a valid event and returns 201', async () => {
    const eventWriter = new InMemoryEventWriter();
    const app = buildApp({ eventWriter, eventReader: new InMemoryEventReader() });

    const response = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {
        eventName: 'signup',
        userId: 'u1',
        timestamp: '2026-05-27T12:00:00.000Z',
        properties: { country: 'US', plan: 'free' },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(eventWriter.writes).toHaveLength(1);
    expect(eventWriter.writes[0]).toMatchObject({
      eventName: 'signup',
      userId: 'u1',
      timestamp: new Date('2026-05-27T12:00:00.000Z'),
      properties: { country: 'US', plan: 'free' },
    });
    expect(eventWriter.writes[0]?.eventId).toEqual(expect.any(String));
    expect(eventWriter.writes[0]?.ingestedAt).toBeInstanceOf(Date);

    await app.close();
  });
});
