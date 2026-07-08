import db from "../database/db";
import { getEffectivePartnerBranding } from "@/lib/getEffectivePartnerBranding";

export type PublicQuoteConversation = {
  id: string;
  description: string;
  startTime: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    time: number;
    annotation: string | null;
  }[];
};

export type PublicQuote = {
  id: string;
  title: string;
  createdAt: string;
  shortLinkId: string;
  organisationName: string;
  organisationId: string;
  organisationLogoFileExtension: string | null;
  organisationShowLogoOnColour: string | null;
  partnerOrganisationId: string | null;
  partnerOrganisationPrimaryColour: string | null;
  partnerOrganisationLogoFileExtension: string | null;
  partnerOrganisationShowLogoOnColour: string | null;
  archived: boolean;
  background: string | null;
  objectives: string | null;
  dataSourcesAndIntegrations: string | null;
  otherNotes: string | null;
  contractNotes: string | null;
  proposalPersonalMessage: string | null;
  generatedProposalIntroduction: string | null;
  generatedSpecification: string | null;
  proposalHideSections: string[] | null;
  setupFee: number | null;
  monthlyFee: number | null;
  buildDays: number | null;
  freeMonthlyMinutes: number | null;
  contractLength: number | null;
  heroImageFileExtension: string | null;
  partner: {
    name: string;
    domain: string | null;
    legalName: string | null;
    companyNumber: string | null;
    registeredAddress: string | null;
    legalEmail: string | null;
  };
  salesBot: {
    name: string;
    phoneNumber: string;
  } | null;
  createdBy: {
    name: string | null;
    email: string | null;
  } | null;
  exampleConversations: PublicQuoteConversation[];
  signOff: {
    name: string | null;
    email: string | null;
    position: string | null;
    date: string | null;
    ipAddress: string | null;
  } | null;
};

