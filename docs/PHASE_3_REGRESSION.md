# Phase 3 Regression Script

Run this against Docker Compose with PostgreSQL and Redis available.

1. Sign in as Owner and Agent. Create a conversation; verify channel/status
   filters, assignment to another active agent, close/reopen, and CRM context.
2. Upload an allowed PDF/image under 10 MB; open its attachment link. Confirm an
   unsupported type or over-limit file returns a validation error.
3. Create an automation rule, unassign a conversation, and verify a completed
   or failed run is recorded. Pause the contact automation and confirm it is
   visible in the thread.
4. Create a due task, run `npm run worker`, and verify the assigned user receives
   an in-app notification. Force a worker failure, confirm it appears under
   Automations → Worker status, retry it there, and inspect the worker logs.
5. Generate a widget key, set an allowed origin, embed the generated snippet,
   and verify an allowed request succeeds while a different origin/key fails.
6. Open dashboard and inbox in separate browser sessions; send a message and
   verify the SSE summary updates without refreshing.

7. In a WhatsApp conversation whose last inbound message is over 24 hours old,
   verify the composer blocks free-form and AI sends, shows the service-window
   explanation, and permits only an approved-template selection. Confirm the
   failed/sent state returned by the configured template adapter is visible.
8. Send more than the configured number of login, widget, and webhook requests
   from two app instances. Confirm the shared Redis limiter returns HTTP 429 and
   a `Retry-After` response rather than allowing each instance its own limit.

Record the environment, date, tester, result, and any provider IDs for every
run. Live AiSensy/Resend confirmation remains a separate integration test.
