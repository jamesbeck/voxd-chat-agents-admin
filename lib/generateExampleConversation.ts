import db from "../database/db";
import {
  experimental_generateImage as generateImage,
  generateObject,
} from "ai";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getAdminAiImageModel,
  getAdminAiLanguageModel,
  resolveAdminAiProvider,
} from "@/lib/adminAi";

const conversationSummarySchema = z
  .string()
  .describe("A very brief summary of the chat, around 20 words.");

const conversationStartTimeSchema = z
  .string()
  .describe(
    "The start time of the chat as a string (HH:mm). Make this realistic based on the action.",
  );

const userMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().describe("The content of the message as HTML"),
  time: z.number().describe("Seconds elapsed since the last message."),
  hasImage: z
    .boolean()
    .optional()
    .describe(
      "Set to true if the user would realistically attach a photo with this message (e.g. showing damage, sharing a product photo, sending a receipt). Only include when it genuinely fits the scenario.",
    ),
  imagePrompt: z
    .string()
    .optional()
    .describe(
      "When hasImage is true, provide a detailed visual description of the photo the user would send, suitable for AI image generation. Describe it as a realistic phone photo (e.g. 'A slightly blurry phone photo of a cracked laptop screen on a wooden desk'). Keep it concise but descriptive.",
    ),
  hasFile: z
    .boolean()
    .optional()
    .describe(
      "Set to true if the user would realistically attach a non-image file with this message (e.g. sending a PDF invoice, a spreadsheet, a contract, a CV/resume). Only include when it genuinely fits the scenario.",
    ),
  fileName: z
    .string()
    .optional()
    .describe(
      "When hasFile is true, provide a realistic filename for the attached document (e.g. 'Invoice_2026_March.pdf', 'Annual_Report.xlsx', 'Contract_v2.docx').",
    ),
  fileSize: z
    .string()
    .optional()
    .describe(
      "When hasFile is true, provide a realistic human-readable file size string (e.g. '2.4 MB', '156 KB', '1.1 MB').",
    ),
});

const assistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().describe("The content of the message as HTML"),
  annotation: z
    .string()
    .describe("A short annotation for assistant messages, around 20 words."),
  time: z.number().describe("Seconds elapsed since the last message."),
  hasImage: z
    .boolean()
    .optional()
    .describe(
      "Set to true if the bot would realistically send a photo in this message (e.g. sending a product photo, a floorplan image, a photo of a property). Only include when it genuinely fits the scenario.",
    ),
  imagePrompt: z
    .string()
    .optional()
    .describe(
      "When hasImage is true, provide a detailed visual description of the photo the bot would send, suitable for AI image generation. Keep it concise but descriptive.",
    ),
  hasFile: z
    .boolean()
    .optional()
    .describe(
      "Set to true if the bot would realistically send a file in this message (e.g. sending a pricelist PDF, a brochure, a floorplan document, a report). Only include when it genuinely fits the scenario.",
    ),
  fileName: z
    .string()
    .optional()
    .describe(
      "When hasFile is true, provide a realistic filename for the document (e.g. 'Pricelist_2026.pdf', 'Property_Brochure.pdf', 'Floorplan_Unit_4B.pdf').",
    ),
  fileSize: z
    .string()
    .optional()
    .describe(
      "When hasFile is true, provide a realistic human-readable file size string (e.g. '2.4 MB', '156 KB', '1.1 MB').",
    ),
});

const openAiUserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().describe("The content of the message as HTML"),
  time: z.number().describe("Seconds elapsed since the last message."),
  hasImage: z
    .boolean()
    .nullable()
    .describe(
      "Set to true if the user would realistically attach a photo with this message (e.g. showing damage, sharing a product photo, sending a receipt). Use null when there is no image.",
    ),
  imagePrompt: z
    .string()
    .nullable()
    .describe(
      "When hasImage is true, provide a detailed visual description of the photo the user would send, suitable for AI image generation. Otherwise use null.",
    ),
  hasFile: z
    .boolean()
    .nullable()
    .describe(
      "Set to true if the user would realistically attach a non-image file with this message (e.g. sending a PDF invoice, a spreadsheet, a contract, a CV/resume). Use null when there is no file.",
    ),
  fileName: z
    .string()
    .nullable()
    .describe(
      "When hasFile is true, provide a realistic filename for the attached document. Otherwise use null.",
    ),
  fileSize: z
    .string()
    .nullable()
    .describe(
      "When hasFile is true, provide a realistic human-readable file size string. Otherwise use null.",
    ),
});

const openAiAssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().describe("The content of the message as HTML"),
  annotation: z
    .string()
    .describe("A short annotation for assistant messages, around 20 words."),
  time: z.number().describe("Seconds elapsed since the last message."),
  hasImage: z
    .boolean()
    .nullable()
    .describe(
      "Set to true if the bot would realistically send a photo in this message. Use null when there is no image.",
    ),
  imagePrompt: z
    .string()
    .nullable()
    .describe(
      "When hasImage is true, provide a detailed visual description of the photo the bot would send, suitable for AI image generation. Otherwise use null.",
    ),
  hasFile: z
    .boolean()
    .nullable()
    .describe(
      "Set to true if the bot would realistically send a file in this message. Use null when there is no file.",
    ),
  fileName: z
    .string()
    .nullable()
    .describe(
      "When hasFile is true, provide a realistic filename for the document. Otherwise use null.",
    ),
  fileSize: z
    .string()
    .nullable()
    .describe(
      "When hasFile is true, provide a realistic human-readable file size string. Otherwise use null.",
    ),
});

const conversationResponseSchema = z.object({
  summary: conversationSummarySchema,
  startTime: conversationStartTimeSchema,
  messages: z.array(
    z.discriminatedUnion("role", [userMessageSchema, assistantMessageSchema]),
  ),
});

const openAiConversationResponseSchema = z.object({
  summary: conversationSummarySchema,
  startTime: conversationStartTimeSchema,
  messages: z.array(
    z.discriminatedUnion("role", [
      openAiUserMessageSchema,
      openAiAssistantMessageSchema,
    ]),
  ),
});

type GeneratedConversationMessage = {
  role: "user" | "assistant";
  content: string;
  time: number;
  annotation?: string;
  hasImage?: boolean | null;
  imagePrompt?: string | null;
  hasFile?: boolean | null;
  fileName?: string | null;
  fileSize?: string | null;
};

function normalizeGeneratedMessages(messages: GeneratedConversationMessage[]) {
  return messages.map((message) => {
    const normalizedMessage: Record<string, unknown> = {
      role: message.role,
      content: message.content,
      time: message.time,
    };

    if (message.role === "assistant" && message.annotation) {
      normalizedMessage.annotation = message.annotation;
    }

    if (message.hasImage === true) {
      normalizedMessage.hasImage = true;

      if (message.imagePrompt) {
        normalizedMessage.imagePrompt = message.imagePrompt;
      }
    }

    if (message.hasFile === true) {
      normalizedMessage.hasFile = true;

      if (message.fileName) {
        normalizedMessage.fileName = message.fileName;
      }

      if (message.fileSize) {
        normalizedMessage.fileSize = message.fileSize;
      }
    }

    return normalizedMessage;
  });
}

/**
 * Core logic for generating an example conversation.
 * Extracted from server action so it can be called from API routes
 * and other server-side code without blocking the server action queue.
 */
