# Glitch & Defect Report — EA Global Water CRM staging

Date: 2026-10-03 · Build under test: `origin/main` @ `2480419` (no commits since the 2 Oct review; staging behaves identically)
Companion to `docs/UAT_REVIEW_REPORT.md` (which holds the checklist results and the five UAT blockers B1–B5).
This report covers **new** problems found in a second, broader pass, plus a one-page recap of what is still open.

## How each finding was verified

| Tag | Meaning |
|---|---|
| **BROWSER** | Reproduced in a real browser (embedded the staging widget in a page served from a different origin, `http://localhost:8099`, exactly like the client's website will) |
| **LIVE-API** | Reproduced with real requests to `staging-crm.eaglobalwater.com` |
| **CODE** | Read in the source; the behaviour follows directly from the code. Where I could not click it live I say so. |

**Update (same day):** the signed-in screens were checked afterwards, with the user signing in on the browser pane themselves (I do not type passwords into the hosted login). Results are in **§8** and several findings below are now upgraded to **confirmed live**. Only one account (an Admin) was used, so the "all 3 admins can log in" check is still open. Tasks create/complete and Calendar edit were not exercised, to avoid changing the client's data.

## Summary

| Sev | # | Headline |
|---|---|---|
| **High** | 7 | Widget panel can't be closed · website visitors never receive adviser replies · widget-settings page crashes on bad input · no mobile navigation · AI repeats medical/safety claims from the KB · "do not contact me" is not honoured · widget fails silently on the real domain until the origin is entered exactly right |
| **Medium** | 8 | Raw markdown in replies · "open conversations" ignores handed-off chats · unusable SLA alerts · USD shown for lead values · all web visitors named "Web Visitor" · sessions expire into blank screens · timezone/KPI errors · inconsistent error format |
| **Low** | 9 | See §3 |

---

## 1. High severity

### H1. The chat widget can never be closed, and it is open on every page load  *(BROWSER — confirmed)*
**What happens:** Embed `widget.js` on any page. The 381×541 px chat panel is already visible before anyone clicks, and the "×" does nothing. A red "1" badge is permanently stuck on the Chat button.
**Evidence:** after page load and after clicking ×, the panel's `hidden` attribute is `true` but its computed style is `display: flex`, 381×541 px. The badge is likewise `hidden` but `display: flex`.
**Cause:** `public/widget.js` styles `.omni-panel{…display:flex…}` and `.omni-badge{…display:inline-flex…}`. Author CSS `display` overrides the browser's `[hidden]{display:none}`, so the code that toggles `hidden` has no visible effect.
**Why nobody saw it:** the team's widget checks used the **Widget demo** page inside the CRM, which is a separate React component and never loads `widget.js`. The bug is older than this release (same CSS before), but the "widget UI" deliverable and checklist item 8 are not truly verified until `widget.js` is tested on a foreign page.
**Impact:** on the client's real site the panel permanently covers a large part of the screen (full width on phones) with a fake unread badge. Likely to be the first thing the client sees.
**Fix (one line):** `.omni-panel[hidden],.omni-badge[hidden]{display:none}`. Add a browser test that loads the widget from another origin.

### H2. Website visitors can never receive an adviser's reply  *(CODE; LIVE-API for the one-way widget)*
**What happens:** the widget only does request/response with the bot. When the AI hands off, the conversation moves to the Inbox and an adviser types a reply — but for website conversations nothing delivers it. `conversations/[id]/route.ts:107` only sends outbound messages for `channelType === "whatsapp"`; the widget has no polling, no stream, and no endpoint that returns messages (`/api/widget/` contains only `config`, `demo-config`, `message`).
**Compounding problems:**
- The Inbox labels those undelivered agent messages **"Sent / Gönderildi"** (`deliveryStatus` defaults to `sent`), so the adviser believes the visitor got them.
- After handoff the AI is off, so every further visitor message just gets the canned "Mesajınız alındı. Kısa süre içinde dönüş yapacağız." again and again.
- The widget never asks for name or phone, and the AI's collected phone/district stay buried in message text (see M5), so the adviser may have no way to reach the visitor at all.
**Impact:** the website channel is effectively one-way after handoff. Unless the intended flow is "adviser phones the customer", this breaks the main use of the widget. **Needs a product decision from the client**, then either (a) a lightweight reply channel (visitor polls for new messages) or (b) a phone/name capture step before handoff, plus honest delivery status.

### H3. Widget Settings page crashes on any invalid or failed save  *(CODE — certain; not clicked live)*
**What happens:** `widget-settings/page.tsx` does `setError(data.error || "Save failed")`. The API returns errors as an object, `{ error: { code, message } }`, so the page tries to render an object as text and React throws ("Objects are not valid as a React child") — the page goes to the error screen.
**Easy triggers:** type `red` or `#fff` in **Brand colour** (the API accepts only `#rrggbb`) · an origin that isn't a valid URL · a welcome text over 300 characters · a failed "Generate public key".
**Impact:** the most likely tester action on this screen ("let me try a colour") crashes the page, and the brand colour field is a bare text box with no colour picker or hint.
**Fix:** read `data.error?.message`; use a colour input; validate before sending. See M8 for the underlying inconsistency.

### H4. There is no navigation on mobile or tablet  *(CODE; matches the 533 px screenshot from 28 Sep)*
`AppShell.tsx` hides the sidebar below 768 px (`hidden … md:flex`) and the mobile header contains only the app name. No hamburger menu, so on a phone you cannot reach Inbox, Leads, Tasks, etc. — and the language switch and **Log out** live in the same hidden sidebar. Sales agents will likely use phones. The Kanban also uses HTML5 drag-and-drop, which doesn't work by touch.

### H5. The AI repeats medical and safety claims that the client said it must not make  *(LIVE-API + KB content)*
The KB itself contradicts its own rules. Live answers from staging:
| Question | AI answer (condensed) | Source in KB |
|---|---|---|
| "Does this water have a medical reference? Do doctors recommend it?" | "…recommended by many physicians and **children's hospitals** for its positive effects on **cellular renewal and general health**…" | FAQ entry 1 (`03-faq-archive.md`) |
| "Does the device harm the water? Is it risky?" | "…produces healthy mineralised living water. With the 120-day return **your risk is zero**." | FAQ "Cihaz suya zarar verir mi?" |
| "What harmful substances does the zeolite remove?" | "…removes dangerous heavy metals such as **lead, arsenic** and ammonia…" | FAQ zeolite entry |
Also in the catalog: "helps improve acid–base balance" and quantitative marketing figures (**~400 % hydrogen**, **ORP ≈ −300**).
**Why it slips through:** the code's health guard only triggers on words like diyabet/migren/tedavi/hastalık; "tıbbi referans", "hekim", "hücresel yenilenme", "risk" don't match, so there is no handoff or softening.
**Impact:** this contradicts the Custom Instructions ("do not turn hydrogen/ORP/… into health claims") and the client's own do-not-say list; physician/hospital endorsements and efficacy claims are exactly what advertising regulators look at. **Recommend the client's legal/compliance team reviews the KB wording** (I am not giving legal advice). Technical fix: remove/reword those FAQ entries, broaden the guard (medical, doctor, hospital, risk-free, cure-like words), and add tests.

### H6. "Do not contact me" is not honoured — and the AI says it was  *(LIVE-API + CODE)*
The Custom Instructions say to move such customers to *Negative* and take no further action. **No code does this** (searched `src/` for opt-out/"istemiyorum"/stop handling — nothing). Live result for "Artık iletişim istemiyorum, beni aramayın lütfen filtre":
> "Bu isteğinizi not aldım. **İletişim talebiniz olumsuz olarak kaydedilecektir.** … İyi günler dilerim."
…with `handoff=true`, which **notifies an adviser to follow up**. Nothing is recorded: the lead is not moved, marketing consent is not cleared, automation is not paused. The same sentence *without* a product keyword is refused as "off-topic" (scope-guard bug B1), so it isn't processed either.
**Impact:** false assurance to the customer plus a human chasing someone who asked not to be contacted — a privacy/electronic-marketing-consent (KVKK / ETK) risk. **Fix:** detect opt-out phrases (TR/EN), set `consentWhatsappMarketing=false` + `automationPausedAt`, close the conversation, move the lead to Olumsuz, and reply truthfully; or remove the promise from the instructions.

### H7. On the client's real domain the widget fails silently until the origin is typed exactly right  *(BROWSER + LIVE-API + CODE)*
**Reproduced:** from `http://localhost:8099` the widget showed **"We could not send that message. Please try again."** — printed twice (once as a bubble, once as a red line) — and the header stayed "Support" instead of the company name. Console: *CORS policy: No 'Access-Control-Allow-Origin' header* on `/api/widget/config`. A direct request showed why: the server returned **`403 ORIGIN_NOT_ALLOWED`** (an allow-list *is* configured on staging, so my test message was correctly rejected and nothing was stored).
**Why this will bite on go-live:**
- The allow-list is an **exact string match** on the `Origin` header. `https://www.site.com` ≠ `https://site.com` ≠ `http://…`. The settings page stores whatever is typed — a trailing slash or a path (`https://site.com/`) is accepted as a valid URL but can never match.
- Once the tenant saves any origins, the server-side environment list is **ignored**, so the CRM's own origin (used by the Widget demo) must be re-added or the demo breaks.
- Error responses (403, 429, 400) carry **no CORS headers**, so the widget can never show a meaningful message, and the `OPTIONS` handler ignores the tenant list entirely.
- The visitor sees a generic failure either way; nobody is alerted.
**Fix:** normalise origins on save (`new URL(x).origin`, lowercase, trim), suggest adding both apex and `www`, add CORS headers to error responses, honour the tenant list in `OPTIONS`, and show the admin a "last blocked origin" hint. This is client blocker #2, so confirm both domain variants when they send them.

---

## 2. Medium severity

**M1. AI replies contain raw markdown.** *(LIVE-API)* Answers include `**Garanti Süresi**:` and `- ` bullets. The widget (and WhatsApp) shows the asterisks literally; the Inbox bubble has no `white-space: pre-wrap`, so lines collapse into one paragraph. Fix: tell the model to answer in plain text and strip markdown server-side.

**M2. "Open conversations" ignores handed-off chats.** *(CODE; staging showed 0 on 28 Sep)* `dashboard/route.ts` and the realtime counter count `status = "open"`, but every handoff sets `status = "pending"` — exactly the chats waiting for a human. The headline KPI reads 0 while work is queued.

**M3. SLA alerts aren't actionable.** *(CODE)* Notification and email bodies read "Conversation `ckx…cuid` has been unassigned for 15 minutes" — a raw ID, no contact name, no link, and clicking the bell item only marks it read (`worker.ts:35,49`, `AppShell.tsx`). Include the contact name/channel and link to `/inbox?c=<id>`.

**M4. Lead values show "$".** *(CODE)* `formatMoney()` hard-codes USD, and the Kanban prints `formatMoney(lead.expectedValue || 0)`, so every card without a value shows **"$0,00"** for a Turkish business that prices in TRY. Use TRY for lead/won values and hide empty values; keep USD only for AI-cost screens.

**M5. Every web visitor is "Web Visitor".** *(CODE)* The widget never asks for a name, the contact is created as "Web Visitor", and phone/email/district the AI collects remain only in message text (the structured `qualification` is only saved if a lead is created — and leads aren't created, see UAT blocker B3). The Contacts table and Inbox become a wall of identical rows with no phone number. Add an optional name/phone prompt and extract details into the contact.

**M6. Expired or deactivated sessions turn into blank screens.** *(CODE)* The layout checks the JWT only; client pages have no 401 handling. After the 7-day expiry (or deactivation) a client-side navigation shows empty lists and the Dashboard renders **"$NaN"** instead of redirecting to login. A global `fetch` wrapper that redirects on 401 fixes all screens.

**M7. Daily metrics use the server's timezone.** *(CODE)* `startOfDay` (dashboard, costs) and the monthly AI budget use UTC on the server, so "today" rolls over at ~03:00 Istanbul. "Cost per lead" returns the whole day's cost when there are zero leads instead of "—".

**M8. Two different API error formats.** *(CODE)* Some routes return `{ error: "text" }` (knowledge, dashboard, costs, webhook), others `{ error: { code, message } }`. Screens written for one crash or mis-display the other (root cause of H3). Standardise on `{ error: { code, message } }`.

---

## 3. Low severity / polish

1. **Malformed JSON returns HTTP 500** on `/api/auth` and `/api/widget/message` (the webhook correctly returns 400). *(LIVE-API)* Clutters logs; return 400.
2. **Failed-send text is duplicated and persisted.** The widget shows the error as a bubble *and* a red line, and saves the error bubble into its stored history, so it reappears after reload. *(BROWSER)*
3. **`publicKey: null` is rejected.** If `data-key` is missing the widget sends `null`, and the schema (`string().optional()`) returns 400 even for tenants that don't require a key. *(CODE)*
4. **Widget subtitle promises "Usually replies in under a minute"** (hard-coded) although after handoff replies may take hours or never arrive (H2).
5. **`widget.js` is cached for 4 hours** (`max-age=14400`) with no versioned URL, so fixes (like H1) reach customers' browsers up to 4 h late. *(LIVE-API)*
6. **Stock English 404 page** inside a `lang="tr"` document; no `robots.txt`/noindex on staging, so search engines may index it. *(LIVE-API)*
7. **Inbox rough edges.** *(CODE)* The "AI" button does nothing unless text is typed; attachment-upload and handoff errors are swallowed (no `response.ok` check); the list is capped at 100 with no paging; every open Inbox/Dashboard tab holds **two** event streams and refetches everything every 15 s whether or not anything changed ("realtime" is really polling).
8. **Tasks / Calendar / Contacts rough edges.** *(CODE)* Calendar and task updates have no error handling; status labels are raw (`no_show`, `open/done/all`); tasks cap at 100 with no paging; Contacts table has no sorting or row click-through; Calendar "comments" is one overwritten note, not a history.
9. **`PATCH /api/notifications` without an `id` marks *all* of a user's notifications read** (Prisma ignores an `undefined` filter). *(CODE)*

Also minor: the rule-based fallback still asks "home, office or business?" which the Custom Instructions explicitly forbid; the "81 ilde ücretsiz kurulum" fact is hard-coded in `ai.ts` as well as the KB (they can drift); `.npmrc` has `legacy-peer-deps=true`; the Operations page returns a generic "Invalid request" without saying which field is wrong.

---

## 4. Still open from the earlier review (details in `UAT_REVIEW_REPORT.md`)

| ID | Issue |
|---|---|
| B1/B2 | Scope guard refuses real questions (havale, teslimat, randevu, capital-letter IBAN/FILTRE) and IBAN requests don't hand off |
| B3 | Web chat creates no lead in the 10-stage pipeline; no "New lead" button |
| B4 | Dragging to Satış / Olumsuz / Kara Liste fails silently |
| B5 | "15 min unassigned" SLA never fires for new chats |
| S1 | AiSensy webhook unauthenticated, tenant taken from the request body |
| S2–S6 | Public `uploads/`, no security headers, weak `JWT_SECRET` check, unchecked relation IDs, non-blocking audit |
| F1/F2 | Automation expansion and the 7th KB group not delivered |

I re-ran four of the failing probes on 3 Oct: all four still fail, so nothing has been fixed yet.

---

## 5. Why these got through, and what to add to QA
- Widget checks were done on the **in-app demo page**, not on `widget.js` from another website. Add one browser test that embeds the widget from a different origin (open → send → reply → close → reload).
- Unit tests (9) only cover the JWT helper, KB category constants and a few scope-guard phrases. Add contract tests for API error shapes, the lead stage rules, SLA scan eligibility, and a regression list of customer phrases (TR + EN, upper/lower case).
- Add one end-to-end path per module that a tester would take on day one (create → edit → delete / invalid input).

## 6. Housekeeping
- **Test data on staging:** about **30** conversations named **"Claude UAT"** (visitor ids `claude-uat-*`), plus one demo chat from 28 Sep. Several sit in `pending`. Delete or anonymise (Contacts → search "Claude UAT") before the client tests. Two further attempts from the embed page were rejected (403) and stored nothing. I deleted nothing.
- A correction to my earlier report: the short "Biohidrogen advantages" line in the price answer is **required** by the client's Custom Instructions, so it is not a defect. (Fixed in `UAT_REVIEW_REPORT.md`.)
- The local test page server I started on port 8099 is stopped. The `crm-review` worktree (a checkout of `origin/main`) is still next to your project folder.

## 7. Suggested fix order
1. **Same day, tiny diffs:** H1 (one CSS line), H3 (read `error.message`, colour input), M1 (plain-text replies), Low 1/9.
2. **UAT blockers:** B1–B5 from the earlier report.
3. **Needs a client decision first:** H2 (how do website visitors get replies / leave a phone number?), H5 (legal review of KB claims), H6 (opt-out behaviour).
4. **Before go-live:** H4 mobile navigation, H7 origin normalisation, M2–M8, S1–S2.

---

## 8. Signed-in verification (3 Oct, Admin account, staging)

Done with real clicks/requests in the signed-in browser pane. Test objects I created: one lead named "[Claude UAT] test lead - ignore" (left in *Yeni Lead*) and one agent reply on a "Claude UAT" chat. Nothing was deleted.

### Confirmed live
| Earlier finding | Live result |
|---|---|
| **B3** chats create no leads | **75 conversations, 0 leads.** Stage keys are `new_lead … blacklist`, so the widget's `new`/`qualified` lookup never matches. The Leads page has no "New lead" button. The 45 conversations from the team's own testing produced no leads either. |
| **B4** drag to Satış / Olumsuz fails silently | Drag *Yeni Lead → Atanmış* works (PATCH 200). Drag → **Satış** returns `400 WON_AMOUNT_REQUIRED`; → **Olumsuz** returns `400 LOST_REASON_REQUIRED`. The card stays put and **no message is shown**. |
| **B5** SLA "unassigned" never fires | All 75 chats are unassigned (oldest: 11 Sep, three weeks old). The signed-in admin has **0 notifications**. The worker is healthy (100 jobs completed, 0 failed), so the chats are simply not eligible. The only automation rule ("Test", conversation_unassigned → notify) has 0 runs. |
| **H3** Widget Settings crash | Typing `red` as Brand colour and pressing Save replaced the page with *"Application error: a client-side exception has occurred"*. Console: **React error #31** (object `{code, message}` rendered as text) after the API's `400`. Nothing was saved. |
| **H4** no mobile navigation | At 375 px the page has 13 nav links, **0 visible**; **Log out and the language switch are not reachable** either. |
| **H2** false "Sent" label | An agent reply on a website chat is shown as **"Gönderildi"** although no channel exists to deliver it to the visitor. |
| **M2** open-conversations KPI | Dashboard says **41** open; the Inbox has **75** (41 open + **34 pending**, i.e. waiting for a human). |
| **H5/H6** claims & opt-out | The offending AI replies are stored in the Inbox exactly as seen through the API (physicians/hospitals, "risk is zero", "will be recorded as negative"), and the opt-out chat has **"Bağlı lead yok"** (no lead, nothing recorded). |

### New findings from the signed-in pass
1. **Turkish casing glitch in the UI.** Status, channel and column labels are English words forced to upper case with `lang="tr"`, so they render as **"PENDİNG"**, **"WEBSİTE"**, **"EMAİL"** (dotted İ). Translate these labels or set `lang="en"`/`text-transform: none` on them. *(Low)*
2. **Custom Instructions are stored twice.** The Operations → "AI instructions" box already contains the full 2,478-character Custom Instructions text, and the same text is the CORE document in the Knowledge Base. Both are injected into the prompt (token waste, two places to edit, easy to drift). Keep one source. *(Medium)*
3. **Test data is mixed into the client's staging.** 75 contacts/conversations: 30 are mine ("Claude UAT"); 45 are from the team's own checks ("Final", "Fix Check", "KB Check", "Ready Check", "Rigorous", "UAT Smoke", "Web Ziyaretçi"). Plus one 11 Sep calendar event ("Deneme Araması"), one test automation rule, one test lead and one test agent message from me. Clear all of it before the client's UAT, or the client will see a wall of test chats and an inflated dashboard. *(Medium)*
4. **No rate card or budget policy exists for the tenant**, so the Costs screen's daily-budget warning can never appear (the provisioning script doesn't create them). Costs are tiny (month to date ≈ $0.03). Staging uses `gpt-4o-mini` + `text-embedding-3-small`, so the AI cost counter does work here. *(Low)*
5. **Only 3 assignable people**, all admins; no sales agents yet (client blocker #5). With no SLA managers selected, every alert would go to all three admins. *(Info)*
6. **Knowledge:** 4 documents, all `ready` and indexed with the right categories (Catalog, Custom Instructions, General Information, Q&A). The category list offers 6 groups, not the client's 7. *(Confirms F2)*
7. **Widget settings on staging:** public key set, **no allowed origins saved**, no brand colour. The server-side origin list is what rejected my foreign-origin test (H7).
8. **Campaigns** page is consistent with "OFF": no templates, no eligible contacts, no campaigns.
9. Calendar and Tasks screens render correctly (status selector + comment box; task form + Open/Done/All filter). Create/edit was not exercised.

### Still open
Login for the other two admins · Tasks create/complete · Calendar status/comment save · Inbox assign/unassign (deliberately **not** clicked: assigning or unassigning a test chat starts the SLA timers and would send alerts to the client's real admins).
