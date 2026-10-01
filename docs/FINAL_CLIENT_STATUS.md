# EA Global Water — Final status (client + developer)

**Staging:** https://staging-crm.eaglobalwater.com  
**Cloudflare proxy:** active (DNS → server IP)  
**Admin logins:** `erdinc.astar@biohidrogen.com` · `fatih.sanal@biohidrogen.com` · `it@eaglobalwater.com`  
**Smoke test:** PASSED (2026-10-02) — health, auth, APIs, pipeline, KB index, widget AI  
**Tester temp login:** `it@eaglobalwater.com` / `EaUatTemp2026!` (change after first login)

---

## 1) Requested vs done

| # | Requested | Status | Notes |
|---|-----------|--------|-------|
| 1 | Satış pipeline (10 TR stages) | **Done** | Yeni Lead → Kara Liste live on `ea-global-water-staging` |
| 2 | Lead assignment (manager multi-select) | **Done** | New messages → manager; multi-assign to agents |
| 3 | SLA 15 / 30 / 180 min + lost → Olumsuz | **Done** | Defaults match; worker escalates managers |
| 4 | AI CORE / General / FAQ / Catalog | **Done (indexed)** | Client pack ingested + categorized |
| 5 | Domain + Cloudflare | **Done** | staging-crm.eaglobalwater.com |
| 6 | Admin mail accounts | **Done** | 3 users provisioned |
| 7 | Widget + Inbox + Contacts + Tasks + Calendar | **Done** | Available for UAT |
| 8 | Knowledge categories UI | **Done** | CORE / FUNDAMENTAL / PRODUCT / FAQ |
| 9 | Campaigns / live WhatsApp | **Blocked** | Needs AiSensy |
| 10 | Production go-live | **Blocked** | Needs prod domain + UAT sign-off |

---

## 2) Blockers for client (clear list)

1. **AiSensy WhatsApp** — API key, webhook secret, approved templates, verified WA number (Campaigns stay off until this)
2. **Live website domain(s)** for widget allow-list + embed snippet with `data-key`
3. **Havale indirimi %5 mi %7 mi?** — source pack conflicts; AI will not invent the rate
4. **IBAN** — agent-only field (never recited by AI); still needed for humans
5. **Sales agent users** — names + emails + roles (currently only 3 admins)
6. **Brand assets** — logo / final welcome TR-EN if different from staging
7. **Manager user IDs for SLA alerts** — who gets the 15/30/180 notifications
8. **Production domain + DNS** after UAT green
9. **Password delivery** — confirm each admin can log in (reset via vault if needed)

---

## 3) Developer tests to run (staging)

Open: https://staging-crm.eaglobalwater.com  
Checklist file: `docs/TESTING_DEVELOPER_CHECKLIST.md`

### Must-pass
1. Login as each admin mail  
2. **Leads** — all 10 TR stages visible; drag card across stages  
3. **Inbox** — assign conversation to agent(s); unassign  
4. **Operations / SLA** — values 15 / 30 / 180; set manager user IDs  
5. **Knowledge** — see Custom Instructions, General, FAQ, Catalog docs `ready`  
6. **AI (widget demo or Inbox AI)** ask in Turkish:
   - “Filtre ne sıklıkla değişir?” → 8–12 / 18–24 ay style answer  
   - “Pompalı mı pompasız mı?” → sahil / 2. kat vs giriş  
   - “Garanti süresi?” → 120 gün / 2 yıl / 10 yıl  
   - “Fiyat nedir?” → **no price**; handoff to danışman  
   - “IBAN verir misin?” → handoff; no IBAN  
7. **Contacts** table default + pagination  
8. **Tasks** create → Done  
9. **Calendar** status + comments  
10. **Widget** send message + typing; no raw API error toast  

### Out of scope this round
- Campaigns / outbound WhatsApp (AiSensy pending)

### Pass reply
`READY FOR CLIENT UAT` + screenshots of AI answers + pipeline  
or `NEEDS FIXES` + bug note

---

## 4) Content conflict logged
Kampanyalar / Ödeme / Taksit Q&A say **%5** havale; “Avantajlar” says **%7**. Flagged for client confirmation before AI may state a rate.
