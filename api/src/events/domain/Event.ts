export interface Event {
  readonly eventId: string;
  readonly eventName: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly properties: Readonly<Record<string, string>>;
  readonly ingestedAt: Date;
}
