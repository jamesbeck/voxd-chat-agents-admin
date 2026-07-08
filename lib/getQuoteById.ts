import db from "../database/db";
import { CostingBreakdown } from "@/types/types";
import getPartnerAncestorMarkupMultipliers from "@/lib/getPartnerAncestorMarkupMultipliers";
import { getEffectivePartnerBranding } from "@/lib/getEffectivePartnerBranding";
import getPartnerLineage from "@/lib/getPartnerLineage";

export type QuoteConversation = {
  id: string;
  description: string;
  prompt: string;
  startTime: string;
  generationStatus?: "pending" | "generating" | "completed" | "error";
  generationErrorSummary?: string | null;
  generationErrorDetail?: string | null;
  messages: {
    role: "user" | "assistant";
    content: string;
    annotation: string | null;
    time: number;
  }[];
};

export type QuoteLinkedItem = {
  id: string;
  itemId: string | null;
  itemName: string | null;
  itemDescription: string | null;
  otherName: string | null;
  otherDescription: string | null;
  note: string | null;
};

export type QuotePricingChainStep = {
  billedToPartnerId: string;
  billedToPartnerName: string;
  billedByPartnerId: string | null;
  billedByPartnerName: string;
  setupFeeMultiplier: number;
  monthlyFeeMultiplier: number;
  hourlyRateMultiplier: number;
};

export type Quote = {
  id: string;
  title: string;
  createdAt: string;
  organisationId: string;
  organisationName: string;
  partnerId: string | null;
  parentPartnerId: string | null;
  parentPartnerName: string | null;
  effectivePartnerName: string | null;
  archived: boolean;
  background: string | null;
  objectives: string | null;
  dataSourcesAndIntegrations: string | null;
  otherNotes: string | null;
  contractNotes: string | null;
  setupFee: number | null;
  monthlyFee: number | null;
  setupFeeVoxdCost: number | null;
  monthlyFeeVoxdCost: number | null;
  effectiveSetupFeeVoxdCost: number | null;
  effectiveMonthlyFeeVoxdCost: number | null;
  exampleConversations: QuoteConversation[];
  createdByAdminUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  generatedConceptIntroduction: string | null;
  generatedConcept: string | null;
  conceptPersonalMessage: string | null;
  conceptHideSections: string[] | null;
  generatedProposalIntroduction: string | null;
  generatedSpecification: string | null;
  proposalPersonalMessage: string | null;
  proposalHideSections: string[] | null;
  heroImageFileExtension: string | null; // Hero image file extension for quote
  nextAction: string | null;
  nextActionDate: string | null;
  shortLinkId: string;
  buildDays: number | null;
  freeMonthlyMinutes: number | null;
  contractLength: number | null;
  costingBreakdown: CostingBreakdown | null;
  hourlyRate: number | null;
  hourlyRateVoxdCost: number | null;
  effectiveHourlyRateVoxdCost: number | null;
  partnerHourlyRateVoxdCost: number | null;
  partnerMonthlyBaseFee: number | null;
  partnerMonthlyPerIntegration: number | null;
  partnerPricingChain: QuotePricingChainStep[];
  quoteIntegrations: QuoteLinkedItem[];
  quoteKnowledgeSources: QuoteLinkedItem[];
};

