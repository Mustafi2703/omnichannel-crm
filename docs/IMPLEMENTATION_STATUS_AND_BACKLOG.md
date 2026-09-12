# Implementation Status and Delivery Backlog

**Last reviewed:** 19 August 2026
**Purpose:** Durable working baseline for the client delivery. Read this with the
system design and 10-day delivery plan before starting a feature.

## Current state

The repository is a **build-verified demo**, not a production-ready launch.

### Verified engineering baseline

- Node/npm setup is reproducible with `npm ci`; an ignored project-local npm
  cache prevents a bad user-level cache affecting other worktrees.
- `scripts/setup-local.ps1` copies the shared local environment into a
  worktree's ignored `.env`.
- GitHub Actions runs clean install, lint, type-check, and production build.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass locally.
- Next.js is patched at `15.5.21`; do not downgrade it to the old `15.2.4`.

### Working demo capabilities

- Cookie/JWT login and seeded Owner, Admin, and Agent accounts.
- Core PostgreSQL/Prisma domain models for tenant, contacts, leads,
  conversations, messages, tasks, knowledge documents, and usage events.
- Dashboard, contacts list, leads list/search/stage move, task list/completion,
  cost dashboard, and Turkish/English UI.
- Website chat demo creates contact, conversation, messages, and a lead;
  captures UTM/gclid fields.
- Inbox can read threads, send agent/bot messages, and hand off conversations.
- OpenAI response path with rule-based fallback; basic AiSensy webhook/send
  adapter in demo mode.
- Render demo configuration and database health endpoint.

## Priority delivery backlog

### P0 — Knowledge base / RAG (client-requested)

1. Enable PostgreSQL `pgvector` and add `knowledge_chunks` with tenant scope,
   document relation, content, token count, metadata, and vector index.
2. Add knowledge document CRUD plus text/PDF/DOCX ingestion.
3. Create background ingestion: extract, sanitize, chunk, embed, persist,
   re-index, and report failure states.
4. Retrieve top relevant chunks per incoming message; pass only those plus recent
   history to the model.
5. Return source citations, confidence/low-context fallback, and human handoff.
6. Store model, tokens, latency, and cost; add tests for chunking/retrieval.

### P0 — Security and correctness

- Enforce Owner/Admin/Agent permissions on every API route.
- Validate all inputs with Zod and use a consistent API error shape.
- Redis-backed distributed rate limiting and tenant-configured widget origins
  are implemented; exercise both paths against the Compose Redis service before
  deployment.
- Correct outbound WhatsApp failure handling; do not store a failed send as sent.
- Implement contact identity resolution/merge for web and WhatsApp identities.
- Add audit logs; encrypt integration credentials; prevent PII-rich production
  logs.
- Implement KVKK export and anonymize/delete actions for Owner/Admin.

### P1 — Real CRM and inbox workflows

- Contact CRUD/detail, lead CRUD/detail, notes, tags, owners, lost reasons,
  configurable pipeline, and follow-up dates.
- Task CRUD/assignment and follow-up/SLA automation.
- Inbox filters, assignment, close/reopen, delivery states, attachments, and
  CRM context are implemented; validate the documented browser regression flow
  against PostgreSQL/Redis before acceptance.
- Realtime dashboard/inbox summaries and in-app notifications through SSE.
- Resend email notifications and in-app notification records.
- Automation rules/run log for assignment, qualification tagging, and SLA,
  including BullMQ retry/dead-letter visibility.
- Enforce WhatsApp's 24-hour customer-service window in the agent composer:
  outside the window, agents must select an approved template rather than send
  free-form text.
- Add scheduled call/demo events linked to the lead, contact, and conversation;
  show them in a focused follow-up calendar.
- Agent-level automation pause on a contact/conversation, with execution
  retry/failure visibility and persisted audit history.

### P1 — Integrations and economics

- Validate AiSensy live webhook/auth/payload/send behavior with client
  credentials; add template-message support where required.
- Manage the WhatsApp template lifecycle: provider sync, approval/rejection
  status, language/category, variables, buttons, and ownership.
- Add a consent-safe campaign workflow: choose an eligible audience, schedule
  sends, persist durable marketing opt-outs, and report sent/delivered/read/
  click/failed outcomes.
- Add Google Ads attribution records, conversion actions, and campaign-level
  reporting; UTM/gclid capture is already partly present.
- Rate card/budget settings, daily cost aggregates, source/campaign CPL,
  qualified/won cost metrics, and 70%/90% budget alerts.

### P1 — Production operations

- Decide and align the architecture: current single Next.js demo versus the
  documented Next.js + NestJS + Redis/BullMQ stack. Do not claim the documented
  production stack is delivered until it is implemented.
- Docker Compose, VPS, Cloudflare DNS/TLS, reverse proxy, and separate staging
  and production environments.
- Prisma migrations for production; do not initialize production with demo seed
  data or rely on `prisma db push` as the deployment migration strategy.
- Redis readiness endpoint, worker retries/dead-letter visibility, Sentry,
  external uptime monitoring, structured logs, disk alerts.
- Daily Postgres backups with seven-day retention and a documented restore test.
- CI deployment workflow: deploy, migrate, then health-check.

## Client inputs required before launch

- Brand, company name, logo, real users/roles, pipeline stages, timezone, and
  approved Turkish/English copy.
- Production knowledge pack: FAQs, brochures, approved answers, and pricing
  escalation policy.
- EU VPS, domain, Cloudflare access, and widget installation access.
- OpenAI account/key with monthly cap; Resend account and verified DNS sender.
- AiSensy account, verified WhatsApp number, API credentials, and approved
  templates.
- Google Ads/Google Cloud access, conversion actions, UTM/gclid agreement, and
  deal-value process.

## Explicitly out of scope for this launch

- Multi-tenant signup/billing, Instagram/Facebook inbox, raw Meta Cloud API,
  visual workflow designer, deep ERP/HubSpot integrations, Kubernetes, and AWS
  migration.
- Full website behaviour tracking/form discovery, deal product catalogues and
  arbitrary custom fields, and a general saved-report builder. Reassess after
  the core inbox, WhatsApp, follow-up, and cost workflows are operating.

## Reference workflow audit — 19 August 2026

A read-only audit of a comparable authenticated CRM confirmed that the launch
workflow should be: inbound web/WhatsApp conversation → channel/status-filtered
inbox → assignment and AI/human handling → WhatsApp template enforcement when
the customer-service window has expired → lead pipeline and follow-up →
automation/campaign execution → cost and operational reporting.

The audit informed the additions above. It is a behaviour reference only:
OmniCRM must retain its own product design, copy, implementation, and the
single-client launch scope agreed in the delivery decisions.

## Definition of done

For every feature: migration + API + UI where applicable, tenant scope and role
checks, validation, error visibility, automated test or manual test script,
cost logging when billable, and concise operational documentation.
