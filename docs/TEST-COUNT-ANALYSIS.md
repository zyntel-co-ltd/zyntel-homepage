# Test Count Analysis: LabGuru vs Kranium/Meta

## LabGuru Insights Layer

Shows the same numbers managers see in LabGuru (statistics.php TESTS DONE) without leaving the dashboard.

`get_labguru_counts.py` queries LabGuruV3.CountTestsDone (direct DB) – same source as ajax_stats_done_2.php. Falls back to Kranium.Labrequest if needed.

---

## Problem Statement

Hospital targets (from LabGuru) show **much higher** test counts than the dashboard. Managers cannot use dashboard data because it appears "too small." The dashboard data is correct and traceable; the discrepancy is in **how tests are counted** and **name matching**.

## Root Causes (Suspected)

1. **Panel vs component counting**: RFTS (Renal Function) = 1 panel but may be counted as 2 (Urea + Creatinine) when machine results are posted. PT/INR = 1 panel but ~4 components.
2. **LabGuru counting logic**: LabGuru counts **resulted tests**—when the analyzer hosts results via API, that's when it counts. Users must know the exact LabGuru test name to result.
3. **Two data sources**: 
   - **Kranium.Labrequest** = test requests (what we fetch)
   - **Kranium/meta** = canonical test definitions with prices (what we use for revenue)
4. **Name mismatch**: LabGuru result names may differ from Kranium price-list names (truncation, spelling, panels vs components).

## Data Integrity: DB vs Scraper

**Verified**: Direct DB fetch and scraper return **identical data** for the same date.

- 2026-03-08: DB 441 records, Scraper 441 records
- 439 exact matches; 2 differed only by **trailing space** in test names (now fixed in DB fetch)
- Direct DB is the preferred source (faster, no login, same data)

## Analysis Results (30-day sample)

| Metric | Value |
|--------|-------|
| LabGuru unique test names | 289 |
| Meta (Kranium) unique test names | 732 |
| Exact match (in both) | 255 |
| Only in LabGuru (need mapping) | 34 |
| LabGuru total records | 20,144 |
| Matched to meta | 98.5% |
| Unmatched | 1.5% |

### Top Unmatched LabGuru Tests (need mapping to meta)

- `Routine Urinalysis and Urine Bacterial Culture` (96) – possibly truncation
- `Activated Partial Thromboplastin Time (APTT or PTT` (77) – **missing ")"** (truncation)
- `Activated Clotting Time (ACT` (7) – truncation
- Plus 31 others

### Panel Tests (LabGuru counts as 1 per panel)

- CBC: 3,335
- LFTs: 641
- RFTs: 1,010 + 138 = 1,148
- PT/INR: 198

Labrequest stores **one row per test/panel** as ordered. The "component" counting may happen in a different table (results) when machines post individual analytes.

## Proposed Solution: LabGuru Test Mapping Table

Similar to the meta table and unmatched-tests workflow:

1. **labguru_test_mapping** table:
   - `labguru_testname` (from Labrequest)
   - `canonical_testname` (maps to meta.TestName)
   - `is_panel` (boolean – if true, 1 LabGuru row = 1 test for our count)
   - `component_count` (optional – for reporting: "RFTS = 2 components")

2. **Admin UI**: Side-by-side view
   - Column A: LabGuru test names (from DB, with counts)
   - Column B: Kranium/meta test names (with prices)
   - Admin maps LabGuru → canonical
   - Unmapped go to "unmatched" for resolution

3. **Transform pipeline**: Use mapping before meta lookup
   - Raw TestName → lookup labguru_test_mapping → canonical_testname → meta

4. **Reporting**: Two counts for managers
   - **Dashboard count** (canonical, traceable): What we use
   - **LabGuru-style count** (optional): If we replicate their logic for comparison

## Scripts

```bash
# Compare DB vs scraper for a date
npm run fetch-compare -- 2026-03-08

# Analyze LabGuru vs meta test names (last 90 days)
npm run fetch-analyze-tests -- --days 90 --output logs/test_comparison.csv

# Discover DB schema
npm run fetch-discover
```

## LabGuruV3 Tables (Discovery)

LabGuruV3 has tables that likely drive LabGuru's counting:

| Table | Likely purpose |
|-------|----------------|
| **CountTestsDone**, **CountTestsReqd**, **CountRequested** | Where LabGuru may compute test counts |
| **TestResults**, **TestResultsHeader** | Individual result records (machine-posted) |
| **TestMapping** | Mapping between test names/codes |
| **SubTests** | Panel components (e.g. RFTS → Urea, Creatinine) |
| **RequestedTestsList**, **RequestedTestsStats** | Request-level stats |
| **LabRequestsAll** | May differ from Kranium.Labrequest |

Kranium has only `labrequest` and `consultdoctor`. The component-level counting likely lives in LabGuruV3 (TestResults, SubTests, CountTestsDone).

## Next Steps

1. **Explore CountTestsDone / CountTestsReqd** – understand LabGuru's counting logic
2. **Explore TestMapping, SubTests** – see how panels map to components
3. Implement `labguru_test_mapping` table and admin UI
4. Add trim/normalization for known truncation (e.g. "APTT or PTT" → "APTT or PTT)")
