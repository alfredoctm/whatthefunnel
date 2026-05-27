export interface IngestEventCommand {
  readonly eventName: string;
  readonly userId: string;
  readonly timestamp: Date;
  readonly properties: Readonly<Record<string, string>>;
}
