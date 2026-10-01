# EA Global Water — Final status (client + developer)

**Staging:** https://staging-crm.eaglobalwater.com  
**Cloudflare proxy:** active  
**Admins:** `erdinc.astar@biohidrogen.com` · `fatih.sanal@biohidrogen.com` · `it@eaglobalwater.com`  
**Tester login:** `it@eaglobalwater.com` — password only via vault / private channel (never commit secrets)  
**Last verification:** 2026-10-02 — bilingual KB + scope guardrails + widget AI smoke PASSED  

---

## 1) Requested vs done

| # | Requested | Status | Notes |
|---|-----------|--------|-------|
| 1 | Sales pipeline (10 TR stages) | **Done** | Yeni Lead → Kara Liste |
| 2 | Lead assignment (manager multi-select) | **Done** | Inbox / manager assign |
| 3 | SLA 15 / 30 / 180 + lost → Olumsuz | **Done** | Defaults live; set manager IDs |
| 4 | AI CORE / General / FAQ / Catalog | **Done** | TR + EN indexed on staging |
| 5 | Domain + Cloudflare | **Done** | staging-crm.eaglobalwater.com |
| 6 | Admin emails | **Done** | 3 users |
| 7 | Widget / Inbox / Contacts / Tasks / Calendar | **Done** | Ready for UAT |
| 8 | Knowledge categories | **Done** | CORE / FUNDAMENTAL / PRODUCT / FAQ |
| 9 | Off-topic / price / IBAN guardrails | **Done** | Scope guard + safety layer |
| 10 | Campaigns / live WhatsApp | **Blocked** | AiSensy |
| 11 | Production go-live | **Blocked** | Prod domain + UAT sign-off |

---

## 2) Client blockers

1. AiSensy WhatsApp credentials + templates + verified number  
2. Live website domain(s) for widget allow-list  
3. Confirm havale discount **5% or 7%** (conflict in source pack)  
4. IBAN for human agents only  
5. Sales agent users (name / email / role)  
6. Team leaders for SLA alerts  
7. Production domain / DNS after UAT  
8. Confirm each admin can log in  

---

## 3) For deeper AI answers — ask client to share

| Priority | Asset | Why |
|----------|-------|-----|
| P0 | Single campaign sheet (taksit, havale %, install, return) | Removes %5/%7 conflict |
| P0 | Top 30 real WhatsApp Q&A (TR + EN) | Grounds answers in real chats |
| P0 | Do-not-say list (health claims, competitors, promises) | Safer replies |
| P1 | Product comparison table (5 models, 5–8 bullets each) | Clearer model differentiation |
| P1 | Filter SKUs + change intervals + liter lifespan | Deeper service answers |
| P1 | Objection scripts (price / competitor / think about it) | Better sales handoffs |
| P2 | Tech-support playbook (fault / maintenance data to collect) | Consistent support flow |
| P2 | Region edge cases (coastal, earthquake, floor, hard water) | Better pump / install advice |
| P2 | Final welcome TR/EN + logo | Brand polish |

Current pack is already indexed; the above makes answers deeper and more consistent.

---

## 4) Rigorous tester checklist

See also `docs/TESTING_DEVELOPER_CHECKLIST.md` and WhatsApp tester message in `docs/WHATSAPP_MESSAGES.md`.

**Must pass**
- CRM: login, Kanban drag, multi-assign, SLA UI, contacts/tasks/calendar, Knowledge ready  
- AI TR: filter, pump, warranty, Premium, Zinc-Copper vs Hydrogen, price (no number), IBAN refuse  
- AI EN: warranty, pump 2nd floor  
- Guardrails: weather / crypto / joke / code → scope redirect only  
- Widget: send + typing, no raw API errors  

**Out of scope:** Campaigns / outbound WhatsApp  

**Pass reply:** `READY FOR CLIENT UAT` + screenshots  

---

## 5) Content conflict logged

Kampanyalar / Ödeme / Taksit Q&A → **%5** havale; Avantajlar → **%7**. AI must not invent the rate until client confirms one source of truth.
