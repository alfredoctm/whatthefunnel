import type { Event } from '../../src/events/domain/Event.js';
import type { EventReaderPort } from '../../src/events/application/ports/EventReaderPort.js';

/**
 * In-memory implementation of EventReaderPort used by acceptance tests and
 * the parametrized integration suite.
 *
 * Construct with optional seed events. The acceptance tests use this to
 * verify the read path without depending on the writer (hermetic, per
 * CQRS).
 */
export class InMemoryEventReader implements EventReaderPort {
  public readonly events: Event[];

  constructor(seedEvents: readonly Event[] = []) {
    this.events = [...seedEvents];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findByUser(userId: string, opts: { limit: number; before?: Date }): Promise<Event[]> {
    return this.events
      .filter((e) => e.userId === userId)
      .filter((e) => !opts.before || e.timestamp < opts.before)
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, opts.limit);
  }
}
