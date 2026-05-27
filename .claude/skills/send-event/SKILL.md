---
name: send-event
description: Fire a synthetic event at the running WTF api (POST /events) for smoke testing. Use when the user wants to test the ingestion path end-to-end, verify a deployment works, or generate test data. Requires the stack to be running (use the `run` skill first).
---

# send-event — fire a synthetic event

Sends a single, well-formed event to `POST /events`. Useful as a smoke test after a deploy or after starting the stack.

## Prerequisites

The stack must be up. If unsure: `docker compose ps` should show `wtf-clickhouse` and `wtf-api` both `Up`. If not, invoke the **run** skill first.

## Default invocation

Sends an event with sensible defaults (`u-smoke`, `signup`, current time, two properties):

```bash
curl -sS -X POST http://localhost:3000/events \
  -H 'content-type: application/json' \
  -d "$(cat <<EOF
{
  "eventName": "signup",
  "userId": "u-smoke",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "properties": { "country": "US", "plan": "free" }
}
EOF
)"
```

Expected response: `HTTP 201` with empty body.

## Custom invocation

When the user wants to send a specific event, build the JSON body from their parameters. Required fields:

- `eventName` (string)
- `userId` (string)
- `timestamp` (ISO 8601 UTC string)

Optional:

- `properties` (object of string→string)

## Verify the round-trip

After sending, the event should be readable via `GET /users/:user_id/events`:

```bash
curl -sS http://localhost:3000/users/u-smoke/events?limit=10 | jq .
```

Expect a JSON array with the new event at index 0 (sorted timestamp DESC).

## Notes

- The api server generates `eventId` (UUID) and `ingestedAt` (now) — don't include them in the payload.
- Multiple `send-event` calls can be chained to build up test data quickly.
- The event lands in ClickHouse immediately (synchronous insert in the writer adapter).

## Related skills

- **run** — start the stack if it isn't already up.
