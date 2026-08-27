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

### 2. Multi-Container Orchestration (Docker Compose)

The OPS platform uses Docker Compose to orchestrate PostgreSQL 16 (Relational Store), MongoDB 7 (Audit Document Store), the Express Backend API, and the React Vite Frontend SPA in an isolated bridge network (`ops-network`).

#### Architecture & Topology:
- **`ops-postgres`**: PostgreSQL 16 Alpine on port `5432` with named volume `ops_postgres_data` and automatic `pg_isready` health check.
- **`ops-mongo`**: MongoDB 7 Jammy on port `27017` with named volume `ops_mongo_data` and `mongosh` admin ping health check.
- **`ops-backend`**: Node.js 20 Express + Prisma API on port `5000`, strictly awaiting database health checks.
- **`ops-frontend`**: Nginx-served React 18 SPA on port `5173`.

#### Start Services:
```bash
docker compose up -d --build
```

#### Run Orchestration QA Test Suite:
```bash
node test_orchestration_qa.js
```

#### Teardown Services:
```bash
docker compose down
```
*(To remove persistent database volumes as well, use `docker compose down -v`)*
