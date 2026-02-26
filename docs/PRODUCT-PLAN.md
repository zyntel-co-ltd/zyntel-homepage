# Zyntel Dashboard – Product Plan

## 1. Where We Came From: `Nakasero_Hospital/`

- **Flask-based** lab analytics application
- Python agents for LIMS fetching, transform, ingest
- Direct PostgreSQL storage of raw lab records (encounters, test records, invoices)
- Deployed on hospital local network
- Users: lab staff, managers, administrators

---

## 2. Where We Are: `zyntel-dashboard/`

- **React + Node.js** full-stack rewrite
- Real-time updates via Socket.io
- Role-based access (admin, manager, technician, viewer)
- Dashboards: Revenue, Tests, Numbers, TAT, Progress, Tracker, Performance
- Meta table for test configuration (section, TAT, price)
- Unmatched tests workflow for new tests from LIMS
- Runs on hospital local network (192.168.x.x)
- Scheduled LIMS fetch; manual or automated ingest

---

## 3. Where We’re Going

### 3.1 Direct LIMS Access (Read-Only)

- Add a **direct read-only LIMS connection** in addition to (or replacing) the current Python fetch agent
- Use read-only credentials for safety
- Reduce dependency on the Python agent pipeline

### 3.2 Barcode Scanning & Patient Results Progress

- **Barcode scanning** entry point
- Patient-facing page: enter **lab number** and view **results progress** (status, stage in workflow)
- Page must be **internet-accessible** (separate route/host)
- Rest of the app stays **hospital-local only**

### 3.3 Invoice Numbers: Match Only, No Storage

- Stop storing invoice numbers as persistent data
- Use invoice numbers **only for matching** (e.g. timeout / completeness)
- Discard after use; do not keep in long-term storage

### 3.4 Data Purging & Aggregated Metrics

- **Purge raw lab numbers** after a configurable window (recommended: **3 months**)
- **Retain aggregated data** in dedicated **Metrics tables**
- Refactor charts and reports to query **Metrics** (and similar aggregates) instead of raw records
- Enables longer-term reporting without unbounded storage growth

### 3.5 Test-Level Analytics

- Search/filter **by test** (e.g. “HB”, “Urea”)
- View for that test: numbers, performance, revenue, TAT across lab sections
- Single test-centric analytics view

### 3.6 Staff Performance Measurement

- Track and report **staff performance** (tests completed, TAT, cancellations, etc.)
- Support for reviews and workload balancing

### 3.7 Test Cancellation with Reasons

- Allow cancellation of tests with a **reason** (e.g. duplicate, wrong sample, patient request)
- Store reason for audit and analytics
- Surface in dashboards and reports

### 3.8 User Password Resetting

- **User-initiated** password reset flow
- Admin-assisted reset (already present in Admin > Users)
- Secure token/email-based reset if possible in the hospital environment

---

## 4. Summary Roadmap

| Priority | Initiative | Notes |
|----------|------------|-------|
| Near-term | Direct LIMS (read-only) | Reduce agent dependency |
| Near-term | Invoice numbers: match-only, no storage | Storage and privacy cleanup |
| Medium | Barcode + patient results page (internet) | New public-facing feature |
| Medium | Metrics tables + purging (3-month window) | Data lifecycle, scalability |
| Medium | Test-level analytics | Deeper analytical capability |
| Medium | Test cancellation with reasons | Workflow and audit |
| Medium | User password resetting | Self-service and security |
| Medium | Staff performance measurement | HR and operations insights |
