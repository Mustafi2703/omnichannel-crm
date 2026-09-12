# Client Setup Checklist  
## Single-Company Launch — What You Need to Prepare

**Share with:** Client IT / management  
**Full requirements:** [TECH_STACK_AND_SERVER_REQUIREMENTS.md](./TECH_STACK_AND_SERVER_REQUIREMENTS.md)  
**Pack overview:** [README.md](./README.md)

---

## Scope reminder

| Now | Later |
|-----|--------|
| **Your company only** (one workspace) | More companies → architecture upgrade |
| One server, one WhatsApp, one Google Ads | Multi-tenant SaaS — not required to launch |
| Inbox + CRM + AI + **daily cost & margin** | Advanced finance / ERP |

---

## Server to order (clear compute)

| Stage | vCPU | RAM | Storage | Example |
|-------|------|-----|---------|---------|
| Pilot (minimum) | **2** | **4 GB** | **40 GB SSD** | Hetzner CX22 / DO 4 GB |
| **Launch (recommended)** | **4** | **8 GB** | **80 GB SSD** | Hetzner CX32 / DO 8 GB |
| Growth / more companies | 6–8 | 16 GB | 160 GB | Only when needed |

**OS:** Ubuntu 22.04 or 24.04 LTS · **Region:** EU (e.g. Germany / Amsterdam)  
**No GPU. No AWS required for launch.**

---

## Compatible technology (locked)

| Layer | Choice |
|--------|--------|
| Frontend | Next.js + React + TypeScript |
| Backend | NestJS (Node.js 20) |
| Database | PostgreSQL 16 + pgvector |
| Cache / jobs | Redis 7 + BullMQ |
| AI | OpenAI API |
| WhatsApp | AiSensy |
| Ads | Google Ads |
| Email | Resend |
| DNS / SSL | Cloudflare |
| Deploy | Docker Compose on 1 VPS |

---

## Estimated monthly tech cost (one company)

| Item | Target |
|------|--------|
| VPS | ~$15–30 |
| OpenAI (capped) | ~$40–80 |
| AiSensy plan | ~$0–99 |
| Domain + Cloudflare + email | ~$0–20 |
| **Total** | **~$70–180 / mo** |
| Meta WhatsApp message fees | Usage-based (extra) |
| Google Ads media spend | Marketing budget (extra) |

Inside the app you will see **daily cost, cost per lead, and margin** so these stay under control.

---

## Checklist — please complete

| Done | Item | Action |
|------|------|--------|
| ☐ | Brand | Company name, logo, timezone `Europe/Istanbul`, Turkish + English |
| ☐ | Domain | Domain ready; plan `app.` and `api.` subdomains |
| ☐ | **VPS** | Order **4 vCPU / 8 GB / 80 GB** (or 2 / 4 / 40 for pilot) |
| ☐ | Cloudflare | Account for DNS + SSL |
| ☐ | OpenAI | Company account + billing + **monthly cap $40–80** + API key |
| ☐ | Email | Resend account (we will send DNS records) |
| ◐ | Users | Three initial admin email addresses received; still need each person’s name, role, and a secure invite/password-delivery method. |
| ☐ | Knowledge | Product FAQs, brochures, approved answers |
| ☐ | AiSensy | Company account + WhatsApp number decision |
| ☐ | Google Ads | Account access for lead tracking |
| ☐ | Deal values | Agree how you will enter expected / won deal amounts (for margin) |

## EA Global Water staging handoff

- Staging hostname supplied: `staging-crm.eaglobalwater.com` (Cloudflare proxy enabled).
- The source material includes pipeline, SLA, and AI requirements. The application now has tenant-scoped operations settings for the supplied 15-minute unassigned, 30-minute first-call, and 3-hour no-call SLA rules.
- The supplied product content must be reviewed before live AI indexing. Use `docs/client-content/EAGLOBALWATER_SAFE_KNOWLEDGE_BASE.md` as the safe draft, not the unreviewed source text.

**Share passwords/API keys only via a password vault (1Password / Bitwarden), not chat or email.**

---

## Product you will receive (modules)

1. Workspace, users, roles  
2. Unified inbox (website + WhatsApp)  
3. Contact CRM  
4. Lead pipeline + follow-up alerts  
5. AI FAQ + qualification + handoff to agent  
6. Google Ads source / conversion tracking  
7. **Cost management: daily spend, cost per lead, margin by channel**  

---

## Kısa Türkçe özet (yönetim)

Bu paket **paylaşıma hazır** gereksinim dokümanıdır.  

- **Tek şirket** için kurulum; çok şirketli yapı sonra.  
- **Sunucu:** 4 vCPU · 8 GB RAM · 80 GB SSD (AB bölgesi).  
- **Yazılım:** gelen kutusu, CRM, AI, WhatsApp (AiSensy), Google Ads.  
- **Maliyet yönetimi uygulamada:** günlük harcama, lead başı maliyet, marj analizi.  
- **Aylık teknik maliyet hedefi:** yaklaşık **70–180 USD** (+ WhatsApp mesaj + reklam).  
- **AWS gerekmez** lansman için.
