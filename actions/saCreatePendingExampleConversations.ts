"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";

const saCreatePendingExampleConversations = async ({
  prompts,
  quoteId,
}: {
  prompts: string[];
  quoteId: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return { success: false, error: "Quote ID is required" };
  }

  if (!prompts?.length) {
    return { success: false, error: "At least one prompt is required" };
  }

  const accessToken = await verifyAccessToken();
  if (!accessToken.superAdmin && !accessToken.partner) {
    return {
      success: false,
      error: "Only partners and super admins can generate conversations",
    };
  }

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
      error: "You don't have permission to generate conversations for this quote",
    };
  }

  const maxOrderResult = await db("exampleConversation")
    .where("quoteId", quoteId)
    .max("order as maxOrder")
    .first();
  let nextOrder = (maxOrderResult?.maxOrder ?? 0) + 1;
  const conversationIds: string[] = [];

  for (const prompt of prompts) {
    const [inserted] = await db("exampleConversation")
      .insert({
        quoteId,
        prompt,
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

  return { success: true, data: { conversationIds } };
};

export default saCreatePendingExampleConversations;
