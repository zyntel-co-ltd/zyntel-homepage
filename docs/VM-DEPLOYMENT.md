# Zyntel Dashboard – VM Deployment Guide

This document describes how to deploy the Zyntel Dashboard on a Windows VM for hospital network access, with auto-restart on reboot and the full data pipeline running every 2 minutes.

## Requirements

- Windows Server or Windows 10/11
- Node.js (LTS)
- Python 3.11 (for fetch and timeout scripts)
- PostgreSQL database
- Network: hospital LAN (e.g. 192.168.10.0/24)

## VM Network

- **VM IP:** 192.168.10.198
- **Subnet:** 255.255.255.0
- **Gateway:** 192.168.10.1
- **Access:** Production at `http://192.168.10.198:5000`, Dev at `http://192.168.10.198:5173`

## 1. Production Environment Setup

### Backend `.env` (production)

Create or update `backend/.env`:

```
PORT=5000
NODE_ENV=production
HOST=192.168.10.198
FRONTEND_URL=http://192.168.10.198:5000
DATABASE_URL=postgresql://...
JWT_SECRET=...
# LIMS_*, SOURCE_FOLDER (Z: or network path), etc.
```

### Build and run manually (test)

```powershell
cd C:\path\to\zyntel-dashboard
scripts\start-production.bat
```

Or step by step:

```powershell
cd zyntel-dashboard
npm run build --prefix frontend
cd backend
npm run build
set NODE_ENV=production
npm start
```

## 2. Auto-Start on VM Reboot (Task Scheduler)

1. Open **Task Scheduler** (taskschd.msc)
2. **Create Task**
3. **General:**
   - Name: `Zyntel Dashboard`
   - Run whether user is logged on or not (or “Run only when user is logged on” for testing)
   - Run with highest privileges (optional)
4. **Triggers:** New → Begin the task: **At startup**
5. **Actions:** New → Action: **Start a program**
   - Program/script: `C:\path\to\zyntel-dashboard\scripts\start-production.bat`
   - Start in: `C:\path\to\zyntel-dashboard`
6. **Conditions:** Uncheck “Start the task only if the computer is on AC power” if needed
7. **Settings:** Allow task to be run on demand; Configure for Windows 10/11

## 3. Windows Firewall (Hospital Network Only)

Restrict access to the hospital subnet (192.168.10.0/24):

1. Open **Windows Defender Firewall with Advanced Security**
2. **Inbound Rules** → **New Rule**
3. **Port** → TCP → Specific local ports: `5000, 5173` (5000 = prod, 5173 = dev)
4. **Allow the connection**
5. **Profile:** Domain, Private (as needed)
6. **Name:** Zyntel Dashboard
7. Edit the rule → **Scope** → Remote IP: **These IP addresses** → Add `192.168.10.0/24`

Or via PowerShell (run as Administrator):

```powershell
New-NetFirewallRule -DisplayName "Zyntel Dashboard" -Direction Inbound -Protocol TCP -LocalPort 5000,5173 -RemoteAddress 192.168.10.0/24 -Action Allow
```

## 4. Data Pipeline (Every 2 Minutes)

The backend scheduler runs every 2 minutes:

1. Fetch from LIMS (`fetch-data`)
2. Timeout scan (`timeout`)
3. Transform (`transform:full`)
4. Ingest encounters + test records (`ingest-old`)
5. Ingest patients (`ingest`)

No extra cron/Task Scheduler setup is needed; it runs with the backend process.

## 5. Dev vs Production

| Environment | Command | URL |
|-------------|---------|-----|
| **Dev** | `npm run dev` (from project root) | `http://192.168.10.198:5173` |
| **Prod** | `scripts\start-production.bat` or Task Scheduler | `http://192.168.10.198:5000` |

In production, the backend serves the built frontend; no separate frontend server is required.

## 6. Load-All Command

To run the full pipeline manually (fetch → timeout → transform → ingest):

```powershell
cd zyntel-dashboard\backend
npm run load-all
```

## 7. Troubleshooting

- **App not reachable:** Check firewall rules and that `HOST` is set correctly in `.env`
- **Pipeline fails:** Check Python path (`py -3.11`), LIMS URL, database URL, and Z: / network share for timeout script
- **Port in use:** Change `PORT` in `backend/.env`
