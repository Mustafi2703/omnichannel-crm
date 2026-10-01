# Implementation Plan — Client Scope + Security & Bug Fixes

Status: **planning document — no code has been changed.** This turns
`docs/CLIENT_DELIVERY_PLAN.md` (phasing, verified against live staging) and
`docs/SECURITY_AND_TESTING_REVIEW.md` (21 findings) into one sequenced,
file-level implementation plan, plus the two extra bugs found while testing
staging (widget error leak, duplicate widget-settings requests).

Each phase lists: what changes, which files, and what "done" looks like. Do
not start a phase until the previous one's "Definition of done" is met —
phases are ordered by dependency and risk, not just client-stated order.

**Cross-cutting rule for every phase below:** no automated tests exist in
this project today. Every phase that touches business logic (not pure UI
styling) adds at least one test for what it changed, using the framework
stood up in Phase 0. This is the project's own stated "definition of done"
(`docs/IMPLEMENTATION_STATUS_AND_BACKLOG.md:147`) — Phase 0 is what makes it
possible to actually follow it.

---

## Phase 0 — Stop the bleeding (security + quick bug fixes)

Staging has real client logins on it now (`erdinc.astar@…`,
`fatih.sanal@…`, `it@eaglobalwater.com`). Every item here is cheap (hours,
not days) and either closes a hole that's live right now or prevents the
next deploy from doing damage. Nothing in later phases should ship until
this phase is merged.

### 0.1 Stand up a test framework
- Add **Vitest** (fast, zero-config with TS/ESM, no conflict with Next.js's
  own build — the lazy/standard choice here, not a heavier Jest setup).
- `npm install -D vitest`, add a `test` script to `package.json`.
- One trivial smoke test to prove the harness works; real tests get added
  per-phase from here on.

### 0.2 `JWT_SECRET` insecure fallback → fail fast
- File: `src/lib/auth.ts:9-13`.
- Remove the `|| "dev-omni-crm-secret-change-me"` fallback; throw at import
  time if `process.env.JWT_SECRET` is unset, matching the pattern already
  used in `src/lib/encryption.ts:5`.
- Test: a unit test asserting `secret()` throws with `JWT_SECRET` unset.

### 0.3 Critical Next.js RCE (dependency)
- Run `npm audit fix` (confirmed non-breaking — no major version bump
  required for the `next`/`postcss`/`sharp` chain).
- Re-run `npm run lint && npm run typecheck && npm run build` to confirm
  nothing regresses.
- Commit the updated `package-lock.json`.

### 0.4 Contact/Lead `DELETE` missing role check
- Files: `src/app/api/contacts/[id]/route.ts:45` (`DELETE`),
  `src/app/api/leads/[id]/route.ts:24` (`DELETE`).
- Change `requireSession()` → `requireRole("OWNER", "ADMIN")` on both, matching
  every other destructive endpoint in the codebase (stage delete, user
  management, contact merge).
- Test: integration test asserting an `AGENT`-role session gets `403` on both
  endpoints.

### 0.5 `render.yaml` deploy strategy
- File: `render.yaml:8`.
- Change `startCommand` from `npx prisma db push && npm run db:seed && npm start`
  to `npx prisma migrate deploy && npm start`.
- Remove `db:seed` from the production start path entirely — seeding is a
  one-time, explicit operation (`npm run db:seed` run manually against a
  fresh environment only), never part of every redeploy.
- Do this **before** any other phase deploys, since every later phase
  depends on redeploying without wiping/reseeding real client data.

### 0.6 Quick one-line bug fixes (bundle together, trivial diffs)
- **Dead locale ternary**: `src/app/api/conversations/[id]/route.ts:64` —
  `(conversation.contact.city || "").match(/[İIıi]/) ? "tr" : "tr"` always
  returns `"tr"`. Replace with the conversation/contact's actual stored
  locale (fall back to tenant `localeDefault` if none recorded), so
  agent-triggered AI replies respect the real language instead of always
  forcing Turkish.
- **`/api/realtime` uncaught auth error**: `src/app/api/realtime/route.ts:5`
  — wrap in try/catch and return via `fromApiError`, same as every other
  route, instead of a raw 500 on an unauthenticated request.

### 0.7 Defer but schedule now (don't forget these)
Not urgent enough to block Phase 1, but write them down so they don't get
dropped. Do as a short follow-up PR immediately after Phase 0:
- `IntegrationConnection` encryption is write-only (no `decryptConfig`
  anywhere) — either finish it or remove the unused write path.
- `/api/health` leaks internal config (LLM provider/model, integration
  status) to unauthenticated callers — trim the public response to
  `{ status, db }`.
- No CSP/security headers in `next.config.ts`.
- Add `npm audit --audit-level=high` as a CI step in
  `.github/workflows/ci.yml` so 0.3 doesn't silently regress.

