# Metrics Migration Path (3.4)

## Overview

Raw `test_records` and `encounters` can be purged after a configurable window (e.g. 3 months) to control storage growth. Aggregated data is retained in `daily_metrics` and `monthly_metrics`.

## Current State

- **Charts** (Revenue, Tests, Numbers, TAT, etc.) query raw `test_records` and `encounters`.
- Raw data is kept indefinitely.

## Migration Path

1. **Run migration 007** to create `daily_metrics` and `monthly_metrics` tables.

2. **Populate metrics** before first purge:
   ```bash
   npx ts-node scripts/aggregate-metrics.ts
   ```

3. **Schedule aggregation** (e.g. daily cron):
   ```bash
   0 2 * * * cd /path/to/backend && npx ts-node scripts/aggregate-metrics.ts
   ```

4. **Schedule purge** (e.g. weekly, after aggregation):
   ```bash
   0 3 * * 0 PURGE_WINDOW_MONTHS=3 npx ts-node scripts/purge-old-data.ts
   ```

5. **Refactor chart services** to query `daily_metrics` / `monthly_metrics` when date range is fully within purged period. For recent data (within purge window), continue using raw tables.

## Configuration

- `PURGE_WINDOW_MONTHS` (default: 3) - Raw data older than this is purged.

## Tables

- **daily_metrics**: Per-day aggregates by lab_section, shift, laboratory.
- **monthly_metrics**: Per-month aggregates, same dimensions.
