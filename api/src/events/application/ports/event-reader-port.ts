import type { Event } from '../../domain/event.js';

export interface EventReaderPort {
  findByUser(userId: string, opts: { limit: number; before?: Date }): Promise<Event[]>;
}
