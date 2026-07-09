"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { z } from "zod";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createQuoteOgWithLogo } from "@/lib/createQuoteOgWithLogo";

const cloneQuoteSchema = z.object({
  quoteId: z.string().min(1, "Quote ID is required"),
  targetOrganisationId: z.string().min(1, "Target organisation is required"),
  prompt: z.string().optional(),
});

// Generate a random 6-character short link ID (capital letters and numbers only)
const generateShortLinkId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueShortLinkId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateShortLinkId();
    const existing = await db("quote").where("shortLinkId", id).first();
    if (!existing) return id;
  }
  throw new Error("Failed to generate unique short link ID after 10 attempts");
};

const saCloneQuote = async (input: {
  quoteId: string;
  targetOrganisationId: string;
  prompt?: string;
}): Promise<ServerActionResponse> => {
  const parsed = cloneQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed. Please check your inputs.",
    };
  }

  const { quoteId, targetOrganisationId, prompt } = parsed.data;

  const accessToken = await verifyAccessToken();
  if (!accessToken.superAdmin && !accessToken.partner) {
    return { success: false, error: "Permission denied" };
  }

  try {
    // Fetch source quote with org and partner info
    const sourceQuote = await db("quote")
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
      .where("quote.id", quoteId)
      .select(
        "quote.*",
        "organisation.name as sourceOrgName",
        "organisation.partnerId as sourcePartnerId",
        "partnerOrganisation.name as partnerName",
        db.raw('"providerApiKey"."key" as "providerApiKey"'),
      )
      .first();

    if (!sourceQuote) {
      return { success: false, error: "Source quote not found" };
    }

    // Permission check for partners
    if (accessToken.partner && !accessToken.superAdmin) {
      if (accessToken.partnerId !== sourceQuote.sourcePartnerId) {
        return { success: false, error: "Permission denied" };
      }
    }

    // Fetch target organisation
    const targetOrg = await db("organisation")
      .where("id", targetOrganisationId)
      .select(
        "id",
        "name",
        "about",
        "partnerId",
        "logoFileExtension",
        db.raw('"showLogoOnColour"'),
      )
      .first();

    if (!targetOrg) {
      return { success: false, error: "Target organisation not found" };
    }

    // Permission check: partners can only clone to their own organisations
    if (accessToken.partner && !accessToken.superAdmin) {
      if (accessToken.partnerId !== targetOrg.partnerId) {
        return {
          success: false,
          error: "You can only clone to organisations within your partnership",
        };
      }
    }

    // Generate unique short link
    const shortLinkId = await generateUniqueShortLinkId();

    // Fetch source example conversations
    const sourceConversations = await db("exampleConversation")
      .where("quoteId", quoteId)
      .select("prompt", "description", "startTime", "order")
      .orderByRaw('"order" IS NULL, "order" ASC, id ASC');

    const sourceOrgName = sourceQuote.sourceOrgName || "the organisation";
    const targetOrgName = targetOrg.name || "the organisation";
    const newBackground = targetOrg.about || null;
    const providerApiKey = sourceQuote.providerApiKey;

    // --- AI rewriting ---
    let rewrittenTitle = sourceQuote.title;
    let rewrittenObjectives = sourceQuote.objectives;
    let rewrittenOtherNotes = sourceQuote.otherNotes;
    let rewrittenConceptIntro = null as string | null;
    let rewrittenConcept = null as string | null;
    let rewrittenProposalIntro = null as string | null;
    let rewrittenSpecification = null as string | null;

    const nameSubstitutionPrompt = `You are a helpful assistant. Your task is to take the provided text and replace any mentions of the organisation "${sourceOrgName}" with "${targetOrgName}". This includes:
- The full organisation name ("${sourceOrgName}")
- Any abbreviated or shortened forms of the name
- Any obvious references, nicknames, or domain names that clearly refer to "${sourceOrgName}"

Do not change anything else about the text - keep all other content, formatting, and structure exactly as it is. If the organisation name does not appear in the text in any form, return the text unchanged. Return only the updated text with no preamble or explanation.`;

    if (providerApiKey) {
      const openai = createOpenAI({ apiKey: providerApiKey });

      // Name substitution for title, objectives, dataSources, otherNotes
      const fieldsToSubstitute = [
        { value: sourceQuote.title, label: "title" },
        { value: sourceQuote.objectives, label: "objectives" },
        { value: sourceQuote.otherNotes, label: "otherNotes" },
      ];

      for (const field of fieldsToSubstitute) {
        if (field.value) {
          try {
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: nameSubstitutionPrompt,
              prompt: field.value,
            });
            if (field.label === "title") rewrittenTitle = text;
            if (field.label === "objectives") rewrittenObjectives = text;
            if (field.label === "otherNotes") rewrittenOtherNotes = text;
          } catch (err) {
            console.error(`Error rewriting ${field.label} during clone:`, err);
            // Fall back to original text
          }
        }
      }

      // Full regeneration of generated content (if present in source)
      const hasGeneratedContent =
        sourceQuote.generatedConceptIntroduction ||
        sourceQuote.generatedConcept ||
        sourceQuote.generatedProposalIntroduction ||
        sourceQuote.generatedSpecification;

      if (hasGeneratedContent) {
        const partnerName = sourceQuote.partnerName || "Our company";

        const rewriteContext = `
## Context for Rewriting
- **Original Organisation**: ${sourceOrgName}
- **New Organisation**: ${targetOrgName}
- **New Background**: ${newBackground || "Not provided"}
- **Quote Title**: ${sourceQuote.title}
${rewrittenObjectives ? `- **Objectives**: ${rewrittenObjectives}` : ""}
${rewrittenOtherNotes ? `- **Other Notes**: ${rewrittenOtherNotes}` : ""}
${prompt ? `\n## Additional Instructions from User\n${prompt}` : ""}
`.trim();

        // Rewrite concept introduction
        if (sourceQuote.generatedConceptIntroduction) {
          try {
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: `You are an expert sales consultant for ${partnerName}. You are rewriting a concept introduction that was originally written for "${sourceOrgName}" so that it now applies to "${targetOrgName}". 

Rewrite the content to be about the new organisation, using the new background information provided. Maintain the same style, tone, structure, and level of detail. Do not add new sections or remove existing ones. Write in Markdown format.

IMPORTANT RULES:
- Do NOT thank them for their time or for meeting with us
- Do NOT assume we have had any prior conversations or meetings
- Do NOT ask any questions
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list
- Return only the rewritten content with no preamble

${rewriteContext}`,
              prompt: `Please rewrite the following concept introduction for ${targetOrgName}:\n\n${sourceQuote.generatedConceptIntroduction}`,
            });
            rewrittenConceptIntro = text;
          } catch (err) {
            console.error("Error rewriting concept introduction:", err);
          }
        }

        // Rewrite concept
        if (sourceQuote.generatedConcept) {
          try {
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: `You are an expert sales consultant for ${partnerName}. You are rewriting a concept document that was originally written for "${sourceOrgName}" so that it now applies to "${targetOrgName}".

Rewrite the content to be about the new organisation, using the new background information provided. Maintain the same style, tone, and structure. Adapt industry-specific examples and use cases to the new organisation's context. Write in Markdown format with clear headings (## for main sections and ### for subsections).

IMPORTANT RULES:
- Do NOT thank them for their time or for meeting with us
- Do NOT assume we have had any prior conversations or meetings
- Do NOT ask any questions
- Do NOT include example conversations or WhatsApp message flows
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list
- Return only the rewritten content with no preamble

${rewriteContext}`,
              prompt: `Please rewrite the following concept for ${targetOrgName}:\n\n${sourceQuote.generatedConcept}`,
            });
            rewrittenConcept = text;
          } catch (err) {
            console.error("Error rewriting concept:", err);
          }
        }

        // Rewrite proposal introduction
        if (sourceQuote.generatedProposalIntroduction) {
          try {
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: `You are an expert proposal writer for ${partnerName}. You are rewriting a proposal introduction that was originally written for "${sourceOrgName}" so that it now applies to "${targetOrgName}".

Rewrite the content to be about the new organisation, using the new background information provided. Maintain the same style, tone, and structure. Write in Markdown format.

IMPORTANT RULES:
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list
- Return only the rewritten content with no preamble

${rewriteContext}`,
              prompt: `Please rewrite the following proposal introduction for ${targetOrgName}:\n\n${sourceQuote.generatedProposalIntroduction}`,
            });
            rewrittenProposalIntro = text;
          } catch (err) {
            console.error("Error rewriting proposal introduction:", err);
          }
        }

        // Rewrite specification
        if (sourceQuote.generatedSpecification) {
          try {
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: `You are an expert proposal writer for ${partnerName}. You are rewriting a technical specification that was originally written for "${sourceOrgName}" so that it now applies to "${targetOrgName}".

Rewrite the content to be about the new organisation, using the new background information provided. Adapt technical details and integration specifics to the new organisation's context where appropriate. Maintain the same structure and level of detail. Write in Markdown format.

IMPORTANT RULES:
- Only reference features and capabilities relevant to the new organisation
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list
- Return only the rewritten content with no preamble

${rewriteContext}`,
              prompt: `Please rewrite the following specification for ${targetOrgName}:\n\n${sourceQuote.generatedSpecification}`,
            });
            rewrittenSpecification = text;
          } catch (err) {
            console.error("Error rewriting specification:", err);
          }
        }
      }
    }

    // --- Insert new quote ---
    const [newQuote] = await db("quote")
      .insert({
        organisationId: targetOrganisationId,
        title: rewrittenTitle,
        background: newBackground,
        objectives: rewrittenObjectives,
        otherNotes: rewrittenOtherNotes,
        contractNotes: sourceQuote.contractNotes ?? null,
        createdByAdminUserId: accessToken.adminUserId,
        generatedConceptIntroduction: rewrittenConceptIntro,
        generatedConcept: rewrittenConcept,
        generatedProposalIntroduction: rewrittenProposalIntro,
        generatedSpecification: rewrittenSpecification,
        conceptHideSections: sourceQuote.conceptHideSections || null,
        proposalHideSections: sourceQuote.proposalHideSections || null,
        shortLinkId,
        // Explicitly NOT copied:
        // setupFee, monthlyFee, setupFeeVoxdCost, monthlyFeeVoxdCost, buildDays,
        // freeMonthlyMinutes, contractLength - will take DB defaults
        // heroImageFileExtension - null
        // nextAction, nextActionDate - null
        // signOff* fields - null
        // conceptPersonalMessage, proposalPersonalMessage - null
      })
      .returning("id");

    const newQuoteId = newQuote.id;

    // --- Clone knowledge sources ---
    const sourceKnowledgeSources = await db("quoteKnowledgeSource")
      .where("quoteId", quoteId)
      .select("knowledgeSourceId", "note", "otherName", "otherDescription");

    if (sourceKnowledgeSources.length > 0) {
      await db("quoteKnowledgeSource").insert(
        sourceKnowledgeSources.map((ks: any) => ({
          quoteId: newQuoteId,
          knowledgeSourceId: ks.knowledgeSourceId,
          note: ks.note,
          otherName: ks.otherName,
          otherDescription: ks.otherDescription,
        })),
      );
    }

    // --- Clone integrations ---
    const sourceIntegrations = await db("quoteIntegration")
      .where("quoteId", quoteId)
      .select("integrationId", "note", "otherName", "otherDescription");

    if (sourceIntegrations.length > 0) {
      await db("quoteIntegration").insert(
        sourceIntegrations.map((int: any) => ({
          quoteId: newQuoteId,
          integrationId: int.integrationId,
          note: int.note,
          otherName: int.otherName,
          otherDescription: int.otherDescription,
        })),
      );
    }

    // --- Generate OG image (fire-and-forget) ---
    createQuoteOgWithLogo({
      quoteId: newQuoteId,
      heroImageBuffer: null,
      organisationId: targetOrganisationId,
      organisationLogoFileExtension: targetOrg.logoFileExtension || null,
      organisationShowLogoOnColour: targetOrg.showLogoOnColour || null,
    }).catch((err) => {
      console.error("Failed to generate OG image for cloned quote:", err);
    });

    // --- Re-create example conversations as pending rows ---
    const pendingConversationIds: string[] = [];
    if (sourceConversations.length > 0) {
      for (const conv of sourceConversations) {
        // Rewrite conversation prompt to replace source org name
        let rewrittenPrompt = conv.prompt;
        if (providerApiKey && conv.prompt) {
          try {
            const openai = createOpenAI({ apiKey: providerApiKey });
            const { text } = await generateText({
              model: openai("gpt-5.4"),
              system: nameSubstitutionPrompt,
              prompt: conv.prompt,
            });
            rewrittenPrompt = text;
          } catch (err) {
            console.error(
              "Error rewriting conversation prompt during clone:",
              err,
            );
          }
        }

        const [newConv] = await db("exampleConversation")
          .insert({
            quoteId: newQuoteId,
            prompt: rewrittenPrompt,
            description: "Generating...",
            startTime: "--:--",
            messages: JSON.stringify([]),
            generationStatus: "pending",
            generationErrorSummary: null,
            generationErrorDetail: null,
            order: conv.order,
          })
          .returning("id");

        pendingConversationIds.push(newConv.id);
      }
    }

    return {
      success: true,
      data: { id: newQuoteId, pendingConversationIds },
    };
  } catch (error: any) {
    console.error("Error cloning quote:", error);
    return {
      success: false,
      error: error?.message || "Failed to clone quote",
    };
  }
};

export default saCloneQuote;
