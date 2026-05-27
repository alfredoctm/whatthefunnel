export interface GetUserEventsQuery {
  readonly userId: string;
  readonly limit: number;
  readonly before?: Date;
}