export async function generateExampleConversation({
  conversationId,
}: {
  conversationId: string;
}) {
  await markGenerating(conversationId);

  const conversation = await db("exampleConversation")
    .where("id", conversationId)
    .first();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  let providerApiKey: string | null = null;
  let providerName: string | null = null;
  let context: string = "";
  let businessName: string = "";

  if (conversation.quoteId) {
    const quote = await db("quote")
      .leftJoin("organisation", "quote.organisationId", "organisation.id")
      .leftJoin(
        "organisation as partnerOrganisation",
        "organisation.partnerId",
        "partnerOrganisation.id",
      )
      .leftJoin(
        "providerApiKey",
        "partnerOrganisation.providerApiKeyId",
        "providerApiKey.id",
      )
      .leftJoin("provider", "providerApiKey.providerId", "provider.id")
      .where("quote.id", conversation.quoteId)
      .select(
        "quote.*",
        "organisation.name as organisationName",
        "organisation.partnerId",
        db.raw('"providerApiKey"."key" as "providerApiKey"'),
        "provider.name as providerName",
      )
      .first();
    if (!quote) {
      await markError({
        conversationId,
        summary: "Quote not found",
      });
      throw new Error("Quote not found");
    }
    providerApiKey = quote.providerApiKey;
    providerName = quote.providerName;

    // Get knowledge sources linked to this quote
    const quoteKnowledgeSources = await db("quoteKnowledgeSource")
      .leftJoin(
        "knowledgeSource",
        "quoteKnowledgeSource.knowledgeSourceId",
        "knowledgeSource.id",
      )
      .where("quoteKnowledgeSource.quoteId", conversation.quoteId)
      .select(
        "knowledgeSource.name as itemName",
        "quoteKnowledgeSource.otherName",
        "quoteKnowledgeSource.note",
      )
      .orderBy("quoteKnowledgeSource.createdAt", "asc");

    // Get integrations linked to this quote
    const quoteIntegrations = await db("quoteIntegration")
      .leftJoin(
        "integration",
        "quoteIntegration.integrationId",
        "integration.id",
      )
      .where("quoteIntegration.quoteId", conversation.quoteId)
      .select(
        "integration.name as itemName",
        "quoteIntegration.otherName",
        "quoteIntegration.note",
      )
      .orderBy("quoteIntegration.createdAt", "asc");

    const knowledgeSourcesList =
      quoteKnowledgeSources.length > 0
        ? quoteKnowledgeSources
            .map((ks: any) => {
              const name = ks.itemName || ks.otherName;
              return ks.note ? `- ${name}: ${ks.note}` : `- ${name}`;
            })
            .join("\n")
        : "None specified";

    const integrationsList =
      quoteIntegrations.length > 0
        ? quoteIntegrations
            .map((i: any) => {
              const name = i.itemName || i.otherName;
              return i.note ? `- ${name}: ${i.note}` : `- ${name}`;
            })
            .join("\n")
        : "None specified";

    context = `
Background:
${quote.background || "Not specified"}

Objectives:
${quote.objectives || "Not specified"}

Knowledge Sources:
${knowledgeSourcesList}

Integrations:
${integrationsList}

Other Notes:
${quote.otherNotes || "Not specified"}
    `.trim();
    businessName = quote.organisationName || "the organisation";
  } else {
    await markError({
      conversationId,
      summary: "Quote not found",
    });
    throw new Error("Conversation is not associated with a quote");
  }

  if (!providerApiKey || !providerName) {
    await markError({
      conversationId,
      summary: "No API key configured",
    });
    throw new Error("No provider API key configured");
  }

  try {
    const adminAiProvider = resolveAdminAiProvider(providerName);
    const { object } = await generateObject({
      model: getAdminAiLanguageModel({
        providerName,
        apiKey: providerApiKey,
      }),
      schema:
        adminAiProvider === "openai"
          ? openAiConversationResponseSchema
          : conversationResponseSchema,
      prompt: `
        Given the content of the below chat bot specification. Write a message exchange between a user and an AI WhatsApp Chatbot.

        The business name is "${businessName}". You can reference this name in the conversation if/when relevant.

        IMPORTANT: The business the chatbot belongs to is called "${businessName}". Never mention any other company or brand name as the business the bot represents. All references to the bot's parent company must use "${businessName}".

        Please try to make the chat as realistic as possible. The chat bot feels very human like.

        Messages should be no longer than around 150 words.

        When user names appear in the conversation (e.g. the user introduces themselves or the bot addresses them by name), use typical western names as our audience is primarily western. Names like James, Sarah, Tom, Emily, Michael, Sophie, etc. Occasional international names are fine for variety, but the majority should be common western names.

        The user will always send the first message unless specified in the scenario below. If the bot sends the first message, it's always a generic marketing message or notification that triggers a reply/conversation.

        Please return each message as HTML. Only use the following tags <p>, <a>, <ul>/<li>, <ol>/<li>, <b>, <i>, <br/>.

        When the conversation naturally warrants a user sending a photo via WhatsApp (e.g. showing damage to a product, sharing a photo of an item, sending a receipt or document photo), you may set hasImage to true on that user message and provide an imagePrompt describing the realistic phone photo the user would send. Only include images when it genuinely fits the scenario — most conversations won't need images. Not every conversation should have images.

        The bot can also send photos to the user. When the conversation naturally warrants the bot sending a photo (e.g. sharing a product image, sending a photo of a property, showing a floorplan image), you may set hasImage to true on the assistant message and provide an imagePrompt.

        When the conversation naturally warrants a user sending a non-image file via WhatsApp (e.g. a PDF invoice, a spreadsheet, a contract, a CV/resume, a report), you may set hasFile to true on that user message and provide a realistic fileName and fileSize. The fileName should look like a real document name with the correct extension (e.g. 'Invoice_March_2026.pdf', 'Q4_Report.xlsx'). The fileSize should be a realistic human-readable size string (e.g. '2.4 MB', '156 KB'). Only include files when genuinely relevant — most conversations won't have file attachments. A message should not have both an image and a file.

        The bot can also send files to the user (e.g. sending a pricelist, a brochure, a floorplan PDF, a contract). When the bot would realistically send a document, set hasFile to true on the assistant message with a realistic fileName and fileSize.

        Here's the scenario for the chat: ${conversation.prompt}

        IMPORTANT: ONLY reference knowledge sources and integrations that are explicitly listed in the specification below. Do NOT invent, assume or suggest any additional data sources, integrations or system connections beyond what is provided. The chatbot will only have access to the listed knowledge sources and integrations.

        For example conversations, prefer to showcase the chatbot being helpful, capable and well-informed. When a user asks something that would reasonably be answerable using the listed knowledge sources or integrations, assume the chatbot can access enough relevant information to give a satisfactorily informative answer instead of saying it does not know. However, do not imply access to any knowledge, integration or capability that is not explicitly listed below.

        Here's the specification for the bot:
        ${context}
      `,
    });

    const normalizedMessages = normalizeGeneratedMessages(
      object.messages as GeneratedConversationMessage[],
    );

    // Save the generated conversation text first while image processing is still in progress.
    await db("exampleConversation")
      .where("id", conversationId)
      .update({
        messages: JSON.stringify(normalizedMessages),
        description: object.summary,
        startTime: object.startTime,
        generationErrorSummary: null,
        generationErrorDetail: null,
      });

    // Check if any messages have images to generate
    const hasImages = normalizedMessages.some((msg) => msg.hasImage === true);

    if (hasImages) {
      await generateConversationImages({
        conversationId,
        providerApiKey: providerApiKey!,
        providerName: providerName!,
      });
    }

    // Mark generation as complete
    await db("exampleConversation").where("id", conversationId).update({
      generationStatus: "completed",
      generationErrorSummary: null,
      generationErrorDetail: null,
    });
  } catch (error) {
    console.error("Error generating conversation:", error);
    await markError({
      conversationId,
      summary: "Failed to generate conversation",
      detail: getErrorDetail(error),
    });
    throw error;
  }
}

