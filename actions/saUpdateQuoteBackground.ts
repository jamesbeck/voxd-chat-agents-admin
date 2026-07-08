"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";

const saUpdateQuoteBackground = async ({
  quoteId,
  background,
}: {
  quoteId: string;
  background?: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  // Find the existing quote
  const existingQuote = await db("quote").where({ id: quoteId }).first();

  if (!existingQuote) {
    return {
      success: false,
      error: "Quote not found",
    };
  }

  if (existingQuote.archived) {
    return {
      success: false,
      error: "Quote background cannot be edited while archived",
    };
  }

  // Update the quote background
  await db("quote").where({ id: quoteId }).update({
    background,
  });

  return { success: true };
};

export default saUpdateQuoteBackground;
