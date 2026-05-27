import type { Event } from '../../domain/Event.js';

export interface EventReaderPort {
  findByUser(userId: string, opts: { limit: number; before?: Date }): Promise<Event[]>;
}