async function generateConversationImages({
  conversationId,
  providerApiKey,
  providerName,
}: {
  conversationId: string;
  providerApiKey: string;
  providerName: string;
}) {
  const conversation = await db("exampleConversation")
    .where("id", conversationId)
    .first();

  if (!conversation) {
    return;
  }

  const messages = conversation.messages || [];

  // Find messages that have hasImage=true but no imageUrl yet
  const imageMessages: { index: number; imagePrompt: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.hasImage === true && msg.imagePrompt && !msg.imageUrl) {
      imageMessages.push({ index: i, imagePrompt: msg.imagePrompt });
    }
  }

  if (imageMessages.length === 0) {
    return;
  }

  const s3Client = new S3Client({
    region: process.env.WASABI_REGION || "eu-west-1",
    endpoint: `https://s3.${
      process.env.WASABI_REGION || "eu-west-1"
    }.wasabisys.com`,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const bucketName = process.env.WASABI_BUCKET_NAME || "voxd";

  for (const { index, imagePrompt } of imageMessages) {
    try {
      const result = await generateImage({
        model: getAdminAiImageModel({
          providerName,
          apiKey: providerApiKey,
        }),
        prompt: imagePrompt,
        size: "1024x1024",
      });

      const buffer = Buffer.from(result.image.uint8Array);
      const key = `exampleConversationImages/${conversationId}_${index}.webp`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: "image/webp",
          ACL: "public-read",
        }),
      );

      const imageUrl = `https://${process.env.NEXT_PUBLIC_WASABI_ENDPOINT}/${bucketName}/${key}`;
      messages[index].imageUrl = imageUrl;
    } catch (imageError) {
      throw new Error(
        `Image generation failed for message ${index + 1}: ${getErrorDetail(imageError)}`,
      );
    }
  }

  await db("exampleConversation")
    .where("id", conversationId)
    .update({
      messages: JSON.stringify(messages),
    });
}

async function markGenerating(conversationId: string) {
  await db("exampleConversation").where("id", conversationId).update({
    generationStatus: "generating",
    generationErrorSummary: null,
    generationErrorDetail: null,
  });
}

async function markError({
  conversationId,
  summary,
  detail,
}: {
  conversationId: string;
  summary: string;
  detail?: string;
}) {
  await db("exampleConversation")
    .where("id", conversationId)
    .update({
      generationStatus: "error",
      generationErrorSummary: summary,
      generationErrorDetail: detail || summary,
    });
}

function getErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
