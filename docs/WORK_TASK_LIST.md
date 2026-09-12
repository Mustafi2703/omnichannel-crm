# OmniCRM Work Task List

Use this checklist as the active delivery board. The detailed rationale and
scope are in [IMPLEMENTATION_STATUS_AND_BACKLOG.md](./IMPLEMENTATION_STATUS_AND_BACKLOG.md).

## Phase 0 — Delivery baseline

- [x] Repair clean npm install workflow and isolate local npm cache.
- [x] Add reusable local environment bootstrap for worktrees.
- [x] Add CI: install, lint, type-check, production build.
- [x] Upgrade Next.js to patched `15.5.21`.
- [x] Record implementation status and delivery backlog.
- [x] Confirm internal launch scope, acceptance criteria, and delivery order;
      see [Phase 0 delivery decisions](./PHASE_0_DELIVERY_DECISIONS.md).
- [ ] **Client dependency:** replace demo tenant branding, users, and
      credentials after client-approved configuration is received; required
      before staging/UAT.

## Phase 1 — Knowledge base and RAG (client priority)

- [ ] Confirm supported source formats and obtain the client FAQ/brochure pack.
- [x] Add PostgreSQL `pgvector` migration and vector index; deploy against a
      PostgreSQL 16+ instance before use.
- [x] Add Prisma schema for knowledge document metadata and knowledge chunks.
- [x] Build knowledge document CRUD API with tenant and role enforcement.
- [x] Build knowledge management UI: list, upload/paste, status, retry,
      re-index, delete.
- [x] Extract text from plain text, PDF, and DOCX sources.
- [x] Implement chunking, token counting, embeddings, and vector indexing.
- [x] Run post-response knowledge ingestion with retry/failure state; replace
      with durable BullMQ processing in Phase 3/5 production work.
- [x] Retrieve top relevant chunks for each AI message.
- [x] Add retrieved-context grounding and human handoff rule.
- [x] Add displayed source citations and model-latency metadata to message UI.
- [ ] Add automated integration tests against PostgreSQL + pgvector and an
      OpenAI test double.

## Phase 2 — API security and CRM correctness

- [x] Create shared Zod schemas and validate every mutation/webhook payload.
- [x] Standardize API error responses and status codes.
- [x] Enforce Owner/Admin/Agent permissions on all internal API routes.
- [x] Add audit log schema/service for high-impact mutations.
- [x] Add contact CRUD, detail, identity merge, and search/pagination.
- [x] Add lead CRUD/detail: owner, tags, notes, lost reason, values,
      follow-up date, and stage rules.
- [x] Add task CRUD, assignment, and relation to lead/contact/conversation.
- [x] Add pipeline/stage administration for Owner/Admin.
- [x] Add user administration and deactivate-user flow.
- [x] Implement KVKK export and anonymize/delete flows.
- [x] Encrypt integration credentials at rest.

## Phase 3 — Inbox, widget, and automations

- [x] Add schema/migration foundations for conversation automation pause,
      calendar events, WhatsApp templates, campaigns, and campaign recipients.
- [x] Add inbox search/channel/status filters, self-assignment/unassignment,
      close/reopen controls, and visible outbound delivery failure state.
- [x] Add inbox filters, assignment, close/reopen, and conversation detail
      improvements for all agents, including rich contact/lead context and
      documented manual regression coverage in
      [PHASE_3_REGRESSION.md](./PHASE_3_REGRESSION.md).
- [ ] Add reliable outbound delivery states; prevent failed WhatsApp sends from
      appearing as sent; validate the behaviour against the live provider.
- [x] Enforce the WhatsApp 24-hour customer-service window: block free-form
      outbound messages outside the window and present the approved-template
      path with a clear agent explanation. Live template delivery still needs
      the client AiSensy template endpoint and approved template IDs.
- [x] Add attachment/media model and storage policy.
- [x] Build actual embeddable widget package with public tenant key, branding,
      visitor session, and configurable allowed domains.
- [x] Replace the prompt-based demo with an inline embeddable widget and apply
      origin allow-list enforcement from tenant settings/environment config.
- [x] Rate limit and protect public widget, login, and webhook endpoints with
      an atomic Redis counter and a local-development fallback; compose-level
      distributed verification is recorded in the Phase 3 regression script.
- [x] Add dashboard/inbox realtime summaries through an authenticated SSE
      endpoint and inbox subscription; browser-level integration verification
      remains pending.
- [x] Add in-app notification bell, unread state, read actions, and the Resend
      notification service. Real sender-domain delivery verification remains
      pending.
- [x] Add worker jobs for follow-up due/overdue and no-reply SLA scans, with
      BullMQ retry/backoff and retained dead-letter jobs.
- [x] Add the Redis/BullMQ worker implementation for follow-up and no-reply SLA
      scans, a Compose worker service, and Owner/Admin retry/dead-letter
      visibility. It still needs Redis-backed testing.
