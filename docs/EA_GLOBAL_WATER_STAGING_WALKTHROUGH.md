# EA Global Water staging walkthrough and sign-off

Staging URL: https://staging-crm.eaglobalwater.com

## Completed before client review

- EA Global Water welcome, login, page title, widget-demo, and notification copy are deployed.
- Approved EA Global Water knowledge is indexed with OpenAI `text-embedding-3-small`.
- The live widget UAT passed 25/25 cases on 2026-09-09. Evidence is in `docs/evaluation/EA_GLOBAL_WATER_STAGING_EMBEDDING_EVAL.csv`.
- UAT and labelled widget-test contacts, conversations, and messages were removed after a database backup.
- Existing client access and pipeline configuration were preserved.

## Walkthrough

1. Sign in with the existing Owner or Admin account.
2. Open **Widget demo**. Check the EA Global Water welcome message, a product question, a filter-maintenance question, and **Can I speak with a person?**.
3. Open **Inbox**. Confirm the resulting conversation, grounded AI reply, source metadata, and human-handoff controls. Check that the message panel scrolls.
4. Review **Contacts** and **Leads** using the existing stages: New Lead, Unassigned, Assigned, Unreachable, Cold Follow-up, Warm Follow-up, Hot Follow-up, Sale, Negative, and Blacklist.
5. In **Widget settings**, confirm the production-approved welcome text, colour, and allowed origins before any public embed change.

## Client sign-off

The client reviewer should confirm the following:

- [ ] Branding and welcome copy are approved.
- [ ] Widget answers, safety handoffs, and inbox workflow are accepted.
- [ ] Existing users and pipeline stages are correct.
- [ ] Staging is approved for the agreed next environment.

Reviewer: ____________________  Date: ____________________

