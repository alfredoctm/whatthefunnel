/**
 * ClickHouse DateTime64(3) JSONEachRow format helpers.
 *
 * Wire format: 'YYYY-MM-DD HH:MM:SS.sss' (space separator, no Z).
 * JS Date format: ISO 8601 ('YYYY-MM-DDTHH:MM:SS.sssZ').
 *
 * The clickhouse-client doesn't transparently convert Date objects through
 * the JSON wire format, so adapters use these helpers on insert and select.
 */

export function dateToClickHouse(d: Date): string {
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

export function clickHouseToDate(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}
