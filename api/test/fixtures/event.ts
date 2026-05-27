import { randomUUID } from 'node:crypto';
import type { Event } from '../../src/events/domain/event.js';

/**
 * Test-data builder for Event. Fills in sensible defaults so each test
 * only specifies what it actually cares about.
 */
export function makeEvent(partial: {
  userId: string;
  eventName: string;
  timestamp: Date;
  properties?: Record<string, string>;
}): Event {
  return {
    eventId: randomUUID(),
    eventName: partial.eventName,
    userId: partial.userId,
    timestamp: partial.timestamp,
    properties: partial.properties ?? {},
    ingestedAt: new Date(),
  };
}
