# Running Zyntel Dashboard – Development & Production

## Build Errors Fixed

- **PORT type**: `process.env.PORT` is a string; now parsed with `Number(process.env.PORT) || 5000`
- **Import casing**: `lridsController` → `LRIDSController`, `metadataController` → `MetadataController`
- **Start path**: Compiled output is `dist/src/server.js` (not `dist/server.js`)

---

## Dev vs Production – How Changes Are Isolated

| | Development | Production |
|---|-------------|------------|
| **What runs** | Vite (frontend) + nodemon (backend) | Single Node process serves built frontend + API |
| **Code** | Same source code | Same source, but **built** before running |
| **Isolation** | Dev uses port 5173 (frontend) + 5001 (backend) | Prod uses port 5000 only |
| **Changes** | Live reload; edits show immediately | No live reload; must rebuild and restart |

**Dev changes do NOT affect production until you:**
1. Build (frontend + backend)
2. Restart the production process (or let Task Scheduler run `start-production.bat` after a fresh pull)

Production only runs the **built** output (`frontend/dist`, `backend/dist`). Until you run `scripts\start-production.bat` (or equivalent) again, production keeps serving the old build.

---

## Development

Runs backend (nodemon) and frontend (Vite) together with hot reload.

### Start

```powershell
cd C:\Users\TempAdmin\zyntel\zyntel-dashboard
npm run dev
```

### URLs

- **Frontend:** http://localhost:5173  
- **Backend API:** http://localhost:5001 (Vite proxies `/api` to it)

### Backend .env (development)

**Important:** Backend must run on port **5001** to match the Vite proxy.

```
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
# DATABASE_URL, JWT_SECRET, etc.
# Do NOT set HOST
```

---

## Production

Single process: backend serves the built frontend and API.

### Build & Start

```powershell
cd C:\Users\TempAdmin\zyntel\zyntel-dashboard
scripts\start-production.bat
```

Or manually:

```powershell
cd C:\Users\TempAdmin\zyntel\zyntel-dashboard

# 1. Build frontend
npm run build --prefix frontend

# 2. Build and start backend
cd backend
$env:NODE_ENV="production"
npm run build
npm start
```

### Backend .env (production)

```
PORT=5000
NODE_ENV=production
HOST=192.168.10.198
FRONTEND_URL=http://192.168.10.198:5000
# DATABASE_URL, JWT_SECRET, LIMS_*, etc.
```

### URL

- **App:** http://192.168.10.198:5000 (or http://localhost:5000 on the VM)

---

## Vite Proxy (Development)

Frontend proxies `/api` to the backend. In `frontend/vite.config.ts`:

```ts
proxy: {
  '/api': { target: 'http://localhost:5001', changeOrigin: true }
}
```

---

## Deploying to Production (When Ready to Push)

1. **Commit and push** to your repo:
   ```powershell
   cd C:\Users\TempAdmin\zyntel\zyntel-dashboard
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **On the VM**, pull and rebuild:
   ```powershell
   cd C:\Users\TempAdmin\zyntel\zyntel-dashboard
   git pull origin main
   scripts\start-production.bat
   ```

3. **If using Task Scheduler** to auto-start: the task runs `start-production.bat`, which builds and starts. To deploy new code, either:
   - Run `scripts\start-production.bat` manually after `git pull`, or
   - Create a separate "deploy" task that does `git pull` then `start-production.bat`.

4. **If using NSSM** (or similar): NSSM only runs `node dist/src/server.js`. You must run `start-production.bat` (or at least `npm run build` in frontend and backend) before restarting the service, so the new build is used.
