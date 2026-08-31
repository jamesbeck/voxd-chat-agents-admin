"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

const saReorderExampleConversations = async ({
  quoteId,
  conversationIds,
}: {
  quoteId: string;
  conversationIds: string[];
}): Promise<ServerActionResponse> => {
  if (!quoteId) return { success: false, error: "Quote ID is required" };
  if (!conversationIds?.length) {
    return { success: false, error: "Conversation IDs are required" };
  }

  const accessToken = await verifyAccessToken();
  const quote = await db("quote")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .where("quote.id", quoteId)
    .select("quote.*", "organisation.partnerId")
    .first();

  if (!quote) return { success: false, error: "Quote not found" };
  if (quote.archived) {
    return { success: false, error: "Archived quotes cannot be edited" };
  }

  const isOwnerPartner =
    accessToken.partner && accessToken.partnerId === quote.partnerId;
  if (!accessToken.superAdmin && !isOwnerPartner) {
    return {
      success: false,
      error: "You don't have permission to reorder these conversations",
    };
  }

  await Promise.all(
    conversationIds.map((id, index) =>
      db("exampleConversation")
        .where({ id, quoteId })
        .update({ order: index + 1 }),
    ),
  );

  return { success: true };
};

export default saReorderExampleConversations;
