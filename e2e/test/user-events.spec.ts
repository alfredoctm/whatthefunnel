import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.describe('UserEvents page', () => {
  test('renders an event seeded via the API', async ({ page, request }) => {
    const userId = `e2e-${randomUUID()}`;

    // Seed via the same proxy the UI uses — proves the full request path.
    const seed = await request.post('/api/events', {
      data: {
        eventName: 'e2e-signup',
        userId,
        timestamp: '2026-05-27T15:00:00.000Z',
        properties: { source: 'playwright' },
      },
    });
    expect(seed.status()).toBe(201);

    await page.goto(`/users/${userId}/events`);

    await expect(page.getByRole('heading', { name: new RegExp(userId) })).toBeVisible();
    await expect(page.getByText('e2e-signup')).toBeVisible();
  });

  test('shows the empty state for an unknown user', async ({ page }) => {
    const userId = `e2e-empty-${randomUUID()}`;

    await page.goto(`/users/${userId}/events`);

    await expect(page.getByText(/no events for this user/i)).toBeVisible();
  });
});
