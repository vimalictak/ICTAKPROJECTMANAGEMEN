<div align="center">
  <img src="https://via.placeholder.com/80x80/4f46e5/ffffff?text=PF" alt="ProjectFlow Logo" width="80" height="80" style="border-radius:12px"/>
  <h1>ProjectFlow Enterprise</h1>
  <p><strong>A production-ready, full-stack project management platform built with the MERN stack.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white" />
    <img src="https://img.shields.io/badge/License-MIT-blue" />
  </p>
</div>

---

## ✨ Features

### Core
- **Kanban Board** — Drag-and-drop tasks across customizable columns with real-time sync
- **Sprint Management** — Plan, start, complete sprints with burndown charts
- **Backlog** — Prioritize and move issues into sprints
- **Stories & Epics** — Group tasks into user stories
- **Task Management** — Rich task editor: subtasks, checklists, time logging, file attachments, comments
- **Calendar View** — Visualize deadlines in month/week calendar
- **Reports & Analytics** — Velocity charts, workload distribution, burndown analysis

### Platform
- **Real-time Collaboration** — Socket.IO powers live board updates, typing indicators, and presence
- **Role-Based Access Control** — super-admin / admin / manager / developer / qa / client / viewer
- **Multi-Organization** — Isolated workspaces per organization
- **Dark Mode** — Full dark/light theme toggle
- **Command Palette** — ⌘K global search and navigation
- **Notification System** — In-app + email notifications for mentions, deadlines, assignments
- **Audit Log** — Immutable audit trail with 1-year TTL
- **File Uploads** — Avatars, task attachments, feedback screenshots (Multer)
- **Google SSO** — OAuth 2.0 via Passport.js
- **API Documentation** — Swagger UI at `/api-docs`

---

## 🏗 Architecture

```
projectflow/
├── backend/                 # Express.js API
│   └── src/
│       ├── config/          # DB, logger, passport, swagger, multer
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, RBAC, error handling, validation
│       ├── models/          # Mongoose models
│       ├── routes/          # Express routers
│       ├── services/        # Email, notifications
│       ├── socket/          # Socket.IO handlers
│       ├── jobs/            # Cron jobs (deadlines, sprint reminders)
│       ├── utils/           # Seed script
│       ├── app.js
│       └── server.js
│
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── api/             # Axios client + all service modules
│       ├── components/
│       │   ├── ui/          # Design system (Button, Card, Modal, Table…)
│       │   ├── layout/      # Sidebar, TopNav, AppLayout
│       │   └── common/      # CommandPalette
│       ├── features/        # Feature-sliced modules
│       │   ├── auth/        # Login, Register, ForgotPw, Reset, Verify
│       │   ├── dashboard/   # Stats, charts, recent items
│       │   ├── projects/    # List, Detail, Kanban, Backlog, Settings
│       │   ├── tasks/       # Table view + TaskModal
│       │   ├── sprints/     # Sprint list + detail + burndown
│       │   ├── calendar/    # Month/week calendar
│       │   ├── reports/     # Overview, velocity, workload charts
│       │   ├── users/       # Team management
│       │   ├── notifications/# Notification center + Settings + Feedback + Stories
│       │   └── profile/     # User profile + security
│       ├── hooks/           # useSocket, useQuery, useMutation
│       ├── lib/             # utils, constants
│       └── store/           # Redux Toolkit slices
│
├── deployment/
│   ├── nginx/               # nginx.conf (production)
│   ├── docker/              # Dockerfile.backend, Dockerfile.frontend
│   └── github-actions/      # ci-cd.yml
│
├── docker-compose.yml
├── ecosystem.config.js      # PM2 config
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+ (local or Atlas)
- Redis 7+ (optional, for sessions/cache)
- Git

### 1. Clone & install

```bash
git clone https://github.com/yourname/projectflow.git
cd projectflow

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET

# Frontend
cp frontend/.env.example frontend/.env.local
# Usually no changes needed for local dev
```

### 3. Seed the database

```bash
cd backend
NODE_ENV=development node src/utils/seed.js
```

This creates demo users:

| Role        | Email                        | Password   |
|-------------|------------------------------|------------|
| Super Admin | superadmin@projectflow.dev   | Admin@1234 |
| Admin       | alice@projectflow.dev        | Admin@1234 |
| Developer   | bob@projectflow.dev          | Admin@1234 |
| QA          | carol@projectflow.dev        | Admin@1234 |
| Client      | client@projectflow.dev       | Admin@1234 |

### 4. Start development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000, proxied to 5000)
cd frontend && npm run dev
```

