import type { Event } from '../../domain/Event.js';

export interface EventWriterPort {
  write(event: Event): Promise<void>;
}
