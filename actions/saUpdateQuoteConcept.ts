"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { generateQuoteCostingInternal } from "./saGenerateQuoteCosting";

const saUpdateQuoteConcept = async ({
  quoteId,
  conceptPersonalMessage,
  generatedConceptIntroduction,
  generatedConcept,
  conceptHideSections,
}: {
  quoteId: string;
  conceptPersonalMessage?: string;
  generatedConceptIntroduction?: string;
  generatedConcept?: string;
  conceptHideSections?: string[];
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return {
      success: false,
      error: "Quote ID is required",
    };
  }

  const existingQuote = await db("quote")
    .select("id")
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
      error: "Quote concept cannot be edited while archived",
    };
  }

  // Build update object with only provided values
  const updateData: Record<string, any> = {};
  if (conceptPersonalMessage !== undefined)
    updateData.conceptPersonalMessage = conceptPersonalMessage;
  if (generatedConceptIntroduction !== undefined)
    updateData.generatedConceptIntroduction = generatedConceptIntroduction;
  if (generatedConcept !== undefined)
    updateData.generatedConcept = generatedConcept;
  if (conceptHideSections !== undefined)
    updateData.conceptHideSections = conceptHideSections;

  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }

  await db("quote").where({ id: quoteId }).update(updateData);

  // Recalculate costing if concept content changed
  if (
    generatedConceptIntroduction !== undefined ||
    generatedConcept !== undefined
  ) {
    await generateQuoteCostingInternal({ quoteId, source: "concept" });
  }

  return { success: true };
};

export default saUpdateQuoteConcept;
