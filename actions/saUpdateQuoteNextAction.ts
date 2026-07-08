"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saUpdateQuoteNextAction = async ({
  quoteId,
  nextAction,
  nextActionDate,
}: {
  quoteId: string;
  nextAction?: string | null;
  nextActionDate?: string | null;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  // Find the existing quote
  const existingQuote = await db("quote")
    .select("*")
    .where({ id: quoteId })
    .first();

  if (!existingQuote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (existingQuote.archived) {
    return {
      success: false,
      error: "Next actions cannot be edited while the quote is archived",
    };
  }

  // Build update object with only provided values
  const updateData: Record<string, any> = {};
  if (nextAction !== undefined) updateData.nextAction = nextAction || null;
  if (nextActionDate !== undefined)
    updateData.nextActionDate = nextActionDate || null;

  // Update the quote
  await db("quote").where({ id: quoteId }).update(updateData);

  return { success: true };
};

export default saUpdateQuoteNextAction;
