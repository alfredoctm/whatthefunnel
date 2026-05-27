import type { UIEvent } from '../features/user-events/types.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getUserEvents(
  userId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<UIEvent[]> {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.before !== undefined) params.set('before', opts.before);

  const qs = params.size > 0 ? `?${params.toString()}` : '';
  const url = `/api/users/${encodeURIComponent(userId)}/events${qs}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch events: ${res.status}`);
  }
  return (await res.json()) as UIEvent[];
}
