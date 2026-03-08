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

- Add a **direct read-only LIMS connection** in addition to the current Python fetch agent
- Use read-only credentials for safety
- Reduce dependency on the Python agent pipeline

### 3.2 Qrcode Scanning & Patient Results Progress

- **qrcode scanning** entry point
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
- View for that test: numbers, performance, revenue, TAT across lab sections (keeping in mind that test timein and timeout are same as receive time and result time respectively which are got from user interaction buttons, receive and result respectively on the reception table page)
- Single test-centric analytics view where we can use all filters and kpis but for one test (i.e, total number of cbc, revenue, best day, filter by date, laboratory, shift, then also delayed, ontime and other metrics as they are at patient level.)

### 3.6 Test Cancellation with Reasons

- Implement and add a button among the buttons on reception table page for cancelling tests with reasons
- track those reasons and quantify them in admin panel where we shall have staff performances analytics, tests cancellations analytics.
- Allow cancellation of tests with a **reason** (e.g. duplicate, wrong sample, patient request)
- Store reason for audit and analytics
- Surface in dashboards and reports

### 3.7 Staff Performance Measurement

- We first log all user interactions, then know who received what and who resulted what, compare that to the total workload
- Track and report **staff performance** (tests completed, TAT, cancellations, etc.)
- Support for reviews and filtering by lab section

### 3.8 User Password Resetting

- **User-initiated** password reset flow
- Admin-assisted reset (already present in Admin > Users)
- Secure token/email-based reset if possible in the hospital environment
- password visibility toggle everywhere a password appears including admin panel

---

