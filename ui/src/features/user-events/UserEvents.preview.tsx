import type { ReactElement } from 'react';
import { UserEvents } from './UserEvents.js';
import type { UIEvent } from './types.js';

const stubEvents: readonly UIEvent[] = [
  {
    eventId: 'evt-1',
    eventName: 'signup',
    userId: 'u-preview',
    timestamp: '2026-05-27T10:00:00.000Z',
    properties: { country: 'US', plan: 'free' },
    ingestedAt: '2026-05-27T10:00:00.000Z',
  },
  {
    eventId: 'evt-2',
    eventName: 'activated',
    userId: 'u-preview',
    timestamp: '2026-05-27T11:30:00.000Z',
    properties: { feature: 'onboarding' },
    ingestedAt: '2026-05-27T11:30:00.000Z',
  },
  {
    eventId: 'evt-3',
    eventName: 'purchased',
    userId: 'u-preview',
    timestamp: '2026-05-27T14:00:00.000Z',
    properties: { plan: 'pro', amount_usd: '29' },
    ingestedAt: '2026-05-27T14:00:00.000Z',
  },
];

export function UserEventsPreview(): ReactElement {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">
        UserEvents — preview
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Stub data. Same component renders real data at{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          /users/:userId/events
        </code>
        .
      </p>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Populated</h2>
      <UserEvents events={stubEvents} />

      <h2 className="mb-3 mt-10 text-lg font-semibold text-slate-900">
        Empty state
      </h2>
      <UserEvents events={[]} />
    </main>
  );
}