Open **http://localhost:3000** and log in with any demo account.

API docs available at **http://localhost:5000/api-docs**

---

## 🔧 Configuration Reference

### Backend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Access token signing secret (64+ chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing secret (64+ chars) |
| `CLIENT_URL` | ✅ | Frontend URL (CORS) |
| `EMAIL_HOST` | ✅ | SMTP host |
| `EMAIL_USER` | ✅ | SMTP username |
| `EMAIL_PASS` | ✅ | SMTP password or app password |
| `GOOGLE_CLIENT_ID` | ❌ | For Google OAuth SSO |
| `GOOGLE_CLIENT_SECRET` | ❌ | For Google OAuth SSO |
| `REDIS_URL` | ❌ | Redis for rate limiting / cache |

---

## 🐳 Docker Deployment

```bash
# Copy and configure environment
cp backend/.env.example .env
# Edit .env with production values

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Seed the database
docker compose exec backend node src/utils/seed.js
```

---

## 🌐 Production Deployment (Ubuntu + Nginx)

### 1. Server setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
# Follow: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Application setup

```bash
# Create app directory
sudo mkdir -p /var/www/projectflow
sudo chown $USER:$USER /var/www/projectflow
cd /var/www/projectflow

# Clone repo
git clone https://github.com/yourname/projectflow.git .

# Install dependencies
cd backend && npm ci --only=production
cd ../frontend && npm ci && npm run build
```

### 3. Configure Nginx

```bash
sudo cp deployment/nginx/nginx.conf /etc/nginx/sites-available/projectflow
# Edit nginx.conf: replace yourdomain.com with your actual domain
sudo ln -s /etc/nginx/sites-available/projectflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Certbot auto-renews; verify:
sudo certbot renew --dry-run
```

### 5. Start with PM2

```bash
# Create log directory
mkdir -p /var/www/projectflow/logs

# Start application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
# Run the command it outputs to enable startup on reboot
```

---

## 📡 API Overview

All endpoints are prefixed with `/api/v1/`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/forgot-password`, `PATCH /auth/reset-password/:token`, `GET /auth/verify-email/:token`, `GET /auth/google` |
| Projects | CRUD `/projects`, members `/projects/:id/members` |
| Tasks | CRUD `/tasks`, comments `/tasks/:id/comments`, attachments `/tasks/:id/attachments` |
| Sprints | CRUD `/sprints`, `/sprints/:id/start`, `/sprints/:id/complete` |
| Stories | CRUD `/stories` |
| Users | CRUD `/users`, avatar `/users/:id/avatar` |
| Organizations | CRUD `/organizations` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Reports | `/reports/overview`, `/reports/velocity`, `/reports/workload`, `/reports/burndown` |
| Search | `GET /search?q=` |
| Audit | `GET /audit` |
| Feedback | CRUD `/feedback` |
| Files | `POST /files/upload`, `DELETE /files/:id` |

Full interactive docs: **[/api-docs](http://localhost:5000/api-docs)**

---

## 🔌 Real-time Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `task:update` | Server→Client | Task field changed |
| `task:move` | Bidirectional | Task dragged to new column |
| `task:create` | Server→Client | New task created in project |
| `task:delete` | Server→Client | Task removed |
| `sprint:update` | Server→Client | Sprint status changed |
| `notification:new` | Server→Client | New notification for user |
| `user:typing` | Bidirectional | User typing in task comment |
| `user:presence` | Server→Client | User online/offline status |

---

## 🛡 Security

- JWT access tokens (15m) + refresh tokens (7d) with rotation & reuse detection
- Bcrypt password hashing (cost factor 12)
- Helmet.js security headers
- Rate limiting (100 req/15min general, 20 req/15min auth)
- MongoDB query sanitization (mongo-sanitize)
- XSS protection (xss-clean)
- CORS configured to specific origins
- RBAC enforced on every protected route
- Soft deletes — data never permanently removed without audit

---

## 🧰 Tech Stack

**Backend:** Node.js · Express.js · MongoDB (Mongoose) · Socket.IO · Passport.js · JWT · Multer · Nodemailer · node-cron · Winston · Swagger

**Frontend:** React 18 · Vite · Redux Toolkit · React Router v6 · Tailwind CSS · Framer Motion · @dnd-kit · Recharts · React Hook Form · Zod · Axios · Socket.IO Client · Lucide React · date-fns

**DevOps:** Docker · Docker Compose · Nginx · PM2 · GitHub Actions · Let's Encrypt

---

## 📄 License

MIT © 2024 ProjectFlow Enterprise
