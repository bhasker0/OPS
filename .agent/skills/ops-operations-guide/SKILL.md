---
name: ops-operations-guide
description: Expert workflow and coding standards for the OPS SaaS Super Admin platform (Express, Prisma, PostgreSQL, MongoDB, React).
---

# OPS Platform Development & Operational Guide

## Key Responsibilities
- Manage multi-tenant company lifecycle (Onboarding, Status toggles, Configs).
- Maintain dynamic RBAC permissions and system parameters.
- Provide real-time audit log streaming backed by MongoDB.

## Best Practices
- Ensure all Prisma operations handle relational cascades correctly.
- Always sanitize input parameters and prevent cross-tenant leakage.
