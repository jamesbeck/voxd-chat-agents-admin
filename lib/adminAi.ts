import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";

export type AdminAiTaskType = "text" | "image";

export type AdminAiProviderSlug = "openai" | "google" | "anthropic" | "groq";

type AdminAiProviderClient = {
  languageModel: (modelId: string) => any;
  textEmbeddingModel?: (modelId: string) => any;
  imageModel?: (modelId: string) => any;
};

const ADMIN_AI_ENV_MAP: Record<
  AdminAiProviderSlug,
  Record<AdminAiTaskType, string>
> = {
  openai: {
    text: "ADMIN_AI_OPENAI_TEXT_MODEL",
    image: "ADMIN_AI_OPENAI_IMAGE_MODEL",
  },
  google: {
    text: "ADMIN_AI_GOOGLE_TEXT_MODEL",
    image: "ADMIN_AI_GOOGLE_IMAGE_MODEL",
  },
  anthropic: {
    text: "ADMIN_AI_ANTHROPIC_TEXT_MODEL",
    image: "ADMIN_AI_ANTHROPIC_IMAGE_MODEL",
  },
  groq: {
    text: "ADMIN_AI_GROQ_TEXT_MODEL",
    image: "ADMIN_AI_GROQ_IMAGE_MODEL",
  },
};

function normalizeProviderKey(providerName: string) {
  return providerName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function resolveAdminAiProvider(
  providerName: string,
): AdminAiProviderSlug {
  const normalized = normalizeProviderKey(providerName);

  if (normalized.includes("openai")) {
    return "openai";
  }

  if (normalized.includes("google") || normalized.includes("gemini")) {
    return "google";
  }

  if (normalized.includes("anthropic") || normalized.includes("claude")) {
    return "anthropic";
  }

  if (normalized.includes("groq")) {
    return "groq";
  }

  throw new Error(
    `Unsupported admin AI provider \"${providerName}\". Add support in lib/adminAi.ts before using this provider for portal functions.`,
  );
}

function getAdminAiProviderClient({
  provider,
  apiKey,
}: {
  provider: AdminAiProviderSlug;
  apiKey: string;
}): AdminAiProviderClient {
  switch (provider) {
    case "openai": {
      const client = createOpenAI({ apiKey });

      return {
        languageModel: (modelId) => client.languageModel(modelId),
        textEmbeddingModel: (modelId) => client.textEmbeddingModel(modelId),
        imageModel: (modelId) => client.imageModel(modelId),
      };
    }
    case "google": {
      const client = createGoogleGenerativeAI({ apiKey });

      return {
        languageModel: (modelId) => client.languageModel(modelId),
        textEmbeddingModel: (modelId) => client.textEmbeddingModel(modelId),
        imageModel: (modelId) => client.image(modelId),
      };
    }
    case "anthropic": {
      const client = createAnthropic({ apiKey });

      return {
        languageModel: (modelId) => client.languageModel(modelId),
      };
    }
    case "groq": {
      const client = createGroq({ apiKey });

      return {
        languageModel: (modelId) => client.languageModel(modelId),
      };
    }
  }
}

export function getAdminAiModelId({
  providerName,
  taskType,
}: {
  providerName: string;
  taskType: AdminAiTaskType;
}) {
  const provider = resolveAdminAiProvider(providerName);
  const envVarName = ADMIN_AI_ENV_MAP[provider][taskType];
  const modelId = process.env[envVarName];

  if (!modelId) {
    throw new Error(
      `Missing ${envVarName} environment variable for ${providerName} ${taskType} admin AI requests.`,
    );
  }

  return modelId;
}

export function getAdminAiLanguageModel({
  providerName,
  apiKey,
}: {
  providerName: string;
  apiKey: string;
}) {
  return getAdminAiLanguageModelById({
    providerName,
    apiKey,
    modelId: getAdminAiModelId({ providerName, taskType: "text" }),
  });
}

export function getAdminAiLanguageModelById({
  providerName,
  apiKey,
  modelId,
}: {
  providerName: string;
  apiKey: string;
  modelId: string;
}) {
  const provider = resolveAdminAiProvider(providerName);
  const client = getAdminAiProviderClient({ provider, apiKey });

  return client.languageModel(modelId);
}

export function getAdminAiEmbeddingModel({
  providerName,
  apiKey,
  modelId,
}: {
  providerName: string;
  apiKey: string;
  modelId: string;
}) {
  const provider = resolveAdminAiProvider(providerName);
  const client = getAdminAiProviderClient({ provider, apiKey });

  if (!client.textEmbeddingModel) {
    throw new Error(
      `${providerName} does not support admin embedding requests through the configured AI SDK provider.`,
    );
  }

  return client.textEmbeddingModel(modelId);
}

export function getAdminAiImageModel({
  providerName,
  apiKey,
}: {
  providerName: string;
  apiKey: string;
}) {
  const provider = resolveAdminAiProvider(providerName);
  const client = getAdminAiProviderClient({ provider, apiKey });

  if (!client.imageModel) {
    throw new Error(
      `${providerName} does not support admin image generation through the configured AI SDK provider.`,
    );
  }

  return client.imageModel(
    getAdminAiModelId({ providerName, taskType: "image" }),
  );
}
