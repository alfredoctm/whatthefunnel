-- WTF events table — single source of truth.
--
-- Serves three first-class query patterns:
--   (a) per-user event history                (User Profiles)
--   (b) event_name + time-range + property filter/group  (Segmentation)
--   (c) windowFunnel over (user_id, event_name, timestamp)  (Funnels)
--
-- Design notes live in thoughts/phase-1/findings.md.

CREATE TABLE IF NOT EXISTS events
(
    event_id     UUID                                              DEFAULT generateUUIDv4(),
    event_name   LowCardinality(String),
    user_id      String                                            CODEC(ZSTD(3)),
    timestamp    DateTime64(3, 'UTC')                              CODEC(DoubleDelta, ZSTD(3)),
    properties   Map(String, String)                               CODEC(ZSTD(3)),
    ingested_at  DateTime64(3, 'UTC')      DEFAULT now64(3)        CODEC(DoubleDelta, ZSTD(3)),

    -- Skip indexes for the two non-ORDER-BY filters that nonetheless appear
    -- in hot queries.
    INDEX idx_user_id     user_id     TYPE bloom_filter(0.01)      GRANULARITY 4,
    INDEX idx_prop_keys   mapKeys(properties)   TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_prop_vals   mapValues(properties) TYPE bloom_filter(0.01) GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_name, toStartOfHour(timestamp), user_id, timestamp)
SETTINGS
    index_granularity = 8192,
    min_bytes_for_wide_part = 10485760;

-- Optional retention (uncomment when policy is decided):
-- ALTER TABLE events MODIFY TTL toDateTime(timestamp) + INTERVAL 24 MONTH;
