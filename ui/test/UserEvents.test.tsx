import { describe, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserEvents } from '../src/features/user-events/UserEvents.js';

describe('<UserEvents>', () => {
  it('renders each event name', () => {
    render(
      <UserEvents
        events={[
          {
            eventId: '1',
            eventName: 'signup',
            userId: 'u1',
            timestamp: '2026-05-27T10:00:00.000Z',
            properties: {},
            ingestedAt: '2026-05-27T10:00:00.000Z',
          },
          {
            eventId: '2',
            eventName: 'activated',
            userId: 'u1',
            timestamp: '2026-05-27T11:00:00.000Z',
            properties: {},
            ingestedAt: '2026-05-27T11:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('signup')).toBeInTheDocument();
    expect(screen.getByText('activated')).toBeInTheDocument();
  });

  it('renders the empty state when there are no events', () => {
    render(<UserEvents events={[]} />);
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });
});
