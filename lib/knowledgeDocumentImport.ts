import { embedMany, generateObject } from "ai";
import { z } from "zod";
import type { Knex } from "knex";
import db from "@/database/db";
import { extractWebsiteText } from "@/lib/extractWebsiteText";
import {
  getAdminAiEmbeddingModel,
  getAdminAiLanguageModel,
} from "@/lib/adminAi";

const blockSchema = z.object({
  blocks: z.array(
    z.object({
      title: z
        .string()
        .describe(
          "A short descriptive title for this knowledge block (max 100 chars)",
        ),
      content: z
        .string()
        .describe(
          "The knowledge block content. Should be 300-1500 characters, self-contained and coherent",
        ),
    }),
  ),
});

type KnowledgeDocumentImportContext = {
  id: string;
  agentId: string;
  title: string;
  sourceType: string | null;
  sourceUrl: string | null;
  providerApiKey: string;
  providerName: string;
  providerId: string;
  embeddingProviderApiKey: string;
  embeddingProviderName: string;
  embeddingProviderId: string;
  embeddingModelName: string | null;
  modelName: string | null;
};

type ImportStrategy = "ai" | "preserve-all";

type ImportedSection = {
  title: string;
  content: string;
};

function normalizeParagraphs(text: string) {
  return text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function truncateForTitle(value: string, maxLength = 100) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildKnowledgeBlocksPreservingAllText(text: string) {
  const paragraphs = normalizeParagraphs(text);

  if (!paragraphs.length) {
    return [] as { title: string; content: string }[];
  }

  const minBlockLength = 350;
  const targetBlockLength = 1100;
  const maxBlockLength = 1600;
  const blocks: { title: string; content: string }[] = [];

  let currentParagraphs: string[] = [];
  let currentLength = 0;

  const flushBlock = () => {
    if (!currentParagraphs.length) {
      return;
    }

    const titleSource = currentParagraphs.slice(0, 2).join(": ");
    blocks.push({
      title: truncateForTitle(titleSource),
      content: currentParagraphs.join("\n\n"),
    });
    currentParagraphs = [];
    currentLength = 0;
  };

  for (const paragraph of paragraphs) {
    const separatorLength = currentParagraphs.length > 0 ? 2 : 0;
    const nextLength = currentLength + separatorLength + paragraph.length;

    if (
      currentParagraphs.length > 0 &&
      nextLength > maxBlockLength &&
      currentLength >= minBlockLength
    ) {
      flushBlock();
    }

    currentParagraphs.push(paragraph);
    currentLength += (currentParagraphs.length > 1 ? 2 : 0) + paragraph.length;

    if (currentLength >= targetBlockLength) {
      flushBlock();
    }
  }

  flushBlock();

  return blocks;
}

export function buildKnowledgeBlocksFromSections(sections: ImportedSection[]) {
  if (!sections.length) {
    return [] as { title: string; content: string }[];
  }

  const blocks: { title: string; content: string }[] = [];
  const targetBlockLength = 1200;
  const maxBlockLength = 1700;

  for (const section of sections) {
    const paragraphs = normalizeParagraphs(section.content);

    if (!paragraphs.length) {
      continue;
    }

    let currentParagraphs: string[] = [];
    let currentLength = 0;

    const flushSectionBlock = () => {
      if (!currentParagraphs.length) {
        return;
      }

      blocks.push({
        title: truncateForTitle(section.title),
        content: currentParagraphs.join("\n\n"),
      });
      currentParagraphs = [];
      currentLength = 0;
    };

    for (const paragraph of paragraphs) {
      const separatorLength = currentParagraphs.length > 0 ? 2 : 0;
      const nextLength = currentLength + separatorLength + paragraph.length;

      if (currentParagraphs.length > 0 && nextLength > maxBlockLength) {
        flushSectionBlock();
      }

      currentParagraphs.push(paragraph);
      currentLength +=
        (currentParagraphs.length > 1 ? 2 : 0) + paragraph.length;

      if (currentLength >= targetBlockLength) {
        flushSectionBlock();
      }
    }

    flushSectionBlock();
  }

  return blocks;
}

async function generateKnowledgeBlocksWithAi({
  providerApiKey,
  providerName,
  text,
}: {
  providerApiKey: string;
  providerName: string;
  text: string;
}) {
  const { object } = await generateObject({
    model: getAdminAiLanguageModel({
      providerName,
      apiKey: providerApiKey,
    }),
    schema: blockSchema,
    prompt: `You are a knowledge base assistant. Split the following text into semantic knowledge blocks for a RAG (Retrieval Augmented Generation) system.

Each knowledge block should:
- Be a self-contained piece of information (ideally 300-1500 characters)
- Have a short, descriptive title that summarizes its content
- Preserve complete thoughts and context
- Not split mid-sentence or mid-idea
- Be useful as a standalone piece of knowledge that can answer questions

If the text came from a website and still contains navigation labels, cookie notices, footer links, legal boilerplate, or other interface chrome, ignore that noise and focus on the substantive content.

Create knowledge blocks that would be helpful when retrieved to answer user questions about this content.

Text to process:
${text}`,
  });

  return object.blocks;
}

function getExecutor(trx?: Knex | Knex.Transaction) {
  return trx || db;
}

export async function getKnowledgeDocumentImportContext({
  documentId,
  trx,
}: {
  documentId: string;
  trx?: Knex | Knex.Transaction;
}): Promise<KnowledgeDocumentImportContext> {
  const executor = getExecutor(trx);

  const document = await executor("knowledgeDocument")
    .join("agent", "knowledgeDocument.agentId", "agent.id")
    .leftJoin("model", "agent.modelId", "model.id")
    .leftJoin(
      "model as embeddingModel",
      "agent.embeddingModelId",
      "embeddingModel.id",
    )
    .leftJoin("providerApiKey", "agent.providerApiKeyId", "providerApiKey.id")
    .leftJoin("provider", "providerApiKey.providerId", "provider.id")
    .leftJoin(
      "providerApiKey as embeddingProviderApiKey",
      "agent.embeddingProviderApiKeyId",
      "embeddingProviderApiKey.id",
    )
    .leftJoin(
      "provider as embeddingProvider",
      "embeddingProviderApiKey.providerId",
      "embeddingProvider.id",
    )
    .where("knowledgeDocument.id", documentId)
    .select(
      "knowledgeDocument.id",
      "knowledgeDocument.agentId",
      "knowledgeDocument.title",
      "knowledgeDocument.sourceType",
      "knowledgeDocument.sourceUrl",
      db.raw('"providerApiKey"."key" as "providerApiKey"'),
      "provider.name as providerName",
      "provider.id as providerId",
      db.raw(
        '"embeddingProviderApiKey"."key" as "embeddingProviderApiKey"',
      ),
      "embeddingProvider.name as embeddingProviderName",
      "embeddingProvider.id as embeddingProviderId",
      "embeddingModel.model as embeddingModelName",
      "model.model as modelName",
    )
    .first();

  if (!document) {
    throw new Error("Document not found");
  }

  if (!document.providerApiKey) {
    throw new Error("Agent does not have a provider API key configured");
  }

  if (!document.providerName) {
    throw new Error("Agent provider API key is missing its provider");
  }

  if (!document.embeddingProviderApiKey) {
    throw new Error(
      "Agent does not have an embedding provider API key configured",
    );
  }

  if (!document.embeddingProviderName) {
    throw new Error("Agent embedding API key is missing its provider");
  }

  if (!document.embeddingModelName) {
    throw new Error("Agent does not have an embedding model configured");
  }

  return document;
}

export async function importKnowledgeBlocksFromText({
  documentId,
  text,
  providerApiKey,
  providerName,
  providerId,
  embeddingProviderApiKey,
  embeddingProviderName,
  embeddingProviderId,
  embeddingModelName,
  trx,
  strategy = "ai",
  blocks,
}: {
  documentId: string;
  text: string;
  providerApiKey: string;
  providerName?: string;
  providerId?: string;
  embeddingProviderApiKey?: string;
  embeddingProviderName?: string;
  embeddingProviderId?: string;
  embeddingModelName?: string | null;
  modelName?: string | null;
  trx?: Knex | Knex.Transaction;
  strategy?: ImportStrategy;
  blocks?: { title: string; content: string }[];
}) {
  const executor = getExecutor(trx);
  const resolvedContext =
    !providerName ||
    !providerId ||
    !embeddingProviderApiKey ||
    !embeddingProviderName ||
    !embeddingProviderId ||
    !embeddingModelName
      ? await getKnowledgeDocumentImportContext({ documentId, trx })
      : null;
  const resolvedProviderName = providerName ?? resolvedContext!.providerName;
  const resolvedEmbeddingProviderApiKey =
    embeddingProviderApiKey ?? resolvedContext!.embeddingProviderApiKey;
  const resolvedEmbeddingProviderName =
    embeddingProviderName ?? resolvedContext!.embeddingProviderName;
  const resolvedEmbeddingProviderId =
    embeddingProviderId ?? resolvedContext!.embeddingProviderId;
  const resolvedEmbeddingModelName =
    embeddingModelName ?? resolvedContext!.embeddingModelName;

  if (!resolvedEmbeddingModelName) {
    throw new Error("Agent does not have an embedding model configured");
  }

  const lastBlock = await executor("knowledgeBlock")
    .where("documentId", documentId)
    .orderBy("blockIndex", "desc")
    .first();

  const startIndex = lastBlock ? lastBlock.blockIndex + 1 : 0;

  const resolvedBlocks =
    blocks ??
    (strategy === "preserve-all"
      ? buildKnowledgeBlocksPreservingAllText(text)
      : await generateKnowledgeBlocksWithAi({
          providerApiKey,
          providerName: resolvedProviderName,
          text,
        }));

  if (!resolvedBlocks.length) {
    throw new Error("No knowledge blocks were generated from the text");
  }

  const embeddingInput = resolvedBlocks.map((block) =>
    block.title ? `${block.title}\n\n${block.content}` : block.content,
  );

  const embeddingResult = await embedMany({
    model: getAdminAiEmbeddingModel({
      providerName: resolvedEmbeddingProviderName,
      apiKey: resolvedEmbeddingProviderApiKey,
      modelId: resolvedEmbeddingModelName,
    }),
    values: embeddingInput,
  });

  const embeddingModel = resolvedEmbeddingModelName;
  const blockRecords = resolvedBlocks.map((block, index) => ({
    documentId,
    content: block.content,
    title: block.title,
    blockIndex: startIndex + index,
    tokenCount: Math.ceil(embeddingInput[index].length / 4),
    embedding: embeddingResult.embeddings[index]
      ? `[${embeddingResult.embeddings[index].join(",")}]`
      : null,
    embeddingProviderId: resolvedEmbeddingProviderId,
    embeddingModel,
    embeddingDimensions: embeddingResult.embeddings[index]?.length ?? 0,
  }));

  await executor("knowledgeBlock").insert(blockRecords);

  return {
    blocksCreated: resolvedBlocks.length,
    generatedBlocks: resolvedBlocks,
  };
}

export async function refreshKnowledgeDocumentFromUrl({
  documentId,
  trx,
}: {
  documentId: string;
  trx?: Knex | Knex.Transaction;
}) {
  const executor = getExecutor(trx);
  const document = await getKnowledgeDocumentImportContext({ documentId, trx });

  if (document.sourceType !== "url" || !document.sourceUrl) {
    throw new Error("This document is not configured for URL import");
  }

  const extracted = await extractWebsiteText({ url: document.sourceUrl });

  await executor("knowledgeBlock").where("documentId", documentId).delete();

  const sectionBlocks = extracted.sections.length
    ? buildKnowledgeBlocksFromSections(extracted.sections)
    : undefined;

  const importResult = await importKnowledgeBlocksFromText({
    documentId,
    text: extracted.text,
    providerApiKey: document.providerApiKey,
    providerName: document.providerName,
    providerId: document.providerId,
    embeddingProviderApiKey: document.embeddingProviderApiKey,
    embeddingProviderName: document.embeddingProviderName,
    embeddingProviderId: document.embeddingProviderId,
    embeddingModelName: document.embeddingModelName,
    modelName: document.modelName,
    trx,
    strategy: "preserve-all",
    blocks: sectionBlocks,
  });

  await executor("knowledgeDocument").where({ id: documentId }).update({
    updatedAt: executor.fn.now(),
  });

  return {
    ...importResult,
    pageTitle: extracted.pageTitle,
    sourceUrl: extracted.sourceUrl,
    extractedText: extracted.text,
  };
}
