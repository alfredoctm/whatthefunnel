import type { Event } from '../../domain/event.js';

export interface EventWriterPort {
  write(event: Event): Promise<void>;
}
