import { foldText } from "./ai-guards";

export type RankedSource = { title: string; content: string; score: number };

type RankedPair = { title: string; content: string; lexical: number; vector: number };

function tokens(value: string) {
  return foldText(value)
    .split(/[^a-z0-9%]+/)
    .filter((word) => word.length >= 3);
}

function covers(queryWord: string, textWord: string) {
  return queryWord === textWord || textWord.startsWith(queryWord) || queryWord.startsWith(textWord);
}

function overlap(query: string, text: string) {
  const queryTokens = tokens(query);
  const textTokens = tokens(text);
  if (!queryTokens.length || !textTokens.length) return 0;
  const hits = queryTokens.filter((word) => textTokens.some((candidate) => covers(word, candidate))).length;
  return hits / queryTokens.length;
}

/** Split a knowledge chunk into individual question/answer pairs. */
export function splitQaPairs(content: string) {
  const pairs: { question: string; answer: string }[] = [];
  const pattern = /(?:^|\n)\s*(?:S|Q)\s*:\s*([\s\S]*?)\n\s*(?:C|A)\s*:\s*([\s\S]*?)(?=\n\s*(?:S|Q)\s*:|$)/gi;
  for (const match of content.matchAll(pattern)) {
    const question = match[1].replace(/\s+/g, " ").trim();
    const answer = match[2].replace(/\s+/g, " ").trim();
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

/**
 * Put the Q&A that matches the question first. A chunk often holds several
 * answers, and the model was using whichever one appeared at the top.
 */
export function rankKnowledgeAnswers(query: string, sources: RankedSource[], limit = 3) {
  const pairs: RankedPair[] = [];
  for (const source of sources) {
    const found = splitQaPairs(source.content);
    if (!found.length) {
      pairs.push({
        title: source.title,
        content: source.content.trim(),
        lexical: overlap(query, source.content),
        vector: source.score,
      });
      continue;
    }
    for (const pair of found) {
      pairs.push({
        title: source.title,
        content: `S: ${pair.question}\nC: ${pair.answer}`,
        lexical: overlap(query, pair.question) * 2 + overlap(query, pair.answer),
        vector: source.score,
      });
    }
  }
  const bestLexical = pairs.reduce((best, pair) => Math.max(best, pair.lexical), 0);
  const relevant = bestLexical > 0 ? pairs.filter((pair) => pair.lexical > 0) : pairs;
  return relevant
    .sort((a, b) => b.lexical - a.lexical || b.vector - a.vector || a.content.localeCompare(b.content))
    .slice(0, limit);
}
