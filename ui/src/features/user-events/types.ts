/**
 * Wire-format event as returned by GET /api/users/:userId/events.
 *
 * Mirrors api/src/events/domain/event.ts but uses ISO strings for dates
 * (since that's what JSON serialization produces over the wire). The UI
 * formats them for display; no Date round-trip needed.
 */
export interface UIEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly userId: string;
  readonly timestamp: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly ingestedAt: string;
}
