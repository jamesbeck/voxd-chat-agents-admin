"use server";

import { generateText } from "ai";
import getAgentById from "@/lib/getAgentById";
import getSessionById from "@/lib/getSessionById";
import { getAdminAiLanguageModelById } from "@/lib/adminAi";
import { ServerActionResponse } from "@/types/types";
import db from "@/database/db";

type TranslationMap = Record<string, string>;

type MessageRow = {
  id: string;
  text: string | null;
  translations: TranslationMap | null;
};

type TargetLanguage = "en";

const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  en: "English",
};

const translateMessageText = async ({
  text,
  targetLanguage,
  model,
}: {
  text: string;
  targetLanguage: TargetLanguage;
  model: any;
}) => {
  const targetLabel = LANGUAGE_LABELS[targetLanguage];

  const result = await generateText({
    model,
    prompt: `Translate the following message into ${targetLabel}.

Rules:
- Return only the translated message text.
- Preserve the original meaning and tone.
- Preserve markdown, list structure, line breaks, and obvious formatting.
- Do not add commentary, quotes, or explanations.
- If the text is already in ${targetLabel}, return it unchanged.

Message:
${text}`,
  });

  return result.text.trim();
};

const getMessagesForTranslation = async ({
  sessionId,
}: {
  sessionId: string;
}) => {
  const [userMessages, assistantMessages, manualMessages] = await Promise.all([
    db("userMessage")
      .select("id", "text", "translations")
      .where({ sessionId })
      .orderBy("createdAt", "asc"),
    db("assistantMessage")
      .select("id", "text", "translations")
      .where({ sessionId })
      .orderBy("createdAt", "asc"),
    db("manualMessage")
      .select("id", "text", "translations")
      .where({ sessionId })
      .orderBy("createdAt", "asc"),
  ]);

  return {
    userMessages: userMessages as MessageRow[],
    assistantMessages: assistantMessages as MessageRow[],
    manualMessages: manualMessages as MessageRow[],
  };
};

const buildUpdates = async ({
  rows,
  targetLanguage,
  model,
}: {
  rows: MessageRow[];
  targetLanguage: TargetLanguage;
  model: any;
}) => {
  const updates: Array<{ id: string; translations: TranslationMap }> = [];
  let skippedExisting = 0;
  let skippedEmpty = 0;

  for (const row of rows) {
    const existingTranslations = row.translations ?? {};
    const trimmedText = row.text?.trim() ?? "";

    if (!trimmedText) {
      skippedEmpty += 1;
      continue;
    }

    if (existingTranslations[targetLanguage]) {
      skippedExisting += 1;
      continue;
    }

    const translatedText = await translateMessageText({
      text: trimmedText,
      targetLanguage,
      model,
    });

    updates.push({
      id: row.id,
      translations: {
        ...existingTranslations,
        [targetLanguage]: translatedText,
      },
    });
  }

  return {
    updates,
    skippedExisting,
    skippedEmpty,
  };
};

const saTranslateSession = async ({
  sessionId,
  targetLanguage,
}: {
  sessionId: string;
  targetLanguage: TargetLanguage;
}): Promise<ServerActionResponse> => {
  try {
    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required.",
      };
    }

    if (!(targetLanguage in LANGUAGE_LABELS)) {
      return {
        success: false,
        error: "Unsupported target language.",
      };
    }

    const session = await getSessionById({ sessionId });

    if (!session) {
      return {
        success: false,
        error: "Session not found.",
      };
    }

    const agent = await getAgentById({ agentId: session.agentId });

    if (
      !agent ||
      !agent.providerApiKey ||
      !agent.providerApiKeyProviderName ||
      !agent.model
    ) {
      return {
        success: false,
        error:
          "This agent is missing a configured text model or provider API key.",
      };
    }

    const model = getAdminAiLanguageModelById({
      providerName: agent.providerApiKeyProviderName,
      apiKey: agent.providerApiKey,
      modelId: agent.model,
    });

    const { userMessages, assistantMessages, manualMessages } =
      await getMessagesForTranslation({ sessionId });

    const [userResult, assistantResult, manualResult] = await Promise.all([
      buildUpdates({ rows: userMessages, targetLanguage, model }),
      buildUpdates({ rows: assistantMessages, targetLanguage, model }),
      buildUpdates({ rows: manualMessages, targetLanguage, model }),
    ]);

    await db.transaction(async (trx) => {
      for (const update of userResult.updates) {
        await trx("userMessage").where({ id: update.id }).update({
          translations: update.translations,
        });
      }

      for (const update of assistantResult.updates) {
        await trx("assistantMessage").where({ id: update.id }).update({
          translations: update.translations,
        });
      }

      for (const update of manualResult.updates) {
        await trx("manualMessage").where({ id: update.id }).update({
          translations: update.translations,
        });
      }
    });

    return {
      success: true,
      data: {
        targetLanguage,
        translatedCount:
          userResult.updates.length +
          assistantResult.updates.length +
          manualResult.updates.length,
        skippedExistingCount:
          userResult.skippedExisting +
          assistantResult.skippedExisting +
          manualResult.skippedExisting,
        skippedEmptyCount:
          userResult.skippedEmpty +
          assistantResult.skippedEmpty +
          manualResult.skippedEmpty,
      },
    };
  } catch (error) {
    console.error("Error translating session:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An error occurred while translating the session.",
    };
  }
};

export default saTranslateSession;
