import OpenAI from "openai";

export type ChatProvider = "nvidia" | "openai" | "compatible";

type ChatConfiguration = {
  apiKey: string;
  baseURL?: string;
  model: string;
  provider: ChatProvider;
};

function configured(value: string | undefined) {
  return Boolean(value?.trim());
}

/**
 * Resolve the chat provider without coupling the application to one vendor.
 * NVIDIA's Integrate API implements the OpenAI chat-completions interface, so
 * it can use the same SDK client with its own base URL.
 */
export function getChatConfiguration(): ChatConfiguration | null {
  if (configured(process.env.LLM_API_KEY)) {
    return {
      apiKey: process.env.LLM_API_KEY!,
      baseURL: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      provider: process.env.LLM_PROVIDER === "nvidia" ? "nvidia" : "compatible",
    };
  }

  if (configured(process.env.NVIDIA_API_KEY)) {
    return {
      apiKey: process.env.NVIDIA_API_KEY!,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b",
      provider: "nvidia",
    };
  }

  if (configured(process.env.OPENAI_API_KEY)) {
    return {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      provider: "openai",
    };
  }

  return null;
}

export function getChatClient() {
  const config = getChatConfiguration();
  // A customer-facing widget must degrade quickly when a provider is overloaded.
  // The reply layer has a safe rule-based fallback, so do not spend multiple
  // automatic retries or half a minute waiting for an unavailable model.
  const configuredTimeout = Number(process.env.LLM_TIMEOUT_MS);
  const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20_000;
  return config
    ? {
        config,
        client: new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          timeout,
          maxRetries: 0,
        }),
      }
    : null;
}
