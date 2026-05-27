import { createClient } from '@clickhouse/client';
import { buildApp } from './composition.js';
import { ClickHouseEventWriter } from './events/adapters/outbound/clickhouse/clickhouse-event-writer.js';
import { ClickHouseEventReader } from './events/adapters/outbound/clickhouse/clickhouse-event-reader.js';

const port = Number(process.env['PORT'] ?? 3000);
const clickhouseUrl = process.env['CLICKHOUSE_URL'] ?? 'http://localhost:8123';
const clickhouseUser = process.env['CLICKHOUSE_USER'] ?? 'wtf';
const clickhousePassword = process.env['CLICKHOUSE_PASSWORD'] ?? 'wtf';

const client = createClient({
  url: clickhouseUrl,
  username: clickhouseUser,
  password: clickhousePassword,
});
const eventWriter = new ClickHouseEventWriter(client);
const eventReader = new ClickHouseEventReader(client);
const app = buildApp({ eventWriter, eventReader });

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.error(`WTF api listening on ${address}`);
});
