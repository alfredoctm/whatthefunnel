import type { ReactElement } from 'react';
import type { UIEvent } from './types.js';

interface UserEventsProps {
  readonly events: readonly UIEvent[];
}

export function UserEvents({ events }: UserEventsProps): ReactElement {
  if (events.length === 0) {
    return <p className="italic text-slate-500">No events for this user yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {events.map((event) => (
        <li
          key={event.eventId}
          className="flex items-baseline justify-between px-4 py-3"
        >
          <span className="font-medium text-slate-900">{event.eventName}</span>
          <time dateTime={event.timestamp} className="text-sm text-slate-500">
            {new Date(event.timestamp).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
}
