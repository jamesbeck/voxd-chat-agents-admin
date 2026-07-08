"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

type CreatePendingParams = {
  prompts: string[];
} & (
  | { exampleId: string; quoteId?: never }
  | { quoteId: string; exampleId?: never }
);

const saCreatePendingExampleConversations = async (
  params: CreatePendingParams,
): Promise<ServerActionResponse> => {
  const { prompts, exampleId, quoteId } = params;

  if (!exampleId && !quoteId) {
    return {
      success: false,
      error: "Either exampleId or quoteId must be provided",
    };
  }

  if (!prompts || prompts.length === 0) {
    return {
      success: false,
      error: "At least one prompt is required",
    };
  }

  const accessToken = await verifyAccessToken();

  // Only partners and super admins can generate conversations
  if (!accessToken.superAdmin && !accessToken.partner) {
    return {
      success: false,
      error:
        "Only partners and super admins can generate example conversations",
    };
  }

  // Validate access based on exampleId or quoteId
  if (exampleId) {
    const example = await db("example").where("id", exampleId).first();

    if (!example) {
      return {
        success: false,
        error: "Example not found",
      };
    }

    if (accessToken.partner && !accessToken.superAdmin) {
      if (example.organisationId !== accessToken.partnerId) {
        return {
          success: false,
          error: "You can only generate conversations for your own examples",
        };
      }
    }
  } else if (quoteId) {
    const quote = await db("quote")
      .leftJoin("organisation", "quote.organisationId", "organisation.id")
      .where("quote.id", quoteId)
      .select("quote.*", "organisation.partnerId")
      .first();

    if (!quote) {
      return {
        success: false,
        error: "Quote not found",
      };
    }

    if (quote.archived) {
      return {
        success: false,
        error: "Archived quotes cannot be edited",
      };
    }

    const isSuperAdmin = accessToken.superAdmin;
    const isOwnerPartner =
      accessToken.partner && accessToken.partnerId === quote.partnerId;

    if (!isSuperAdmin && !isOwnerPartner) {
      return {
        success: false,
        error:
          "You don't have permission to generate conversations for this quote",
      };
    }
  }

  // Get the max order for this example/quote
  const maxOrderResult = await db("exampleConversation")
    .where((builder) => {
      if (exampleId) builder.where("exampleId", exampleId);
      if (quoteId) builder.where("quoteId", quoteId);
    })
    .max("order as maxOrder")
    .first();

  let nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;

  // Create pending conversation records
  const conversationIds: string[] = [];

  for (const prompt of prompts) {
    const [inserted] = await db("exampleConversation")
      .insert({
        exampleId: exampleId || null,
        quoteId: quoteId || null,
        prompt: prompt,
        description: "Generating...",
        startTime: "--:--",
        messages: JSON.stringify([]),
        generationStatus: "pending",
        generationErrorSummary: null,
        generationErrorDetail: null,
        order: nextOrder++,
      })
      .returning("id");

    conversationIds.push(inserted.id);
  }

  return {
    success: true,
    data: {
      conversationIds,
    },
  };
};

export default saCreatePendingExampleConversations;
