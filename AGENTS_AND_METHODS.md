# 🛠️ Agent Engineering Guidelines & Project Methods Standard
**Surat Embroidery Micro-ERP (EBTM / ETMS)**

---

## 1. System Architecture & Port Mapping

| Component | Codebase Path | Technology Stack | Port | Primary Responsibility |
|---|---|---|---|---|
| **OPS Backend** | `/mnt/Bhasker/EBTM/OPS/backend` | Express / Node 20 / Postgres / Mongo | `5000` | SaaS Super-Admin, Tenant Provisioning & Global Audit Logs |
| **OPS Frontend** | `/mnt/Bhasker/EBTM/OPS/frontend` | Vite / React 19 / Vanilla CSS | `3000` | Super-Admin Dashboard & Tenant Directory Management |
| **ETMS Backend** | `/mnt/Bhasker/EBTM/ETMS/backend` | NestJS 10 / Sequelize / Redis | `4000` | SAC 9988 Billing, Karigar Hisab, Munim & Tally Engine |
| **ETMS Frontend** | `/mnt/Bhasker/EBTM/ETMS-FE` | Next.js 14.2 / Tailwind / PWA | `3002` | Factory Floor Telemetry, Voice Logger, PWA & Thermal Slips |

---

## 2. Standardized Agent Execution Protocol

All AI agents and developers working on the EBTM project **must strictly adhere** to the following 6-step lifecycle for all tasks:

```mermaid
graph TD
    A[1. Requirement Review] --> B[2. Jira Ticket Creation]
    B --> C[3. Code Implementation]
    C --> D[4. Automated QA & Build Check]
    D --> E[5. Chrome Headless UI Verification]
    E --> F[6. Jira Transition & Client Reporting]
```

### Step 1: Requirement Review
- Review Jira issue summaries, codebase context, and existing Knowledge Items (KIs).
- Cross-reference existing NestJS/Next.js services before creating duplicate logic.

### Step 2: Jira Ticket Creation (Mandatory)
- **Every task or feature MUST be created in Jira** under project key `SCRUM` prior to execution or reporting.
- Jira tickets must include concise summaries, technical specifications, and clear acceptance criteria.

### Step 3: Code Implementation
- Follow domain-driven modular structure (`src/modules/*` in NestJS, `src/app/*` in Next.js).
- Enforce strict tenant isolation (`x-company-id: <UUID>`) on all endpoints.

### Step 4: Automated QA & Build Verification
- Execute `npm test` in `OPS/backend` (must achieve **100% pass rate**).
- Execute `nest build` in `ETMS/backend` and `next build` in `ETMS-FE` to ensure zero compilation warnings or errors.

### Step 5: Chrome Headless UI Verification
- Launch Google Chrome to load the live dev servers (`http://localhost:3000` and `http://localhost:3002`).
- Capture high-resolution screenshot/video artifacts to verify visual design, responsiveness, and backend API connectivity (`:4000 Connected`).

### Step 6: Jira Transition & Final Reporting
- Transition completed Jira tickets to `Done` using the Atlassian API.
- Produce a structured markdown report listing Jira ticket keys, summaries, test metrics, and screenshot references.

---

## 3. UI/UX & Localization Standards

1. **Trilingual Support**: Every floor component must support Gujarati (`gu`), Hindi (`hi`), and English (`en`).
2. **Industrial Tactile UX**: Floor forms must support high-contrast display modes, audio click feedback, haptic vibration, and large touch numeric keypads.
3. **Receipt Printing**: Print output templates must support both standard A4 GST Tax Invoices and 58mm/80mm thermal POS slips.