export const getQuoteById = async ({
  quoteId,
}: {
  quoteId: string;
}): Promise<Quote | null> => {
  const applyMarkup = (
    value: number | string | null | undefined,
    multiplier: number,
  ): number | null => {
    if (value == null) {
      return null;
    }

    return Number((Number(value) * multiplier).toFixed(2));
  };

  const quote = await db("quote")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .leftJoin(
      "organisation as partnerOrganisation",
      "organisation.partnerId",
      "partnerOrganisation.id",
    )
    .leftJoin(
      "organisation as parentPartnerOrganisation",
      "partnerOrganisation.partnerId",
      "parentPartnerOrganisation.id",
    )
    .leftJoin("adminUser", "quote.createdByAdminUserId", "adminUser.id")
    .where("quote.id", quoteId)
    .select(
      "quote.*",
      "organisation.name as organisationName",
      "organisation.partnerId as partnerId",
      "partnerOrganisation.partnerId as parentPartnerId",
      "parentPartnerOrganisation.name as parentPartnerName",
      "parentPartnerOrganisation.hourlyRate as partnerHourlyRateVoxdCost",
      "parentPartnerOrganisation.monthlyBaseFee as partnerMonthlyBaseFee",
      "parentPartnerOrganisation.monthlyPerIntegration as partnerMonthlyPerIntegration",
      "adminUser.name as ownerName",
      "adminUser.email as ownerEmail",
    )
    .first();

  if (!quote) {
    return null;
  }

  const markupMultipliers = await getPartnerAncestorMarkupMultipliers({
    partnerId: quote.partnerId,
  });
  const effectivePartnerBranding = await getEffectivePartnerBranding({
    partnerId: quote.partnerId,
  });
  const partnerLineage = await getPartnerLineage({
    partnerId: quote.partnerId,
  });
  const partnerPricingChain = await Promise.all(
    partnerLineage.map(async (partner, index) => {
      const multipliers = await getPartnerAncestorMarkupMultipliers({
        partnerId: partner.id,
      });
      const upstreamPartner = partnerLineage[index + 1];

      return {
        billedToPartnerId: partner.id,
        billedToPartnerName: partner.name,
        billedByPartnerId: upstreamPartner?.id ?? null,
        billedByPartnerName: upstreamPartner?.name ?? "Voxd",
        setupFeeMultiplier: multipliers.setupFeeMultiplier,
        monthlyFeeMultiplier: multipliers.monthlyFeeMultiplier,
        hourlyRateMultiplier: multipliers.hourlyRateMultiplier,
      } satisfies QuotePricingChainStep;
    }),
  ).then((steps) =>
    steps.filter(
      (step) =>
        !(
          step.billedByPartnerId == null &&
          step.billedToPartnerName.trim().toLowerCase() === "voxd"
        ),
    ),
  );

  // Get example conversations for this quote
  // Order by "order" field first (nulls last), then by id for consistent ordering
  const conversations = await db("exampleConversation")
    .where("quoteId", quoteId)
    .select(
      "id",
      "description",
      "prompt",
      "startTime",
      "messages",
      "order",
      "generationStatus",
      "generationErrorSummary",
      "generationErrorDetail",
    )
    .orderByRaw('"order" IS NULL, "order" ASC, id ASC');

  // Parse the messages JSON for each conversation
  const parsedConversations = conversations.map((conv) => ({
    ...conv,
    messages:
      typeof conv.messages === "string"
        ? JSON.parse(conv.messages)
        : conv.messages,
  }));

  // Get integrations linked to this quote
  const quoteIntegrations = await db("quoteIntegration")
    .leftJoin("integration", "quoteIntegration.integrationId", "integration.id")
    .where("quoteIntegration.quoteId", quoteId)
    .select(
      "quoteIntegration.id",
      "quoteIntegration.integrationId as itemId",
      "integration.name as itemName",
      "integration.description as itemDescription",
      "quoteIntegration.otherName",
      "quoteIntegration.otherDescription",
      "quoteIntegration.note",
    )
    .orderBy("quoteIntegration.createdAt", "asc");

  // Get knowledge sources linked to this quote
  const quoteKnowledgeSources = await db("quoteKnowledgeSource")
    .leftJoin(
      "knowledgeSource",
      "quoteKnowledgeSource.knowledgeSourceId",
      "knowledgeSource.id",
    )
    .where("quoteKnowledgeSource.quoteId", quoteId)
    .select(
      "quoteKnowledgeSource.id",
      "quoteKnowledgeSource.knowledgeSourceId as itemId",
      "knowledgeSource.name as itemName",
      "knowledgeSource.description as itemDescription",
      "quoteKnowledgeSource.otherName",
      "quoteKnowledgeSource.otherDescription",
      "quoteKnowledgeSource.note",
    )
    .orderBy("quoteKnowledgeSource.createdAt", "asc");

  return {
    ...quote,
    parentPartnerName: quote.parentPartnerName ?? null,
    effectivePartnerName: effectivePartnerBranding?.name ?? null,
    setupFeeVoxdCost:
      quote.setupFeeVoxdCost != null ? Number(quote.setupFeeVoxdCost) : null,
    monthlyFeeVoxdCost:
      quote.monthlyFeeVoxdCost != null
        ? Number(quote.monthlyFeeVoxdCost)
        : null,
    hourlyRateVoxdCost:
      quote.hourlyRateVoxdCost != null
        ? Number(quote.hourlyRateVoxdCost)
        : null,
    effectiveSetupFeeVoxdCost: applyMarkup(
      quote.setupFeeVoxdCost,
      markupMultipliers.setupFeeMultiplier,
    ),
    effectiveMonthlyFeeVoxdCost: applyMarkup(
      quote.monthlyFeeVoxdCost,
      markupMultipliers.monthlyFeeMultiplier,
    ),
    effectiveHourlyRateVoxdCost: applyMarkup(
      quote.hourlyRateVoxdCost,
      markupMultipliers.hourlyRateMultiplier,
    ),
    partnerPricingChain,
    exampleConversations: parsedConversations,
    quoteIntegrations,
    quoteKnowledgeSources,
  };
};

export default getQuoteById;
