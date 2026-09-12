import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatConfiguration } from "@/lib/llm";
import { getEmbeddingConfiguration } from "@/lib/embeddings";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const llm = getChatConfiguration();
    let embeddings: ReturnType<typeof getEmbeddingConfiguration> = null;
    let embeddingConfigurationError: string | null = null;
    try { embeddings = getEmbeddingConfiguration(); } catch (error) { embeddingConfigurationError = error instanceof Error ? error.message : "Invalid embedding configuration"; }
    return NextResponse.json({
      status: "ok",
      db: "up",
      geminiConfigured: false,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      llmConfigured: Boolean(llm),
      llmProvider: llm?.provider || null,
      llmModel: llm?.model || null,
      embeddingProvider: embeddings?.provider || null,
      embeddingModel: embeddings?.model || null,
      embeddingDimensions: embeddings?.dimensions || null,
      embeddingIndexVersion: embeddings?.indexVersion || null,
      embeddingConfigurationError,
      aisensyConfigured: Boolean(process.env.AISENSY_API_KEY),
      version: process.env.npm_package_version || "1.0.0",
    });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
