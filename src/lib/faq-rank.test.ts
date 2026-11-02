import { describe, expect, it } from "vitest";
import { rankKnowledgeAnswers } from "./faq-rank";

const mixed = {
  title: "Q&A Archive / Soru-Cevap Arşivi",
  score: 0.8,
  content: `S: ORP değeri nedir ve neden önemlidir?
C: ORP suyun oksitleyici veya antioksidan gücünü ölçer. Biohidrogen sistemleri ORP'yi -300 mV seviyesine düşürmeyi hedefler.

S: Filtre değişim sıklığı ne kadar olmalıdır?
C: Ön filtreler (sediment ve karbon) ortalama 8-12 ayda bir; ters ozmoz membranı 18-24 ayda bir değiştirilmelidir.

S: Ürünlerin garanti süresi ne kadardır?
C: Tüm Biohidrogen su arıtma cihazları 2 yıl resmi garanti kapsamındadır. Tezgah altı: 120 gün iade.

S: pH test kiti var mı?
C: Cihaz yanında ücretsiz pH test kiti gönderildiği belirtilir.

S: Standart cihazlardan temel fark nedir?
C: Biohidrogen pH 9.5'e kadar alkali canlı su anlatılır.

S: Havale/EFT indirimi ne kadar?
C: Havale/EFT indirimi %5'tir.

Q: How often should filters be changed?
A: Pre-filters every 8-12 months. The membrane every 18-24 months.

Q: What is the warranty and the return period?
A: 2-year warranty. Under-sink models have a 120-day return.

Q: What is the bank transfer discount?
A: The bank transfer discount is 5%.

Q: What ORP level do the systems target?
A: The systems target an ORP of -300 mV.`,
};

describe("rankKnowledgeAnswers", () => {
  it("sorts each question variant to its own answer", () => {
    const cases: [string, string][] = [
      ["Filtreler ne kadar sürede değiştirilmelidir?", "8-12"],
      ["Filtre değişim sıklığı ne kadar olmalıdır?", "8-12"],
      ["How often should the filters be changed?", "8-12"],
      ["Garanti süresi ne kadar, iade süresi nedir?", "120 gün"],
      ["What is the warranty and the return period?", "120-day"],
      ["Beğenmezsem iade edebilir miyim?", "120 gün"],
      ["Havale indirimi yüzde kaç?", "%5"],
      ["What is the bank transfer discount?", "5%"],
      ["ORP nedir, Biohidrogen sistemleri hangi değeri hedefler?", "-300"],
      ["What ORP level do the systems target?", "-300"],
      ["pH değeri kaç olur?", "9.5"],
    ];
    for (const [question, expected] of cases) {
      const [best] = rankKnowledgeAnswers(question, [mixed]);
      expect(best.content, question).toContain(expected);
    }
  });
});