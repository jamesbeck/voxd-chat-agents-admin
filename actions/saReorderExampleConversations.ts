"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

const saReorderExampleConversations = async ({
  quoteId,
  exampleId,
  conversationIds,
}: {
  quoteId?: string;
  exampleId?: string;
  conversationIds: string[];
}): Promise<ServerActionResponse> => {
  if (!quoteId && !exampleId) {
    return {
      success: false,
      error: "Either Quote ID or Example ID is required",
    };
  }

  if (!conversationIds || conversationIds.length === 0) {
    return {
      success: false,
      error: "Conversation IDs are required",
    };
  }

  const accessToken = await verifyAccessToken();

  let partnerId: string | null = null;

  if (quoteId) {
    // Get the quote with organisation and partner data
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
    partnerId = quote.partnerId;
  } else if (exampleId) {
    // Get the example with partner data
    const example = await db("example")
      .where("example.id", exampleId)
      .select("example.*")
      .first();

    if (!example) {
      return {
        success: false,
        error: "Example not found",
      };
    }
    partnerId = example.organisationId;
  }

  // Check if user is super admin or the partner that owns this quote/example
  const isSuperAdmin = accessToken.superAdmin;
  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === partnerId;

  if (!isSuperAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to reorder these conversations",
    };
  }

  // Update the order for each conversation
  const whereClause = quoteId ? { quoteId } : { exampleId };
  await Promise.all(
    conversationIds.map((id, index) =>
      db("exampleConversation")
        .where({ id, ...whereClause })
        .update({ order: index + 1 }),
    ),
  );

  return { success: true };
};

export default saReorderExampleConversations;