export const getQuoteForPublic = async ({
  quoteId,
}: {
  quoteId: string;
}): Promise<PublicQuote | null> => {
  // Determine if quoteId is a short link (6 chars, uppercase letters and numbers) or UUID
  const isShortLink = /^[A-Z0-9]{6}$/.test(quoteId);

  const query = db("quote")
    .leftJoin("organisation", "quote.organisationId", "organisation.id")
    .leftJoin(
      "organisation as partnerOrg",
      "organisation.partnerId",
      "partnerOrg.id",
    )
    .leftJoin("adminUser", "quote.createdByAdminUserId", "adminUser.id")
    .leftJoin("agent", "partnerOrg.salesBotAgentId", "agent.id")
    .leftJoin("phoneNumber", "agent.phoneNumberId", "phoneNumber.id");

  // Look up by shortLinkId or quote.id depending on format
  if (isShortLink) {
    query.where("quote.shortLinkId", quoteId);
  } else {
    query.where("quote.id", quoteId);
  }

  const quote = await query
    .select(
      "quote.id",
      "quote.title",
      "quote.createdAt",
      "quote.shortLinkId",
      "quote.archived",
      "quote.background",
      "quote.objectives",
      "quote.dataSourcesAndIntegrations",
      "quote.otherNotes",
      "quote.contractNotes",
      "quote.proposalPersonalMessage",
      "quote.generatedProposalIntroduction",
      "quote.generatedSpecification",
      "quote.proposalHideSections",
      "quote.setupFee",
      "quote.monthlyFee",
      "quote.buildDays",
      "quote.freeMonthlyMinutes",
      "quote.contractLength",
      "quote.heroImageFileExtension",
      "organisation.id as organisationId",
      "organisation.name as organisationName",
      "organisation.logoFileExtension as organisationLogoFileExtension",
      db.raw(
        'organisation."showLogoOnColour" as "organisationShowLogoOnColour"',
      ),
      db.raw('"partnerOrg".id as "partnerOrganisationId"'),
      db.raw(
        '"partnerOrg"."primaryColour" as "partnerOrganisationPrimaryColour"',
      ),
      db.raw(
        '"partnerOrg"."logoFileExtension" as "partnerOrganisationLogoFileExtension"',
      ),
      db.raw(
        '"partnerOrg"."showLogoOnColour" as "partnerOrganisationShowLogoOnColour"',
      ),
      "partnerOrg.name as partnerName",
      "partnerOrg.domain as partnerDomain",
    )
    .select(
      "partnerOrg.legalName as partnerLegalName",
      "partnerOrg.companyNumber as partnerCompanyNumber",
      "partnerOrg.registeredAddress as partnerRegisteredAddress",
      "partnerOrg.legalEmail as partnerLegalEmail",
      "partnerOrg.salesBotName",
      "phoneNumber.displayPhoneNumber as salesBotPhoneNumber",
      "adminUser.name as createdByName",
      "adminUser.email as createdByEmail",
      "quote.signOffName",
      "quote.signOffEmail",
      "quote.signOffPosition",
      "quote.signOffDate",
      "quote.signOffIPAddress",
    )
    .first();

  if (!quote) {
    return null;
  }

  const effectivePartnerBranding = await getEffectivePartnerBranding({
    partnerId: quote.partnerOrganisationId,
  });

  // Get example conversations for this quote
  // Order by "order" field first (nulls last), then by id for consistent ordering
  const conversations = await db("exampleConversation")
    .where("quoteId", quote.id)
    .select("id", "description", "startTime", "messages")
    .orderByRaw('"order" IS NULL, "order" ASC, id ASC');

  // Parse the messages JSON for each conversation
  const parsedConversations = conversations.map((conv) => ({
    id: conv.id,
    description: conv.description,
    startTime: conv.startTime,
    messages: (typeof conv.messages === "string"
      ? JSON.parse(conv.messages)
      : conv.messages
    ).map(
      (m: {
        role: string;
        content: string;
        time: number;
        annotation?: string | null;
        imageUrl?: string;
        fileName?: string;
        fileSize?: string;
      }) => ({
        role: m.role,
        content: m.content,
        time: m.time,
        annotation: m.annotation || null,
        imageUrl: m.imageUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
      }),
    ),
  }));

  return {
    id: quote.id,
    title: quote.title,
    createdAt: quote.createdAt,
    shortLinkId: quote.shortLinkId,
    organisationName: quote.organisationName,
    organisationId: quote.organisationId,
    organisationLogoFileExtension: quote.organisationLogoFileExtension,
    organisationShowLogoOnColour: quote.organisationShowLogoOnColour ?? null,
    partnerOrganisationId:
      effectivePartnerBranding?.sourceOrganisationId ?? null,
    partnerOrganisationPrimaryColour:
      effectivePartnerBranding?.primaryColour ?? null,
    partnerOrganisationLogoFileExtension:
      effectivePartnerBranding?.logoFileExtension ?? null,
    partnerOrganisationShowLogoOnColour:
      effectivePartnerBranding?.showLogoOnColour ?? null,
    archived: quote.archived,
    background: quote.background,
    objectives: quote.objectives,
    dataSourcesAndIntegrations: quote.dataSourcesAndIntegrations,
    otherNotes: quote.otherNotes,
    contractNotes: quote.contractNotes,
    proposalPersonalMessage: quote.proposalPersonalMessage,
    generatedProposalIntroduction: quote.generatedProposalIntroduction,
    generatedSpecification: quote.generatedSpecification,
    proposalHideSections: quote.proposalHideSections,
    setupFee: quote.setupFee,
    monthlyFee: quote.monthlyFee,
    buildDays: quote.buildDays,
    freeMonthlyMinutes: quote.freeMonthlyMinutes,
    contractLength: quote.contractLength,
    heroImageFileExtension: quote.heroImageFileExtension,
    partner: {
      name: effectivePartnerBranding?.name || "Voxd",
      domain: effectivePartnerBranding?.domain ?? null,
      legalName: effectivePartnerBranding?.legalName ?? null,
      companyNumber: effectivePartnerBranding?.companyNumber ?? null,
      registeredAddress: effectivePartnerBranding?.registeredAddress ?? null,
      legalEmail: effectivePartnerBranding?.legalEmail ?? null,
    },
    salesBot:
      quote.salesBotName && quote.salesBotPhoneNumber
        ? {
            name: quote.salesBotName,
            phoneNumber: quote.salesBotPhoneNumber,
          }
        : null,
    createdBy:
      quote.createdByName || quote.createdByEmail
        ? {
            name: quote.createdByName,
            email: quote.createdByEmail,
          }
        : null,
    exampleConversations: parsedConversations,
    signOff:
      quote.signOffName || quote.signOffEmail
        ? {
            name: quote.signOffName,
            email: quote.signOffEmail,
            position: quote.signOffPosition,
            date: quote.signOffDate,
            ipAddress: quote.signOffIPAddress,
          }
        : null,
  };
};

export default getQuoteForPublic;
