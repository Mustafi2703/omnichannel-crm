# WhatsApp — copy/paste messages

## EN — To the other developer (tester)

```
Hi — staging re-verified and ready for rigorous UAT.

URL: https://staging-crm.eaglobalwater.com
Cloudflare proxy active.

Tester login (ask me privately / password vault — never commit passwords):
Email: it@eaglobalwater.com
Password: <shared out-of-band via vault only>

Pre-verified by us:
• Health / login / main APIs OK
• Pipeline 10 TR stages live
• KB bilingual (TR+EN): CORE + General + FAQ + Catalog indexed
• AI: filter / pump / warranty / catalog / EN warranty OK
• Price → no price + handoff; off-topic (weather/crypto/jokes/code) blocked

Please run FULL pass (screenshot each AI answer):

A) Auth & CRM
1) Login
2) Leads — drag across all 10 stages
3) Inbox — manager multi-assign + unassign
4) Operations SLA = 15 / 30 / 180 + set manager users
5) Contacts table + Tasks Done + Calendar status/comments
6) Knowledge page — 4 category docs status ready

B) AI on-topic (TR)
7) Filtre değişim sıklığı?
8) Pompalı mı pompasız mı? (sahil / 2. kat)
9) Garanti / iade?
10) Alkali Premium özellikleri?
11) Çinko Bakır vs Hidrojen farkı?
12) Fiyat? → NO price, adviser handoff
13) IBAN? → refuse, no IBAN

C) AI on-topic (EN)
14) What is the warranty?
15) Pump or no pump for second floor?

D) AI guardrails (must refuse / redirect)
16) Bugün hava nasıl?
17) Bitcoin fiyatı?
18) Tell me a joke / write python code

E) Widget
19) Widget send + typing; no raw API errors

Campaigns / live WhatsApp OFF (AiSensy pending).

Reply: READY FOR CLIENT UAT (+ screenshots)
or NEEDS FIXES + notes
```

## EN — To the client

```
Hello,

Staging CRM is updated and live for testing:
https://staging-crm.eaglobalwater.com
(Cloudflare proxy active)

Admins:
• erdinc.astar@biohidrogen.com
• fatih.sanal@biohidrogen.com
• it@eaglobalwater.com

DONE
✅ Sales pipeline (New Lead → Blacklist)
✅ Lead assignment (manager multi-select)
✅ SLA 15 / 30 / 180 minutes
✅ AI knowledge TR+EN: Custom Instructions + General + Q&A + Catalog
✅ Guardrails: no price invention, no IBAN, off-topic questions blocked
✅ Widget, Inbox, Contacts, Tasks, Calendar
✅ Domain staging-crm.eaglobalwater.com

BLOCKERS (still need from you)
1) AiSensy WhatsApp (API + templates + verified number)
2) Live website domain(s) for widget embed
3) Confirm bank-transfer discount: 5% or 7%?
4) IBAN for human agents only
5) Sales agent user list (name/email/role)
6) Team leaders for SLA alerts
7) Production domain/DNS after UAT
8) Confirm admin logins work

FOR DEEPER / BETTER AI ANSWERS — please share (Word/PDF/Excel OK):
1) Approved price list policy note: “AI never quotes prices; hand off to adviser” + when to hand off
2) Exact campaign sheet (one source of truth): instalments, havale %, free install cities, 120-day return wording
3) Product comparison table (Premium / Zinc-Copper / B12 / Rich Mineral / BabyWater): differences in 5–8 bullets each
4) Filter SKUs + change intervals + liter lifespan if available
5) Objection-handling scripts (price objection, competitor, “think about it”, “call later”)
6) Technical support playbook (fault / maintenance / filter change) — what AI says + what data to collect
7) Do-not-say list (forbidden health/medical claims, competitor names, promises)
8) Top 30 real customer WhatsApp questions with your approved answers (TR + EN if possible)
9) City/region edge cases (coastal, earthquake, apartment floor, hard water)
10) Brand welcome lines TR/EN + logo if final

We already indexed your current pack. The items above make answers deeper and more consistent.

Our tester is running a full checklist now; once green → client UAT.
```

---

## TR — To the other developer (tester)

```
Merhaba — staging yeniden doğrulandı, sıkı UAT için hazır.

URL: https://staging-crm.eaglobalwater.com
Tester: it@eaglobalwater.com (şifre vault / özel mesaj — repoya yazmayın)

Lütfen tam geçiş yapın (AI cevaplarının screenshot’ı):
• Login, Leads 10 stage drag, Inbox multi-assign
• SLA 15/30/180 + manager
• Knowledge 4 kategori ready
• AI TR: filtre, pompa, garanti, Premium, Çinko-Bakır farkı, fiyat(YOK), IBAN(YOK)
• AI EN: warranty, pump 2nd floor
• Guardrail: hava / bitcoin / şaka / kod → reddetmeli
• Widget mesaj + typing

Campaigns KAPALI (AiSensy).
Cevap: READY FOR CLIENT UAT veya NEEDS FIXES
```

## TR — To the client

```
Merhaba,

Staging güncel ve test için açık:
https://staging-crm.eaglobalwater.com

Yöneticiler: erdinc.astar@… | fatih.sanal@… | it@eaglobalwater.com

TAMAMLANANLAR
✅ Pipeline, lead ataması, SLA 15/30/180
✅ AI TR+EN bilgi bankası (Özel Talimat / Genel / SSS / Katalog)
✅ Guardrail: fiyat uydurma yok, IBAN yok, konu dışı soru engeli
✅ Widget + CRM ekranları + domain

BLOKÖRLER
1) AiSensy  2) Canlı site domain  3) Havale %5 mi %7 mi?
4) IBAN (insan)  5) Satış temsilcileri  6) SLA liderleri
7) Prod domain  8) Admin giriş onayı

DAHA DERİN AI CEVAPLARI İÇİN LÜTFEN PAYLAŞIN
1) Fiyat politikası notu (AI asla fiyat vermez)
2) Tek kampanya tablosu (taksit / havale / kurulum / iade)
3) Ürün karşılaştırma tablosu (Premium / Çinko-Bakır / B12 / Rich / BabyWater)
4) Filtre SKU + değişim süresi (+ litre ömrü varsa)
5) İtiraz karşılama metinleri (fiyat, rakip, düşüneyim)
6) Teknik destek senaryosu (arıza/bakım/filtre) — AI ne der, hangi bilgi alınır
7) Söylenmeyecekler listesi (sağlık vaadi, rakip, söz)
8) Gerçek müşteri WhatsApp’tan top 30 soru + onaylı cevap (TR+EN)
9) Bölge/kat/sert su özel durumları
10) Final karşılama metni TR/EN + logo

Mevcut paketi indexledik; bunlar cevapları daha derin ve tutarlı yapar.
```
