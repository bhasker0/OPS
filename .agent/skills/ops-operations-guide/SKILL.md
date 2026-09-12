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

## Standard AI Agent Execution Protocol (5-Step Lifecycle)
All engineering tasks must strictly execute the following steps in sequence:
1. **Step 1: Deep Analysis & Clarification**: Inspect codebase structure, identify affected modules, surface assumptions, and clarify ambiguities before touching code (*Karpathy Rule #1*).
2. **Step 2: Implementation Planning & File Mapping**: Enforce Right Slide-Over Drawers (zero centered modals), dynamic i18n single-language standard, multi-tenant `x-company-id` scoping, and map explicit `[NEW]`/`[MODIFY]`/`[DELETE]` target files.
3. **Step 3: Jira Ticket Orchestration**: Generate Jira Story/Task and Subtasks under `SCRUM` with mandatory engineering defaults and Definition of Done (*Jira Skill*).
4. **Step 4: Sequential Incremental Execution**: Work on one ticket at a time in `In Progress` status, making surgical, minimal edits (*Karpathy Rules #2 & #3*).
5. **Step 5: Rigorous QA & Verification per Ticket**: Run frontend builds (`0 errors`), backend QA test suites (`100% pass`), and DevTools UI checks before transitioning the ticket to `Done`.

