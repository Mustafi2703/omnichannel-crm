# Phase 0 Delivery Decisions

**Status:** Internal baseline confirmed; client configuration data pending.

## Confirmed launch scope

- One Turkish client company / one workspace at launch.
- Turkish and English are the required product languages.
- Initial channels are website chat and WhatsApp through AiSensy.
- The product flow is: inbound conversation → AI FAQ/qualification → human
  handoff when needed → contact/lead pipeline → follow-up → cost visibility.
- Google Ads scope is MVP-light: UTM/gclid capture first, with conversion and
  campaign integration following after the core CRM and inbox are reliable.
- Multi-tenant signup/billing, Instagram/Facebook, deep ERP sync, AWS, and a
  visual workflow builder remain out of scope for this launch.

## Confirmed delivery order

1. Knowledge base and RAG with pgvector (client priority).
2. Role enforcement, API validation, and CRM correctness.
3. Inbox/widget reliability, follow-up/SLA jobs, and notifications.
4. Live AiSensy, Google Ads attribution, costs, and budgets.
5. Production deployment, observability, backups, UAT, and handoff.

## Provisional acceptance criteria

The launch is acceptable only when an agent can:

1. Sign in using a real assigned account with the correct role.
2. Receive a website or WhatsApp message in the unified inbox.
3. Receive a grounded Turkish/English AI answer based on approved knowledge, or
   a clean human handoff when the answer is unsupported.
4. Create/manage a contact and lead, assign/move the lead, and complete a
   follow-up task.
5. See reliable source attribution and daily cost/CPL/margin basics.
6. Operate the production system with monitored health, backups, and a tested
   restore procedure.

## Client data still required

Do not replace the demo tenant until the client supplies and approves:

- Legal/company display name, logo, brand color, and approved welcome copy.
- Real owner/admin/agent names, email addresses, and initial roles.
- Final pipeline stages and ownership/assignment rules.
- Approved FAQ/brochure pack, pricing escalation policy, and handoff wording.
- Production domain, widget-install access, and timezone confirmation.

When these values arrive, update the tenant seed/bootstrap process and remove
the demo login credentials before staging or production use.
