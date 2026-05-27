---
name: run
description: Start the WTF docker-compose stack and tail the api service logs. Use when the user asks to "start the app", "run the stack", "bring it up", or wants to test endpoints against a running API. Brings up ClickHouse (with healthcheck wait) and the api service together.
---

# run — start the WTF stack

The WTF stack runs entirely via docker-compose. This skill brings it up and starts tailing the api logs.

## Steps

1. **Bring up the stack and wait for healthcheck.** The compose file's `api` service has `depends_on: { clickhouse: { condition: service_healthy } }`, so `--wait` blocks until ClickHouse is ready and `api` is up.

   ```bash
   docker compose up -d --wait
   ```

2. **Tail the api logs.** Run in the background so the rest of the session is free; the user can monitor with the Monitor tool or via shell directly.

   ```bash
   docker compose logs -f api
   ```

3. **Verify the API responds.** A quick smoke check:

   ```bash
   curl -s -i http://localhost:3000/users/u-nonexistent/events?limit=10
   ```

   Expect `200 OK` with an empty JSON array `[]`.

## Notes

- ClickHouse data lives in the `clickhouse-data` named volume — survives container restart, lost only on `docker compose down -v`.
- The api service uses `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `PORT`, `LOG_LEVEL` from `docker-compose.yml` (defaults to local-dev `wtf`/`wtf` credentials per `clickhouse/users.d/wtf-user.xml`).
- To rebuild the api image after `api/` source changes: `docker compose up -d --build api`.
- To stop: `docker compose down` (keeps volume) or `docker compose down -v` (wipes ClickHouse data — irreversible).

## Related skills

- **send-event** — fire a synthetic event at the running stack to smoke-test ingestion.
