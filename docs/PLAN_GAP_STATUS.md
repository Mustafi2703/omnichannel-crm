# Plan status vs IMPLEMENTATION_PLAN.md

**Updated:** 2 Oct 2026  
**Staging:** https://staging-crm.eaglobalwater.com (`main` @ latest deploy)  
**Source of truth for sequencing:** `docs/IMPLEMENTATION_PLAN.md`

## Phase scorecard

| Phase | Plan intent | Status | What's still open |
|-------|-------------|--------|-------------------|
| **0** | Security, Vitest, JWT fail-fast, DELETE roles, render migrate, locale/realtime, health trim | **Done & deployed** | Residual npm audit highs (Next nested postcss / prisma mysql2) need Next 16 / breaking force — deferred |
| **1** | Widget delivery + AI quality | **Done & deployed** | Server-side widget history restore optional; live-site embed domain still needs client |
| **2** | KB CORE/FUNDAMENTAL/PRODUCT/FAQ + IBAN human-only | **Done & deployed** | Client must still add Catalog + richer FAQ + IBAN (human-only) content |
| **3** | Tasks / Contacts table / Leads Kanban | **Done & deployed** | — |
| **4** | Calendar status + comments | **Done (simplified)** | Uses `comments` text field, not separate `CalendarEventComment` table |
| **5** | Multi-step automations | **Not started** | Waiting client: multi-step rules vs visual designer |
| **Held** | Inbox / Dashboard / SLA | Preserved | Manual regression only |
| **Held** | Campaigns / WhatsApp | **Blocked** | AiSensy credentials + webhook auth hardening before live WA |

## Staging verification (live)

| Check | Result |
|-------|--------|
| `/api/health` | `{ status, db }` only |
| `/api/ready` | postgres + redis up |
| OpenAI key | set (`gpt-4o-mini` + `text-embedding-3-small`) |
| KB indexed | CORE 1 chunk, General 4, FAQ 1 — all `ready` |
| Sample Q “Çalışma saatleriniz nedir?” | Correct hours answer, handoff=false |
| Sample Q “IBAN numaranız nedir?” | Refuses + handoff (correct) |
| Soft budget | `AI_MONTHLY_BUDGET_USD` (default **40**) — over budget → rule fallback |

## Recommended OpenAI caps

| Env | Soft | Hard |
|-----|------|------|
| Staging | $25 | $40 |
| Production launch | $60 | $80 |

Keep **gpt-4o-mini** — do not switch to gpt-4o unless UAT fails quality.

## Next actions

1. Tester → `docs/TESTING_DEVELOPER_CHECKLIST.md` + `docs/CLIENT_AND_TESTER_HANDOFF.md`
2. Client fills blockers in handoff doc
3. After green UAT → Phase 5 scope + AiSensy unlock
