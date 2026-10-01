# Client blockers + Tester handoff

**Staging:** https://staging-crm.eaglobalwater.com  
**Repo:** https://github.com/Mustafi2703/omnichannel-crm (`main`)  
**Full QA checklist:** [TESTING_DEVELOPER_CHECKLIST.md](./TESTING_DEVELOPER_CHECKLIST.md)  
**Plan status:** [PLAN_GAP_STATUS.md](./PLAN_GAP_STATUS.md)

---

## A. What is already live (tester can validate now)

| Client ask | Live? | Where to test |
|------------|-------|---------------|
| 1 Widget delivery + UI polish | Yes | Widget demo / embed; typing; friendly errors |
| 2 Better AI answers | Yes* | Ask hours / filters / product; *quality limited by KB depth |
| 3 Knowledge categories | Yes | Knowledge page chips + upload by category |
| 4 Automation expansion | Partial | Create trigger→action rules (not multi-step yet) |
| 5 Calendar status + comments | Yes | Calendar page |
| 6 Tasks module | Yes | Create / filter / Done |
| 7 Contacts table default | Yes | Table + cards + pagination |
| 8 Leads Kanban | Yes | Drag cards across stages |
| 9 Inbox / Dashboard / SLA | Preserved | Smoke regression |
| 10 Campaigns / WhatsApp | **No** | Blocked on AiSensy |

\*Verified on server: FAQ hours answered correctly; IBAN refused + handoff.

---

## B. Client blockers (must provide to finish)

### Content (unlocks best AI)
1. **Catalog Database** — product sheets (Zinc-Copper filter, lifespan liters, specs)  
2. **More FAQ Q&As** — approved Turkish + English  
3. **General Information** — company benefits, promotions (e.g. 6-month instalments) with final confirmed numbers  
4. **IBAN** — for agents only (never recited by AI)  
5. **Custom Instructions** — any extra CORE rules beyond defaults  

### Channels / integrations
6. **Live website domain(s)** for widget allow-list + confirm embed uses `data-key`  
7. **AiSensy** — API key, template URL, webhook secret, approved templates, verified WA number  

### Product config
8. **Real users** — name, email, role (Owner/Admin/Agent)  
9. **Brand** — logo, color, welcome TR/EN  
10. **Final pipeline stages** + assignment rules  
11. **Automation scope** — multi-step rule builder **or** visual designer?  

### Production
12. **Production domain** + Cloudflare DNS access  
13. **Timezone** confirm (`Europe/Istanbul`?)  
14. **Resend / email DNS** if notifications required  
15. **UAT sign-off** after tester green  

---

## C. WhatsApp message for tester (copy/paste)

```
Hi — staging is ready for full QA.

URL: https://staging-crm.eaglobalwater.com
Repo checklist: docs/TESTING_DEVELOPER_CHECKLIST.md
(also docs/CLIENT_AND_TESTER_HANDOFF.md)

Please verify:
• Knowledge categories + AI answers (hours, filters, IBAN should hand off)
• Contacts TABLE default + pagination
• Leads Kanban drag
• Tasks create/Done
• Calendar status + comments
• Widget send + typing + no raw API errors
• Inbox/Dashboard still OK

Out of scope: Campaigns / live WhatsApp (AiSensy pending)

Reply: READY FOR CLIENT UAT or NEEDS FIXES + screenshots.
```

---

## D. Suggested client update (after tester green)

```
Staging is updated with Knowledge categories, Contacts data table, Leads Kanban,
Tasks, Calendar status/comments, widget polish, AI answers from approved FAQ/
company knowledge, and security hardening.

To complete launch we still need from you:
1) Product catalog + richer FAQ content
2) Website domain for the chat widget
3) AiSensy WhatsApp credentials + approved templates
4) Real user list + brand assets
5) Confirm automation: multi-step rules vs visual builder
6) Production domain / DNS

Campaigns and live WhatsApp remain off until AiSensy is validated.
```
