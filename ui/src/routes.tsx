import type { ReactElement } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { UserEventsPage } from './features/user-events/UserEventsPage.js';
import { UserEventsPreview } from './features/user-events/UserEvents.preview.js';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          What The Funnel
        </h1>
        <p className="mt-2 text-slate-600">
          Try{' '}
          <a
            className="text-blue-600 underline"
            href="/users/u-smoke/events"
          >
            /users/u-smoke/events
          </a>{' '}
          or{' '}
          <a
            className="text-blue-600 underline"
            href="/preview/user-events"
          >
            /preview/user-events
          </a>
          .
        </p>
      </main>
    ),
  },
  {
    path: '/users/:userId/events',
    element: <UserEventsPage />,
  },
  {
    path: '/preview/user-events',
    element: <UserEventsPreview />,
  },
]);

export function AppRouter(): ReactElement {
  return <RouterProvider router={router} />;
}
