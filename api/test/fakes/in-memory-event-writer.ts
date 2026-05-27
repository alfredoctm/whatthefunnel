import type { Event } from '../../src/events/domain/event.js';
import type { EventWriterPort } from '../../src/events/application/ports/event-writer-port.js';

/**
 * In-memory implementation of EventWriterPort used by acceptance tests and
 * the parametrized integration suite. `writes` is exposed so tests can
 * assert what was passed to the port.
 */
export class InMemoryEventWriter implements EventWriterPort {
  public readonly writes: Event[] = [];

  // eslint-disable-next-line @typescript-eslint/require-await
  async write(event: Event): Promise<void> {
    this.writes.push(event);
  }
}