**Definition of done (Phase 0):** `npm audit` clean of high/critical, all
four quick fixes merged with tests, `render.yaml` uses `migrate deploy`, and
a manual pass confirms login/contacts/leads still work on staging after
deploy.

---

## Phase 1 — Widget delivery fix + AI response quality (client Items 1 & 2)

### 1.1 Diagnose the real embeddable widget
- Staging's tenant already has a `widgetPublicKey` set
  (`owpk_f056dac9…`) but no `widgetAllowedOrigins`.
- **Open item, needs client input:** get the actual `<script>` embed
  snippet from the client's live marketing site. Confirm whether it passes
  `data-key="owpk_f056dac9…"`. If it doesn't, that alone explains "delivery
  is broken" (see 1.2).
- Confirm `WIDGET_ALLOWED_ORIGINS` on the VPS (`.env`) includes the client's
  real domain.

### 1.2 Fix the error-leak bug in the widget
- File: `public/widget.js:61` — `add(data.reply || data.error?.message || "…")`
  prints a raw API error code/message (e.g. `"Invalid widget key"`) straight
  into the visitor-facing chat transcript on any non-2xx response.
- Fix: check `response.ok` before treating the payload as a reply; on
  failure, show one friendly fallback message (localized), and log the real
  error to `console.error` for debugging instead of surfacing it to the
  visitor.

### 1.3 Widget UI polish
- Persist/restore conversation history on page reload: currently only
  `visitorId` survives in `localStorage` — the visible transcript resets
  every reload even though the server-side conversation is intact. Add a
  lightweight "fetch recent messages for this visitor" path (new thin
  endpoint or extend `/api/widget/config` to optionally return the last N
  messages for a known `visitorId` + tenant) and render them on widget open.
- Add a typing/sending indicator between submit and reply.
- Minor visual pass per the client's "improve widget UI detail" ask
  (timestamps, smoother panel open/close) — defer exact visual spec to the
  client's shared reference if one exists.

### 1.4 Fix duplicate request bug on Widget Settings
- File: `src/app/(app)/widget-settings/page.tsx` — confirmed on staging that
  a single page load fires 8 duplicate `GET /api/admin/widget` calls.
  Almost certainly a `useEffect` without a stable dependency array, or a
  fetch triggered from multiple re-renders. Fix so it fetches once on
  mount.

### 1.5 AI response quality (`src/lib/ai.ts`)
- Adjust the system prompt so the model states any KB-supported fact **first**
  when sources exist, then optionally asks one qualifying question —
  currently the prompt only says "ask at most one qualifying question,"
  which the model over-applies even when it has a real answer to give.
- Loosen `applyReplySafety()`'s handoff trigger so a message with
  moderate-relevance sources (some score between "clearly enough" and
  "nothing") doesn't automatically collapse into the generic handoff line —
  tune against real conversations once Phase 2 content exists.
