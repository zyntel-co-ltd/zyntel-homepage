# How to test the in-memory pipeline

## Prerequisites

1. **Backend env and DB**
   - `backend/.env` has `DATABASE_URL` (PostgreSQL).
   - Migrations are applied (`npm run migrate` etc. from backend if needed).

2. **LIMS (for full run)**
   - `backend/.env` has `LIMS_URL`, `LIMS_USERNAME`, `LIMS_PASSWORD`.
   - LIMS is reachable (e.g. `http://192.168.10.84:8080` on your network).

3. **Reference files (for transform)**
   - `frontend/public/meta.csv` – test metadata (TestName, TAT, LabSection, Price). If missing, transform still runs but uses defaults.
   - `frontend/public/TimeOut.csv` – optional; created/updated by the timeout script (Z: drive scan). If missing, time-out fields are defaulted.

4. **Python**
   - Python 3.11 available as `py -3.11` (or adjust `package.json` scripts if you use `python` / `python3`).

---

## 1. Run the pipeline once

From the **backend** directory:

```bash
cd backend
npm run pipeline
```

You should see something like:

1. **Step 1: Fetching from LIMS** – Python script logs, then exits. It writes `frontend/public/data.json`.
2. **Step 2: Timeout** – Scans Z: (or configured folder), updates TimeOut.csv. May warn if folder is missing.
3. **Step 3: Loading raw data** – Reads `data.json`, then **deletes** it. Logs “Loaded N records; data.json removed.”
4. **Step 4: Transform** – Logs “Patients: X, Tests: Y.”
5. **Step 5–8: Ingest** – Encounters, patients, sync encounters, test records. Each step logs progress.
6. Final line: “In-memory pipeline completed. No data.json, patients_dataset.json, or tests_dataset.json left on disk.”

---

## 2. Checks that the pipeline behaved correctly

- **No intermediate files left**
  - From repo root:
    - `frontend/public/data.json` – should **not** exist after the run.
    - `frontend/public/patients_dataset.json` – should **not** exist.
    - `frontend/public/tests_dataset.json` – should **not** exist.
  - `meta.csv` and `TimeOut.csv` may exist; that’s expected.

- **Database has data**
  - In your DB client or backend script:
    - `SELECT COUNT(*) FROM encounters;`
    - `SELECT COUNT(*) FROM patients;`
    - `SELECT COUNT(*) FROM test_records;`
  - Counts should be non-zero after a successful run that had LIMS data.

- **Dashboard**
  - Start the app (`npm run dev` from repo root), open Revenue, TAT, Numbers, Tracker, etc. They should show data consistent with the DB.

---

## 3. Test idempotency (optional)

Run the pipeline **twice** in a row:

```bash
cd backend
npm run pipeline
npm run pipeline
```

- Second run should complete without errors.
- Row counts in `encounters`, `patients`, and `test_records` should not double (upserts update existing rows).
- Again, `data.json` / `patients_dataset.json` / `tests_dataset.json` should not be present after each run.

---

## 4. If LIMS or Z: is unavailable

- **Fetch fails (Step 1)**  
  Pipeline exits at Step 1. Fix LIMS URL/credentials or network, then re-run.

- **No data.json after fetch**  
  If the fetcher finds no new data it may not write `data.json`. Pipeline will exit at Step 3 with “data.json not present (e.g. no new data). Exiting pipeline.” That’s normal.

- **Timeout script fails (Step 2)**  
  Logged as non-fatal. Pipeline continues; TimeOut-related fields may be defaulted.

- **DB not reachable**  
  Ingest steps will throw. Fix `DATABASE_URL` and connectivity, then re-run.

---

## 5. Scheduler (5‑minute cron)

When the backend server is running, the scheduler runs the same pipeline every 5 minutes:

- No need to run `npm run pipeline` by hand for ongoing sync.
- To test the scheduler: start backend (`npm run dev` from repo root or `npm run dev` in backend), wait a few minutes, and check logs for “Running in-memory data pipeline” and “In-memory pipeline completed.”

---

## Quick reference

| Command        | Where   | Purpose                    |
|----------------|---------|----------------------------|
| `npm run pipeline` | backend | Run full pipeline once     |
| `npm run fetch-data` | backend | Fetch only (writes data.json) |
| `npm run timeout`   | backend | Update TimeOut.csv only   |
| `npm run verify-data` | backend | Check DB counts (optional) |
