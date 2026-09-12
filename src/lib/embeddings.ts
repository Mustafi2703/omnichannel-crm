import OpenAI from "openai";

export type EmbeddingProvider = "nvidia" | "openai";

export type EmbeddingConfiguration = {
  provider: EmbeddingProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
  dimensions: number;
  indexVersion: string;
};

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

function configuredValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when EMBEDDING_PROVIDER is configured`);
  return value;
}

function dimensions(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 16_000) {
    throw new Error("EMBEDDING_DIMENSIONS must be an integer between 1 and 16000");
  }
  return parsed;
}

/** Chat configuration is intentionally independent in src/lib/llm.ts. */
export function getEmbeddingConfiguration(): EmbeddingConfiguration | null {
  if (!configured(process.env.EMBEDDING_PROVIDER)) return null;
  const provider = process.env.EMBEDDING_PROVIDER!.trim().toLowerCase();
  if (provider !== "nvidia" && provider !== "openai") {
    throw new Error("EMBEDDING_PROVIDER must be nvidia or openai");
  }
  const isNvidia = provider === "nvidia";
  return {
    provider,
    apiKey: configuredValue("EMBEDDING_API_KEY"),
    baseURL: isNvidia ? configuredValue("EMBEDDING_BASE_URL") : process.env.EMBEDDING_BASE_URL?.trim() || undefined,
    model: isNvidia ? configuredValue("EMBEDDING_MODEL") : process.env.EMBEDDING_MODEL?.trim() || "text-embedding-3-small",
    dimensions: dimensions(process.env.EMBEDDING_DIMENSIONS || (isNvidia ? undefined : "1536")),
    indexVersion: configuredValue("EMBEDDING_INDEX_VERSION"),
  };
}

function assertEmbeddings(embeddings: number[][], config: EmbeddingConfiguration) {
  if (!embeddings.length || embeddings.some((embedding) => embedding.length !== config.dimensions || embedding.some((value) => !Number.isFinite(value)))) {
    throw new Error(`Embedding provider returned vectors that do not match configured dimension ${config.dimensions}`);
  }
  return embeddings;
}

export async function createEmbeddings(
  config: EmbeddingConfiguration,
  inputs: string[],
  inputType: "query" | "passage" = "query",
) {
  if (!inputs.length) return [] as number[][];
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 30_000 });
  const request = {
    model: config.model,
    input: inputs,
    // NVIDIA NIM exposes an OpenAI-compatible endpoint but its model controls
    // dimensionality. Only OpenAI's embedding-3 API accepts this override.
    ...(config.provider === "openai" ? { dimensions: config.dimensions } : { input_type: inputType, modality: "text" }),
  };
  // NVIDIA's OpenAI-compatible embedding endpoint extends the request body
  // with input_type/modality; the OpenAI SDK type intentionally omits them.
  const response = await client.embeddings.create(request as never);
  return assertEmbeddings(response.data.map((item) => item.embedding), config);
}

export async function smokeTestEmbeddings(config = getEmbeddingConfiguration()) {
  if (!config) throw new Error("EMBEDDING_PROVIDER is not configured");
  const [embedding] = await createEmbeddings(config, ["EA Global Water embedding smoke test"], "query");
  return { provider: config.provider, model: config.model, dimensions: embedding.length, indexVersion: config.indexVersion };
}
