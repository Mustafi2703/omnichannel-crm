# Plan vs implemented — status after alignment pass

Compared against `docs/IMPLEMENTATION_PLAN.md` after the first staging UX deploy.

| Phase | Plan intent | Status | Notes |
|-------|-------------|--------|-------|
| **0** Security + harness | Vitest, JWT fail-fast, audit, DELETE roles, render migrate, locale/realtime bugs | **Done this pass** | Residual `npm audit` highs remain in Next nested `postcss` / prisma `mysql2` (fix needs Next 16 / breaking prisma force — not applied). CI gates on critical. |
| **1** Widget + AI | Error leak, settings dupes, prompt, polish | **Mostly done** | Widget no longer leaks API errors; settings fetch once; typing + local history. Server-side history restore still optional follow-up. AI prompt now “facts first”; quality still limited by KB content. |
| **2** KB restructure | CORE/FUNDAMENTAL/PRODUCT/FAQ + IBAN human-only | **Aligned** | UI categories map to sections; CORE/FUNDAMENTAL always-injected; PRODUCT/FAQ via RAG; IBAN excluded from LLM. Automation Settings removed from KB (Phase 5). |
| **3** Tasks / Contacts / Kanban | Full UI | **Done for UAT** | Contacts paginated table default; Kanban DnD; Tasks create + filters. |
| **4** Calendar status/comments | Status + comments | **Done (simplified)** | Status enum + comments field (not separate `CalendarEventComment` table yet — acceptable for volume; can upgrade later). |
| **5** Automation multi-step | Confirm with client | **Not started** | Richer create UI only. Needs client answer: multi-step rules vs visual designer. |
| **Held** Inbox/Dashboard/SLA | Preserve | Preserved | |
| **Held** Campaigns/WhatsApp | Blocked on AiSensy | Blocked | Fix unsigned webhook auth before enabling live WA. |

## Ready for
1. Testing developer → `docs/TESTING_DEVELOPER_CHECKLIST.md`
2. Client UAT after checklist green
3. Then Phase 5 scope confirmation + AiSensy unblocking
