# OPS Super Admin Development Guidelines

- **Stack**: Express.js, Prisma ORM, PostgreSQL (Multi-tenant relational), MongoDB (Audit Logs), React (Vite).
- **Tenant Management**: Super admin manages companies, dynamic roles, user assignments, system parameters.
- **Audit Requirement**: Every mutation in company, role, user, or parameter must log an asynchronous audit document to MongoDB.