- **This phase ships the prompt/logic fix; full resolution is capped by
  Phase 2** — verified live on staging that even with sources retrieved, the
  underlying KB content is placeholder-quality ("Approved staging
  knowledge"), so a prompt fix alone won't produce specific product answers.
- Test: unit tests on `generateBotReply`/`applyReplySafety` covering
  "sources present + product question → answer includes source content" and
  "no sources → handoff," using fixture KB data.

**Definition of done (Phase 1):** a real message sent through the live
embeddable widget (not just `/widget-demo`) gets a delivered, non-error
reply; widget-settings loads with one network request; AI replies state
KB-backed facts when available.

---

## Phase 2 — Knowledge Base restructuring (client Item 3)

### 2.1 Schema migration
- New Prisma migration: add `section` to `KnowledgeDocument` — an enum
  covering the four handling buckets (`CORE`, `FUNDAMENTAL`, `PRODUCT`,
  `FAQ`), with the client's 7 display labels mapped onto them at the UI
  layer (see table in `docs/CLIENT_DELIVERY_PLAN.md`):
  - `CORE` ← Custom Instructions, Channel Controls
  - `FUNDAMENTAL` ← General Information, IBAN Information (flagged specially, see below)
  - `PRODUCT` ← Catalog Database
  - `FAQ` ← Question–Answer Archive
  - *Automation Settings is configuration, not content — it belongs to Phase 5, not this schema.*
- Add an `isSensitiveFinancial` boolean (or reuse a dedicated `section:
  "IBAN"` value) so IBAN content can be excluded from AI-generated answers
  entirely — see 2.3.

### 2.2 Ingestion changes
- File: `src/lib/knowledge.ts` — `ingestKnowledgeDocument` and the upload
  API (`src/app/api/knowledge/route.ts`) accept and store the new `section`.

### 2.3 Retrieval/prompt routing (`src/lib/ai.ts`, `src/lib/knowledge.ts`)
- `CORE` + `FUNDAMENTAL` (excluding IBAN): small enough to inject directly
  into the system prompt on every call — no embedding search, removes any
  chance of the wrong chunk being retrieved for foundational facts.
- `PRODUCT` + `FAQ`: unchanged — continue through the existing
  `retrieveKnowledge()` embedding-search pipeline.
- **IBAN**: excluded from both the system prompt and RAG retrieval. Any
  payment/banking question routes to the existing human-handoff mechanism in
  `replySafety()` (same pattern already used for pricing questions) — the AI
  should never recite bank details from memory. IBAN content is reference
  material for human agents only, surfaced in the Knowledge UI but never
  passed to the LLM.

### 2.4 Admin UI rebuild
- File: `src/app/(app)/knowledge/page.tsx` — currently one flat paste-box +
  file upload (confirmed on staging). Rebuild with the client's 7-category
  grouping as tabs or sections, each creating documents tagged with the
  right `section` value.

### 2.5 API updates
- `src/app/api/knowledge/route.ts` (`POST`) and
  `src/app/api/knowledge/[id]/route.ts` (`PATCH`): accept/update `section`.

### 2.6 Content
- Not an engineering task, but track it: the client needs to populate real
  Product/FAQ/IBAN/General Information content before Phase 1's AI-quality
  fix can fully land. Flag this dependency explicitly when Phase 1 ships.

**Definition of done (Phase 2):** Knowledge UI shows the 7 client-named
sections; documents route to the correct handling path (always-injected vs.
RAG vs. human-only); a test confirms IBAN-tagged content never appears in an
LLM request payload.

---

## Phase 3 — Core CRM module UI builds (client Items 6, 7, 8)

All three are UI builds on top of data models/APIs that already exist and
don't need schema changes. No cross-dependency between the three — can be
done in any order or in parallel.

### 3.1 Tasks module (currently list + "mark done" only, no create UI)
- File: `src/app/(app)/tasks/page.tsx`.
- Add a create/edit form (title, body, type, linked lead/contact/conversation,
  assignee, due date) wired to the existing `POST /api/tasks` and
  `PATCH /api/tasks/[id]`.
- Add filters (status, assignee, overdue) — extend
  `GET /api/tasks` (`src/app/api/tasks/route.ts`) to accept query params
  beyond pagination.
- Wire delete to the existing `DELETE /api/tasks/[id]`.
- Test: integration test for create → appears in list → complete → filtered
  out of "open" view.

### 3.2 Contacts: Data Table default view + Card view toggle
- File: `src/app/(app)/contacts/page.tsx` — currently card-grid only, no
  pagination UI despite the API supporting it.
- Build a sortable, paginated Data Table component (reuse across other
  modules where useful — Leads table already has a similar shape).
- Make Table the default; keep the existing card layout as a toggle view.
- Wire pagination controls to the existing `page`/`pageSize` params on
  `GET /api/contacts`.
- Test: pagination round-trip (page 2 returns different rows than page 1).

### 3.3 Leads: Kanban board
- File: `src/app/(app)/leads/page.tsx` — currently a flat table with a
  per-row stage dropdown.
- Build a Kanban board: one column per `PipelineStage` (ordered by
  `position`), one card per `Lead`.
- Drag-and-drop: try native HTML5 drag-and-drop first (no new dependency);
  only reach for a library (e.g. `@dnd-kit/core`) if native DnD proves
  insufficient for touch/accessibility — don't add a dependency before
  confirming the native approach doesn't work.
- On drop, `PATCH /api/leads/[id]` with the new `stageId` (endpoint already
  supports this — no API change needed).
- Keep the existing table as an alternate view/toggle.
- Test: drag-triggered stage change persists and respects tenant scoping
  (existing API-level tenant check already covers this — add a UI-level
  test that the right endpoint is called with the right payload).

**Definition of done (Phase 3):** Tasks has full CRUD from the UI; Contacts
defaults to a paginated table; Leads has a working drag-and-drop Kanban
backed by the real API.

---

## Phase 4 — Calendar status & comments (client Item 5)

### 4.1 Schema migration
- Add `status` enum to `CalendarEvent` (`scheduled`, `confirmed`,
  `completed`, `cancelled`, `no_show`) — replaces/supplements the existing
  binary `completedAt` timestamp.
- Add a `CalendarEventComment` model (`id`, `tenantId`, `eventId`,
  `authorUserId`, `body`, `createdAt`) for a simple append-only comment
  thread — lighter than a generic activity-log system, matches what the
  client asked for ("status and comments").

### 4.2 API
- Currently `src/app/api/events/route.ts` only has `GET`/`POST` — no way to
  update an existing event at all. Add
  `src/app/api/events/[id]/route.ts` with `PATCH` (status, other fields) and
  a nested comments endpoint (or accept comments as part of the `PATCH`
  body if a full sub-resource is overkill for the volume expected).

### 4.3 UI
- File: `src/app/(app)/events/page.tsx` — currently a bare add-form + flat
  list with no way to edit anything after creation. Add status badge/editor
  and a comment thread per event.

**Definition of done (Phase 4):** an event's status can be changed and
comments added after creation, both visible in the UI and persisted.

---

## Phase 5 — Automation expansion (client Item 4)

Sequenced last: biggest schema change, and benefits from Tasks/Leads/Calendar
(Phases 3–4) already being stable since expanded flows will likely act on
all three.

### 5.1 Confirm scope with the client first
- Open question from `docs/CLIENT_DELIVERY_PLAN.md`: is a multi-step
  rule builder sufficient, or is a visual workflow designer expected? The
  original project scope explicitly excluded a visual designer
  (`docs/IMPLEMENTATION_STATUS_AND_BACKLOG.md`). Get this confirmed before
  estimating/building — the effort difference is large.

### 5.2 Schema
- Current `AutomationRule` (`prisma/schema.prisma`) is one trigger → one
  action, single-shot, flat `config` JSON. Extend to ordered multi-step
  flows: either a new `AutomationStep` model (`ruleId`, `stepOrder`,
  `action`, `config`, optional `delayMinutes`) or a validated JSON array on
  the rule — prefer the relational model since it's easier to query/audit
  per-step run history.

### 5.3 Fix the tenant-validation gap while touching this code
- Files: `src/app/api/admin/automations/route.ts`,
  `src/lib/automation.ts:13`. Currently `config.userId` is accepted
  unvalidated and used directly as `assigneeId` with no check that the user
  belongs to the tenant. Validate `config.userId`/`config.tag` shapes at
  rule-creation time, and re-check tenant membership before applying
  `assign_user`. Bundle this fix here since it's the same code being
  rewritten for multi-step support — no separate PR needed.

### 5.4 Builder UI
- File: `src/app/(app)/automations/page.tsx` — currently just a rule-name
  field and a create button. Rebuild to support adding/ordering multiple
  steps per rule.

### 5.5 Execution engine
- `src/lib/automation.ts` (`runAutomations`) and `src/worker.ts`: execute
  steps in order, record per-step results (extend `AutomationRun` or add a
  per-step result table).

### 5.6 Tests
- Unit tests for multi-step execution order and for the tenant-membership
  check added in 5.3 (the exact scenario it protects against: a rule config
  referencing a `userId` from a different tenant should be rejected, not
  silently applied).

**Definition of done (Phase 5):** a rule with 2+ ordered steps runs
correctly end-to-end, and cross-tenant `userId` references are rejected at
creation time.

---

## Held — explicitly not scheduled

- **Inbox, Dashboard, SLA config** (client Item 9): no planned changes.
  Regression-test manually whenever an earlier phase touches adjacent code
  (Phase 5 touches `src/worker.ts`, which is SLA-adjacent — run a manual
  regression pass on SLA escalation after Phase 5 ships).
- **Campaigns & Leads sending** (client Item 10): blocked on WABA/AiSensy
  validation. Before this is unblocked, the AiSensy webhook auth gap
  (`src/lib/aisensy.ts:17-23`, accepts unsigned requests and trusts a
  client-supplied `tenantSlug` when no secret is configured) must be fixed —
  treat that fix as a **hard prerequisite** to enabling real WhatsApp
  traffic, not a nice-to-have.
- **Remaining Medium/Low security items** from `docs/SECURITY_AND_TESTING_REVIEW.md`
  not already folded into a phase above (security headers/CSP, write-only
  integration-credential encryption, rate-limit map eviction, non-constant-time
  webhook signature compare, `/api/admin/worker` tenant scoping, hardcoded
  single-client branding in shared code): bundle into one hardening pass
  before production launch, after Phase 5.

---

## Suggested sequencing summary

| Phase | Focus | Depends on |
|---|---|---|
| 0 | Security fail-fasts, RCE patch, delete-role-gap, deploy strategy, trivial bug fixes, test framework | — |
| 1 | Widget delivery fix, AI response prompt tuning | Phase 0 (safe to deploy) |
| 2 | Knowledge Base restructuring | Phase 0; unblocks full Phase 1 AI-quality fix |
| 3 | Tasks / Contacts table / Leads Kanban | Phase 0 |
| 4 | Calendar status & comments | Phase 0 |
| 5 | Automation expansion | Phase 0; benefits from Phases 3–4 |
| Held | Inbox/Dashboard/SLA (preserve), Campaigns/Leads (blocked on WABA) | — |

Phases 3 and 4 have no dependency on 1/2/5 and can run in parallel with them
if more than one person is available.
