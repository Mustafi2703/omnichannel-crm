# Operations Runbook

## Deploy

1. Copy `.env.example` to a server-only `.env`; set PostgreSQL, JWT, encryption,
   OpenAI/AiSensy/Resend, embedding-provider, and `WIDGET_ALLOWED_ORIGINS` values. Never commit it.
2. Run `docker compose up -d --build`.
3. Run reviewed Prisma migrations with `npx prisma migrate deploy` in the app
   container, then check `/api/health` and `/api/ready`.

## Backup and restore drill

Schedule `scripts/backup-postgres.sh` daily using cron. It retains seven days by
default. Private staging runs this at 02:17 UTC as root, writing compressed
dumps to `/var/backups/omnicrm` and logs to `/var/log/omnicrm-backup.log`. For
the mandatory restore drill, restore a selected dump into a fresh Postgres
database, run the application against it, and record the date, dump, and result
in the deployment log.

## Incident restart

Use `docker compose ps`, inspect `docker compose logs --tail=200 app`, then
`docker compose restart app`. Do not log secrets or message bodies. Escalate
provider failures after recording the message ID and safe error summary.

## Before UAT

Verify DNS/TLS, `WIDGET_ALLOWED_ORIGINS`, live webhook signature validation,
AiSensy template approval, embedding smoke-test/index preparation, Redis
readiness, a backup, and one restore test. Follow
`EMBEDDING_PROMOTION_RUNBOOK.md` for NVIDIA staging and OpenAI production RAG.
