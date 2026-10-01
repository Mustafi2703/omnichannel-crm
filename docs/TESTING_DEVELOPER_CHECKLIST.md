# Staging review checklist — for testing developer

**Staging URL:** https://staging-crm.eaglobalwater.com  
**Branch deployed:** `client/staging-ux-kb`  
**Goal:** Internal QA pass → then invite client for UAT.  
**Do not** treat Campaigns / live WhatsApp as ready (blocked on AiSensy).

---

## Before you start

- [ ] Confirm you can log in with a real staging account (not only demo seed).
- [ ] Note browser + date/time in your report.
- [ ] Open DevTools → Network for widget / widget-settings checks.

---

## A. Security / Phase 0 regressions

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| A1 | `/api/health` returns only `{ status, db }` (no LLM/provider fields) | ☐ | |
| A2 | Unauthenticated `GET /api/realtime` returns 401 (not raw 500) | ☐ | |
| A3 | Agent role cannot DELETE a contact (expect 403) | ☐ | Use agent login if available |
| A4 | Agent role cannot DELETE a lead (expect 403) | ☐ | |
| A5 | Login / contacts / leads still load after deploy | ☐ | |

---

## B. Widget (client items 1–2)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| B1 | Widget Settings page: Network shows **one** `GET /api/admin/widget` on load | ☐ | |
| B2 | Copy embed snippet; confirm `data-key` is present | ☐ | |
| B3 | Widget demo or embed: send a message → reply appears | ☐ | |
| B4 | While waiting, typing indicator shows | ☐ | |
| B5 | On forced failure (bad key), visitor sees friendly message — **not** `Invalid widget key` | ☐ | |
| B6 | Reload page: local chat history restores | ☐ | |
| B7 | AI reply states a KB fact when KB has real content (else handoff is acceptable) | ☐ | Depends on content quality |

**Open client input:** confirm live site embed uses the public key + allowed origin includes their domain.

---

## C. Knowledge Base (client item 3)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| C1 | Knowledge shows category chips (Custom Instructions, Channel Controls, General Information, IBAN, Catalog, Q&A Archive) | ☐ | |
| C2 | Uploading into **Catalog** tags category correctly | ☐ | |
| C3 | Moving a doc between categories works | ☐ | |
| C4 | IBAN docs are visible in UI but AI must **not** recite IBAN/bank details | ☐ | Ask widget “what is your IBAN?” → handoff |
| C5 | Automation Settings is **not** a KB content bucket (lives under Automations module) | ☐ | |

---

## D. CRM modules (client items 5–8)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| D1 | **Contacts** opens in **Table** by default | ☐ | |
| D2 | Contacts Cards toggle works | ☐ | |
| D3 | Contacts pagination Prev/Next changes rows | ☐ | |
| D4 | **Leads** Kanban columns by stage; drag card updates stage | ☐ | |
| D5 | Leads Table toggle still works | ☐ | |
| D6 | **Tasks**: create title + due date → appears in Open | ☐ | |
| D7 | Mark Done → disappears from Open filter | ☐ | |
| D8 | **Calendar**: create event → change status → save comment | ☐ | Persist after refresh |

---

## E. Automations (client item 4 — partial)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| E1 | Can create rule with chosen trigger + action | ☐ | |
| E2 | Worker status panel loads | ☐ | |
| E3 | Multi-step visual flow builder is **not** claimed done | ☐ | Confirm with client if needed |

---

## F. Preserve (client item 9)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| F1 | Inbox still lists / replies | ☐ | |
| F2 | Dashboard KPIs load | ☐ | |
| F3 | Operations / SLA settings page loads | ☐ | |

---

## G. Explicitly out of scope this round (item 10)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| G1 | Campaigns page may exist but live WhatsApp send is blocked | ☐ | `aisensyConfigured: false` |
| G2 | Do **not** ask client to validate Campaigns until AiSensy keys + templates land | ☐ | |

---

## Report template (paste back)

```
Tester:
Date:
Staging build/time:
Result: READY FOR CLIENT UAT / NEEDS FIXES

Failed items:
- …

Screenshots / clips:
- …

Client-ready notes:
- …
```

---

## Suggested client UAT message (after this checklist is green)

> We updated staging with: Knowledge categories (CORE/FUNDAMENTAL/PRODUCT/FAQ), Contacts data table, Leads Kanban, Tasks create/complete, Calendar status/comments, widget delivery polish, and security hardening. Please review those areas. Campaigns and live WhatsApp remain pending until AiSensy/WABA credentials and templates are validated.
