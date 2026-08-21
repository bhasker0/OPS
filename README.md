# OPS - SaaS Super Admin Operations Portal

A full-stack multi-tenant SaaS Super Admin & Operations platform providing company management, role-based access control (RBAC), multi-tenant user provisioning, transactional ledger, system parameters, and MongoDB-backed audit logging.

---

## 🚀 System Architecture

- **Frontend**: React (Vite, TailwindCSS / Modern CSS, Lucide Icons)
- **Backend API**: Node.js, Express, Prisma ORM
- **Primary Database**: PostgreSQL (Multi-tenant relational schema)
- **Audit Logging**: MongoDB (Flexible, high-throughput change data logging)
- **Containerization & Orchestration**: Docker & Docker Compose

---

## 📂 Project Structure

```
OPS/
├── docker-compose.yml       # Production/Staging multi-container orchestration
├── backend/                 # Express & Prisma Backend API
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma   # PostgreSQL multi-tenant schema
│   │   └── seed.js         # Initial database seed script
│   ├── src/
│   │   ├── routes/         # REST API routes (companies, roles, users, transactions, audit)
│   │   ├── services/       # Audit logger & business services
│   │   ├── db.js           # Prisma client instance
│   │   └── server.js       # Express server entry point
│   └── package.json
└── frontend/                # React Vite Frontend SPA
    ├── Dockerfile
    ├── nginx.conf          # Production Nginx reverse proxy / static server
    ├── src/
    │   ├── App.jsx         # Operations Portal dashboard & views
    │   └── main.jsx
    └── package.json
```

---

## 🛠️ Quick Start

### 1. Local Development Setup

#### Backend:
```bash
cd backend
npm install
cp .env.example .env
npx prisma db push
npm run seed
npm start
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

### 2. Running with Docker Compose

```bash
docker-compose up -d --build
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- MongoDB: `localhost:27017`
