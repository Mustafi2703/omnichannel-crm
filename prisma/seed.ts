import "dotenv/config";
import { PrismaClient, Role, LeadSource } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const existing = await prisma.tenant.findUnique({
    where: { slug: "demo-sirket" },
  });
  if (existing && process.env.FORCE_SEED !== "1") {
    console.log("Seed skipped (demo tenant already exists). Set FORCE_SEED=1 to reset.");
    return;
  }

  await prisma.message.deleteMany();
  await prisma.task.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contactIdentity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.budgetPolicy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Şirket A.Ş.",
      slug: "demo-sirket",
      timezone: "Europe/Istanbul",
      localeDefault: "tr",
      settings: {
        brandColor: "#1d4edb",
        welcomeTr: "Merhaba! Size nasıl yardımcı olabiliriz?",
        welcomeEn: "Hello! How can we help you today?",
      },
    },
  });

  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const [, , agent] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "owner@demo.com",
        passwordHash,
        name: "Ayşe Yılmaz",
        role: Role.OWNER,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "admin@demo.com",
        passwordHash,
        name: "Mehmet Kaya",
        role: Role.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "agent@demo.com",
        passwordHash,
        name: "Zeynep Demir",
        role: Role.AGENT,
      },
    }),
  ]);

  const stages = await Promise.all(
    [
      { key: "new", name: "New", nameTr: "Yeni", position: 1 },
      { key: "qualified", name: "Qualified", nameTr: "Nitelikli", position: 2 },
      { key: "demo", name: "Demo", nameTr: "Demo", position: 3 },
      { key: "proposal", name: "Proposal", nameTr: "Teklif", position: 4 },
      { key: "won", name: "Won", nameTr: "Kazanıldı", position: 5, isWon: true },
      { key: "lost", name: "Lost", nameTr: "Kaybedildi", position: 6, isLost: true },
    ].map((s) =>
      prisma.pipelineStage.create({
        data: { tenantId: tenant.id, isWon: false, isLost: false, ...s },
      }),
    ),
  );

  const stageByKey = Object.fromEntries(stages.map((s) => [s.key, s]));

  await prisma.rateCard.create({
    data: { tenantId: tenant.id, adsSpendPerDay: 25 },
  });
  await prisma.budgetPolicy.create({
    data: { tenantId: tenant.id, dailyCap: 80, monthlyCap: 1500 },
  });

  await prisma.knowledgeDocument.create({
    data: {
      tenantId: tenant.id,
      title: "Ürün SSS / Product FAQ",
      content: `Q: Çalışma saatleriniz nedir?
A: Hafta içi 09:00–18:00 (Europe/Istanbul). Acil destek için WhatsApp bırakabilirsiniz.

Q: Demo ne kadar sürer?
A: Ücretsiz 30 dakikalık keşif görüşmesi planlıyoruz.

Q: Fiyatlandırma nasıl?
A: İhtiyaca göre özel teklif hazırlanır; bot kesin fiyat vermez, satışa yönlendirir.

Q: What do you sell?
A: Omnichannel CRM with WhatsApp, web chat, AI qualification and cost visibility for SMEs.

Q: Do you support Turkish?
A: Yes — the dashboard and bot support Turkish and English.`,
    },
  });

  const contactsData = [
    {
      displayName: "Can Öztürk",
      companyName: "Anadolu Solar",
      email: "can@anadolusolar.com",
      phone: "+905551111111",
      city: "İstanbul",
      source: LeadSource.google_ads,
      gclid: "demo-gclid-001",
      utmSource: "google",
      utmCampaign: "solar-tr",
    },
    {
      displayName: "Elif Arslan",
      companyName: "Marmara Lojistik",
      email: "elif@marmara.com",
      phone: "+905552222222",
      city: "Bursa",
      source: LeadSource.whatsapp,
    },
    {
      displayName: "John Smith",
      companyName: "EuroTech GmbH",
      email: "john@eurotech.de",
      phone: "+491701234567",
      city: "Berlin",
      source: LeadSource.website,
      utmSource: "website",
      utmCampaign: "widget",
    },
    {
      displayName: "Selin Acar",
      companyName: "Ege Fabrika",
      email: "selin@egefabrika.com",
      phone: "+905553333333",
      city: "İzmir",
      source: LeadSource.website,
    },
    {
      displayName: "Burak Çelik",
      companyName: "Karadeniz Tekstil",
      phone: "+905554444444",
      city: "Trabzon",
      source: LeadSource.manual,
    },
  ];

  const contacts = [];
  for (const c of contactsData) {
    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        ownerUserId: agent.id,
        ...c,
        identities: {
          create: [
            ...(c.phone
              ? [{ tenantId: tenant.id, type: "phone", value: c.phone }]
              : []),
            ...(c.email
              ? [{ tenantId: tenant.id, type: "email", value: c.email }]
              : []),
          ],
        },
      },
    });
    contacts.push(contact);
  }

  const leadDefs = [
    { contact: contacts[0], stage: "qualified", score: 72, expectedValue: 45000, title: "Solar izleme CRM" },
    { contact: contacts[1], stage: "demo", score: 80, expectedValue: 28000, title: "WhatsApp operasyon" },
    { contact: contacts[2], stage: "new", score: 40, expectedValue: 15000, title: "EU expansion inquiry" },
    { contact: contacts[3], stage: "proposal", score: 88, expectedValue: 60000, title: "Fabrika dijitalleşme" },
    { contact: contacts[4], stage: "won", score: 95, expectedValue: 22000, wonAmount: 22000, title: "Tekstil lead pack" },
  ];

  const leads = [];
  for (const l of leadDefs) {
    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        contactId: l.contact.id,
        stageId: stageByKey[l.stage].id,
        title: l.title,
        score: l.score,
        source: l.contact.source,
        ownerUserId: agent.id,
        expectedValue: l.expectedValue,
        wonAmount: l.wonAmount,
        nextFollowupAt:
          l.stage === "won"
            ? null
            : new Date(Date.now() + (l.stage === "new" ? -86400000 : 86400000 * 2)),
        attributedCost: 12 + Math.random() * 40,
        tags: l.contact.source === LeadSource.google_ads ? ["ads", "hot"] : ["inbound"],
        notes: "Demo seed lead",
      },
    });
    leads.push(lead);
  }

  // Conversations
  for (const [i, contact] of contacts.slice(0, 3).entries()) {
    const channelType = contact.source === LeadSource.whatsapp ? "whatsapp" : "website";
    const convo = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        channelType,
        assigneeId: agent.id,
        aiMode: i === 0 ? "auto" : "off",
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.createMany({
      data: [
        {
          tenantId: tenant.id,
          conversationId: convo.id,
          direction: "inbound",
          senderType: "contact",
          bodyText:
            i === 0
              ? "Merhaba, fabrikamız için CRM ve WhatsApp otomasyonu bakıyoruz."
              : i === 1
                ? "WhatsApp üzerinden teklif alabilir miyiz?"
                : "Hi, do you support English dashboard?",
        },
        {
          tenantId: tenant.id,
          conversationId: convo.id,
          direction: "outbound",
          senderType: i === 2 ? "agent" : "bot",
          senderUserId: i === 2 ? agent.id : null,
          bodyText:
            i === 0
              ? "Merhaba! Tabii — şehir, ekip büyüklüğü ve demo isteğinizi öğrenebilir miyim?"
              : i === 1
                ? "Elbette. İhtiyacınızı kısaca yazar mısınız? Uygun bir uzman yönlendireceğim."
                : "Yes — Turkish and English are supported. I can connect you with sales.",
        },
      ],
    });
  }

  await prisma.task.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "follow_up",
        leadId: leads[0].id,
        title: "Can Öztürk — takip ara",
        body: "Solar demo tarihini netleştir",
        assigneeId: agent.id,
        dueAt: new Date(Date.now() - 3600000),
        status: "open",
      },
      {
        tenantId: tenant.id,
        type: "follow_up",
        leadId: leads[1].id,
        title: "Elif — demo sonrası not",
        assigneeId: agent.id,
        dueAt: new Date(Date.now() + 86400000),
        status: "open",
      },
    ],
  });

  const now = new Date();
  await prisma.usageEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        category: "ai",
        eventType: "completion",
        quantity: 1,
        unitCost: 0.02,
        totalCost: 0.02,
        leadId: leads[0].id,
        occurredAt: now,
      },
      {
        tenantId: tenant.id,
        category: "whatsapp",
        eventType: "outbound",
        quantity: 8,
        unitCost: 0.005,
        totalCost: 0.04,
        occurredAt: now,
      },
      {
        tenantId: tenant.id,
        category: "ads",
        eventType: "daily_spend",
        quantity: 1,
        unitCost: 25,
        totalCost: 25,
        occurredAt: now,
      },
      {
        tenantId: tenant.id,
        category: "server",
        eventType: "vps_day",
        quantity: 1,
        unitCost: 0.8,
        totalCost: 0.8,
        occurredAt: now,
      },
    ],
  });

  console.log("Seed OK");
  console.log("Login: owner@demo.com / Demo1234!");
  console.log("Also: admin@demo.com, agent@demo.com / Demo1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
