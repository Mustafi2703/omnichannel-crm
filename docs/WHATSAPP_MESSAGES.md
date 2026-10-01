# WhatsApp — copy/paste messages

## EN — To the other developer (tester)

```
Hi — staging smoke-tested and ready for your UAT.

URL: https://staging-crm.eaglobalwater.com
Cloudflare proxy active.

Tester login (temp — change after first login):
Email: it@eaglobalwater.com
Password: EaUatTemp2026!

Also available (ask me for passwords via vault if needed):
erdinc.astar@biohidrogen.com | fatih.sanal@biohidrogen.com

Pre-verified by us:
• Health OK, login OK, all main APIs 200
• Pipeline 10 TR stages live
• KB: Custom Instructions + General + FAQ + Catalog ready
• AI answers filters / pump / warranty / catalog correctly
• Price → no price + adviser handoff; IBAN refused

Please still run full UI pass:
1) Login
2) Leads drag across stages
3) Inbox multi-assign
4) Operations SLA 15/30/180 + set manager users
5) Knowledge page categories
6) Contacts table + Tasks + Calendar status/comments
7) Widget send + typing
8) Re-check AI: filter / pump / warranty / price / IBAN

Campaigns / live WhatsApp OFF (AiSensy pending).

Reply: READY FOR CLIENT UAT (+ screenshots)
or NEEDS FIXES + notes
```

## EN — To the client

```
Hello,

Staging CRM is ready:
https://staging-crm.eaglobalwater.com
(Cloudflare proxy active)

Admin accounts:
• erdinc.astar@biohidrogen.com
• fatih.sanal@biohidrogen.com
• it@eaglobalwater.com

DONE
✅ Sales pipeline (New Lead → Blacklist)
✅ Lead assignment (unit manager multi-select)
✅ SLA: 15 min unassigned / 30 min first call / 3h no-call
✅ AI knowledge: Custom Instructions + General Info + Q&A + Catalog
✅ Widget, Inbox, Contacts, Tasks, Calendar
✅ Domain staging-crm.eaglobalwater.com

STILL NEEDED FROM YOU (blockers)
1) AiSensy WhatsApp (API + templates + verified number) — for Campaigns
2) Live website domain(s) — widget embed allow-list
3) Bank-transfer discount exact rate: 5% or 7%? (both appear in your pack)
4) IBAN (human agents only; AI never shares it)
5) Sales agent user list (name / email / role)
6) Team leaders who should get SLA alerts
7) Production domain / DNS (after UAT)
8) Confirm each admin can log in (or we reset via vault)

Note: AI does not quote prices; price/payment questions are handed to a customer adviser.

Our tester is running the checklist; once green we move to client UAT.
Happy to answer any questions.
```

---

## TR — To the other developer (tester)

```
Merhaba — staging UAT hazır.

URL: https://staging-crm.eaglobalwater.com
Domain Cloudflare proxy aktif.
Admin: erdinc.astar@biohidrogen.com | fatih.sanal@biohidrogen.com | it@eaglobalwater.com

Tam checklist: docs/TESTING_DEVELOPER_CHECKLIST.md
Özet: docs/FINAL_CLIENT_STATUS.md

Lütfen şunları çalıştır:
1) Login (3 admin)
2) Leads — 10 TR stage (Yeni Lead→Kara Liste), drag
3) Inbox — yönetici multi-assign
4) SLA Operations = 15 / 30 / 180 dk + manager seç
5) Knowledge — CORE / Genel / FAQ / Katalog ready
6) AI test (TR):
   • Filtre değişimi?
   • Pompalı/pompasız?
   • Garanti?
   • Fiyat? → fiyat YOK, danışmana yönlendir
   • IBAN? → handoff, IBAN yok
7) Contacts tablo + Tasks + Calendar status/yorum
8) Widget mesaj + typing

WhatsApp Campaigns KAPALI (AiSensy bekleniyor).

Cevap: READY FOR CLIENT UAT (+ screenshot)
veya NEEDS FIXES + not
```

## B) To the client

```
Merhaba,

Staging CRM hazır:
https://staging-crm.eaglobalwater.com
(Cloudflare proxy aktif)

Yöneticiler:
• erdinc.astar@biohidrogen.com
• fatih.sanal@biohidrogen.com
• it@eaglobalwater.com

TAMAMLANANLAR
✅ Satış pipeline (Yeni Lead → Kara Liste)
✅ Lead ataması (birim yöneticisi multi-seçim)
✅ SLA: 15 dk atanmamış / 30 dk ilk arama / 3 saat aranmama
✅ AI bilgi bankası: Özel Talimatlar + Genel Bilgiler + Soru-Cevap + Katalog
✅ Widget, Inbox, Contacts, Tasks, Calendar
✅ Domain staging-crm.eaglobalwater.com

SİZDEN BEKLENENLER (blokör)
1) AiSensy WhatsApp (API + şablon + numara) — Campaigns için
2) Canlı site domain(leri) — widget embed
3) Havale indirimi kesin oran: %5 mi %7 mi? (pakette ikisi de var)
4) IBAN (sadece insan danışman; AI asla söylemez)
5) Satış temsilcisi kullanıcı listesi (ad/e-posta/rol)
6) SLA bildirim alacak takım liderleri
7) Prod domain / DNS (UAT sonrası)
8) Admin şifre erişimi onayı

Not: AI fiyat vermez; fiyat/ödeme için müşteri danışmanına yönlendirir.

Test ekibimiz checklist’i koşuyor; yeşil olunca UAT’ye geçeriz.
Sorularınız olursa yazın.
```