- [x] Add basic automation rules: assignment, qualification tag, SLA reminder,
      plus execution logs.
- [x] Add rule execution with persisted completed/failed automation-run logs
      and an Owner/Admin rule-management/log-view UI.
- [x] Allow an agent to pause automation for an individual conversation/contact;
      retain retry/error visibility and a persisted audit trail for each
      conversation update.
- [x] Add follow-up calendar/events for scheduled calls and demos, with owner,
      reminder, and lead/contact/conversation links.
- [x] Add calendar-event persistence/API plus an authenticated calendar UI.

## Phase 4 — AiSensy, Ads, and costs

- [ ] Validate live AiSensy webhook signature, inbound payload, send payload,
      and delivery behavior against the client account.
- [ ] Support WhatsApp templates and consent enforcement for marketing messages.
- [ ] Manage the approved-template lifecycle: AiSensy sync, approval/rejection
      state, language/category, variables, buttons, owner, and usable status.
- [x] Add template/campaign/campaign-recipient persistence plus Owner/Admin
      mock-management APIs; campaign creation currently admits only marketing-
      consented, non-paused contacts and approved templates.
- [ ] Add WhatsApp campaign operations: eligible audience selection, scheduling,
      consent/opt-out suppression, and sent/delivered/read/click/failed metrics.
- [ ] Treat a contact's marketing opt-out as a durable suppression across
      campaigns and marketing automations, with an auditable change record.
- [ ] Add Google Ads attribution records and campaign/ad group/keyword fields.
- [ ] Capture and report UTM/gclid consistently across widget/forms/leads.
- [ ] Add Google Ads conversion actions or a documented conversion stub.
- [ ] Add Owner/Admin rate-card and budget settings.
- [ ] Add daily/hourly cost aggregation job.
- [ ] Report CPL by source/campaign and cost per qualified/won lead.
- [ ] Add 70%/90% daily/monthly budget alerts and optional AI soft-limit.

## Phase 5 — Production readiness

- [ ] Decide whether to retain the single Next.js architecture or implement the
      documented NestJS + Redis/BullMQ architecture; update docs to match.
- [x] Add Docker Compose for app, Postgres, Redis, and workers.
- [x] Add Dockerfile and Compose topology for app, PostgreSQL 16 with
      pgvector, Redis, and a separately supervised worker; verified on the
      private staging VPS.
- [ ] Provision EU VPS, Cloudflare DNS/TLS, reverse proxy, and client domains.
- [ ] Create separate staging and production environments/databases.
- [x] Replace `prisma db push` deployment usage with a reviewed baseline Prisma
      migration; validate `prisma migrate deploy` against an empty PostgreSQL
      16 + pgvector database before production use.
- [ ] Prevent demo seed data from initializing production.
- [ ] Add `/ready` for Postgres and Redis readiness.
- [x] Add `/api/ready` with PostgreSQL and Redis probes.
- [ ] Add Sentry, structured request logging, and an external uptime monitor.
- [ ] Add daily database backups, seven-day retention, and restore-drill docs.
- [x] Add a seven-day-retention backup script and operational deploy/restore
      runbook; daily VPS scheduling and a successful restore drill are verified
      on private staging.
- [ ] Add disk-capacity alert and Compose restart policies.
- [ ] Add CI deployment: deploy, migrate, verify health, rollback/runbook.

## Phase 6 — UAT and handoff

- [ ] Load client-approved users, pipeline, brand, FAQs, rate card, and budget.
- [ ] Install widget on client staging site.
- [ ] Execute UAT: widget → inbox → reply → lead → follow-up → AI handoff →
      WhatsApp → cost dashboard.
- [ ] Fix P0/P1 UAT findings.
- [ ] Deliver admin guides, incident/restart/backup runbooks, and hypercare plan.

## Deferred reference-workflow enhancements

These items were identified during a read-only workflow audit of a comparable
CRM. They are useful, but are not part of the agreed single-client launch
unless the client reprioritizes them.

- [ ] Website behaviour tracking: visitor sessions, page events, and form
      discovery/matching to contacts and leads.
- [ ] Deal products/line items and client-configurable custom fields.
- [ ] Saved operational reports for team activity, pipeline conversion, and
      campaign performance beyond the agreed cost/CPL views.
- [ ] Multiple boards/workspaces. The launch remains one client workspace.
- [ ] Visual automation canvas. Keep the launch implementation rule-based.

## Rules for every task

- [ ] Tenant-scoped and role-checked.
- [ ] Input validated and errors observable.
- [ ] Migration/API/UI included where applicable.
- [ ] Automated test or repeatable manual test documented.
- [ ] Billable work logs usage/cost.
- [ ] Docs updated if the feature has an operational impact.
