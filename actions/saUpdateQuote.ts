"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saUpdateQuote = async ({
  quoteId,
  title,
  customerId,
  specification,
  createdByAdminUserId,
}: {
  quoteId: string;
  title?: string;
  customerId?: string;
  specification?: string;
  createdByAdminUserId?: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  //find the existing partner
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
      error: "Quote cannot be edited while archived",
    };
  }

  // Build update object with only provided values
  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title;
  if (customerId !== undefined) updateData.customerId = customerId;
  if (specification !== undefined) updateData.specification = specification;
  if (createdByAdminUserId !== undefined)
    updateData.createdByAdminUserId = createdByAdminUserId || null;

  //update the quote
  await db("quote").where({ id: quoteId }).update(updateData);

  return { success: true };
};

export default saUpdateQuote;
