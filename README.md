# Zyntel Dashboard

Laboratory management system for Nakasero Hospital Laboratory.

## Features

- **Revenue Analytics**: Track daily, monthly, and quarterly revenue with real-time charts
- **Reception Management**: Manage test requests, mark urgent tests, track cancellations
- **Metadata Management**: CRUD operations for test names, prices, TAT, and lab sections
- **LRIDS**: Real-time laboratory report information display for waiting areas
- **Admin Panel**: User management, unmatched test logging, settings configuration
- **Role-Based Access**: Admin, Manager, Technician, and Viewer roles

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (Neon)
- Socket.io for real-time updates
- JWT authentication
- Node-cron for scheduled tasks

### Frontend
- React + TypeScript
- Tailwind CSS
- Recharts for data visualization
- Socket.io client
- Vite

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL database (Neon recommended)
- Python 3.8+ (for data processing scripts)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (use `.env.example` as template):
```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
PORT=5000
FRONTEND_URL=http://localhost:5173
```

4. Run migrations:
```bash
npm run migrate
```

5. Start development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. **You must run both backend and frontend** for the dashboard to work. The frontend (port 5173) proxies `/api` to the backend (port 5000). If you see **404** for `/api/numbers`, `/api/tat`, `/api/tests`, etc., the backend is not running.

   **Option A** – From the project root (run both in one terminal):
   ```bash
   npm install
   npm run dev
   ```
   **Option B** – Two terminals:
   ```bash
   # Terminal 1
   cd backend && npm run dev
   # Terminal 2
   cd frontend && npm run dev
   ```

5. Open browser at `http://localhost:5173`

### Default Login

- **Username**: `admin`
- **Password**: `admin123`

## Data Processing

The system uses Python scripts to process data:

1. **timeout.py**: Scans Z: drive for result files
2. **ingest.ts**: Imports data from data.json to PostgreSQL
3. **transform.ts**: Matches timeout records and calculates TAT

These run automatically every 5 minutes via the scheduler.

## Project Structure
```
zyntel-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Socket.io config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions
│   ├── scripts/             # Data processing scripts
│   └── migrations/          # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utilities
│   └── public/              # Static assets + data files
└── shared/
    └── types/               # Shared TypeScript types
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/users` - Get all users
- `POST /api/auth/users` - Create user
- `PUT /api/auth/users/:id` - Update user
- `DELETE /api/auth/users/:id` - Delete user

### Revenue
- `GET /api/revenue` - Get revenue data with filters
- `GET /api/revenue/lab-sections` - Get available lab sections

### Reception
- `GET /api/reception` - Get test records
- `PUT /api/reception/:id/status` - Update test status
- `POST /api/reception/:id/cancel` - Cancel test
- `POST /api/reception/bulk-update` - Bulk update tests

### Metadata
- `GET /api/metadata` - Get all test metadata
- `POST /api/metadata` - Create test metadata
- `PUT /api/metadata/:id` - Update metadata
- `DELETE /api/metadata/:id` - Delete metadata

### Admin
- `GET /api/admin/unmatched-tests` - Get unmatched tests
- `POST /api/admin/unmatched-tests/:id/resolve` - Resolve unmatched test
- `GET /api/admin/stats` - Get dashboard stats

### Settings
- `GET /api/settings/monthly-target` - Get monthly revenue target
- `POST /api/settings/monthly-target` - Set monthly revenue target

## Production Deployment

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Build backend:
```bash
cd backend
npm run build
```

3. Set production environment variables
4. Run migrations on production database
5. Start server: `npm start`

## License

Proprietary - Zyntel © 2025