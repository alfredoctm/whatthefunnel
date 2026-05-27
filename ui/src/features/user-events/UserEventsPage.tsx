import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, getUserEvents } from '../../lib/api.js';
import type { UIEvent } from './types.js';
import { UserEvents } from './UserEvents.js';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; events: UIEvent[] }
  | { kind: 'error'; message: string };

export function UserEventsPage(): ReactElement {
  const { userId } = useParams<{ userId: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (userId === undefined) {
      setState({ kind: 'error', message: 'Missing user id' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'loading' });
    getUserEvents(userId, { limit: 50 })
      .then((events) => {
        if (!cancelled) setState({ kind: 'ok', events });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? `API error (${err.status})`
            : 'Failed to load events';
        setState({ kind: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">
        Events for {userId}
      </h1>
      {state.kind === 'loading' && <p className="text-slate-500">Loading…</p>}
      {state.kind === 'error' && <p className="text-red-600">{state.message}</p>}
      {state.kind === 'ok' && <UserEvents events={state.events} />}
    </main>
  );
}
