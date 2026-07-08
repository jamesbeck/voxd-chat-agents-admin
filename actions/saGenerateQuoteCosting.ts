"use server";

import db from "../database/db";
import { generateObject } from "ai";
import { z } from "zod";
import { CostingBreakdown } from "@/types/types";
import { verifyAccessToken } from "@/lib/auth/verifyToken";
import { hasAdminUserPermission } from "@/lib/adminUserPermissions";
import userCanViewQuote from "@/lib/quoteAccess";
import { getAdminAiLanguageModel } from "@/lib/adminAi";

const DEFAULT_HOURLY_RATE = 100;
const DEFAULT_MONTHLY_BASE = 150;
const DEFAULT_MONTHLY_PER_INTEGRATION = 50;
const MINIMUM_SETUP_FEE = 250;
const MINIMUM_BUILD_DAYS = 1;
const HOURS_PER_DAY = 5;

const costingSchema = z.object({
  integrations: z.array(
    z.object({
      name: z
        .string()
        .describe(
          "The name of the integration or external service, e.g. 'Microsoft 365', 'Salesforce', 'Google Workspace'",
        ),
      tasks: z.array(
        z.object({
          name: z
            .string()
            .describe(
              "The name of the task or function, e.g. 'Initial Setup & Tooling', 'Check Calendar Availability', 'Create Lead'",
            ),
          hours: z
            .number()
            .describe(
              "Estimated hours for a human developer to code this function/tool",
            ),
          description: z
            .string()
            .describe(
              "A description of what this function/tool does and justification for the time estimate, e.g. 'Queries the Microsoft Graph API to check a user's calendar availability for a given date range. Requires OAuth2 setup, pagination handling, and timezone normalisation.'",
            ),
        }),
      ),
    }),
  ),
});

export const generateQuoteCostingInternal = async ({
  quoteId,
  source,
}: {
  quoteId: string;
  source: "concept" | "proposal";
}): Promise<{
  success: boolean;
  error?: string;
  data?: {
    costingBreakdown: CostingBreakdown;
    setupFeeVoxdCost: number;
    monthlyFeeVoxdCost: number;
    buildDays: number;
  };
}> => {
  if (!quoteId) {
    return { success: false, error: "Quote ID is required" };
  }

  const quote = await db("quote")
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
    .leftJoin("provider", "providerApiKey.providerId", "provider.id")
    .select(
      "quote.*",
      "organisation.name as organisationName",
      db.raw('"providerApiKey"."key" as "providerApiKey"'),
      "provider.name as providerName",
      "partnerOrganisation.name as partnerName",
      "partnerOrganisation.hourlyRate as partnerHourlyRateVoxdCost",
      "partnerOrganisation.monthlyBaseFee",
      "partnerOrganisation.monthlyPerIntegration",
    )
    .where({ "quote.id": quoteId })
    .first();

  if (!quote) {
    return { success: false, error: "Quote not found" };
  }

  if (!quote.providerApiKey || !quote.providerName) {
    return {
      success: false,
      error: "Partner does not have a provider API key configured",
    };
  }

  const hourlyRate =
    quote.partnerHourlyRateVoxdCost != null
      ? Number(quote.partnerHourlyRateVoxdCost)
      : quote.hourlyRateVoxdCost != null
        ? Number(quote.hourlyRateVoxdCost)
        : DEFAULT_HOURLY_RATE;
  const monthlyBase = quote.monthlyBaseFee ?? DEFAULT_MONTHLY_BASE;
  const monthlyPerIntegration =
    quote.monthlyPerIntegration ?? DEFAULT_MONTHLY_PER_INTEGRATION;

  // Determine input text based on source (used as context for task estimation)
  const inputText =
    source === "concept"
      ? [quote.generatedConceptIntroduction, quote.generatedConcept]
          .filter(Boolean)
          .join("\n\n")
      : [quote.generatedProposalIntroduction, quote.generatedSpecification]
          .filter(Boolean)
          .join("\n\n");

  if (!inputText) {
    return {
      success: false,
      error: `No ${source} content available to estimate costing`,
    };
  }

  // Fetch integrations linked to this quote
  const quoteIntegrations = await db("quoteIntegration")
    .leftJoin("integration", "quoteIntegration.integrationId", "integration.id")
    .where("quoteIntegration.quoteId", quoteId)
    .select(
      "integration.name as itemName",
      "integration.description as itemDescription",
      "integration.setupHours",
      "quoteIntegration.otherName",
      "quoteIntegration.otherDescription",
      "quoteIntegration.note",
    )
    .orderBy("quoteIntegration.createdAt", "asc");

  // If no integrations, save empty breakdown with zero costs
  if (quoteIntegrations.length === 0) {
    const setupFeeVoxdCost = MINIMUM_SETUP_FEE;

    const costingBreakdown: CostingBreakdown = {
      integrations: [],
      totalIntegrationTime: 0,
      totalIntegrationCost: setupFeeVoxdCost,
      totalMonthly: monthlyBase,
      costingCalculatedFrom: source,
    };

    await db("quote")
      .where({ id: quoteId })
      .update({
        costingBreakdown: JSON.stringify(costingBreakdown),
        setupFeeVoxdCost,
        monthlyFeeVoxdCost: costingBreakdown.totalMonthly,
        hourlyRateVoxdCost: hourlyRate,
        buildDays: MINIMUM_BUILD_DAYS,
      });

    return {
      success: true,
      data: {
        costingBreakdown,
        setupFeeVoxdCost,
        monthlyFeeVoxdCost: costingBreakdown.totalMonthly,
        buildDays: MINIMUM_BUILD_DAYS,
      },
    };
  }

  // Build the integration list for the prompt
  const integrationListText = quoteIntegrations
    .map((i: any, idx: number) => {
      const name = i.itemName || i.otherName;
      const isCustom = !i.itemName;
      const setupInfo =
        !isCustom && i.setupHours != null
          ? `Setup hours: ${i.setupHours}`
          : "Setup hours: estimate required";
      const desc = i.itemDescription || i.otherDescription;
      const parts = [`${idx + 1}. **${name}** (${setupInfo})`];
      if (desc) parts.push(`   Description: ${desc}`);
      if (i.note) parts.push(`   Note: ${i.note}`);
      return parts.join("\n");
    })
    .join("\n");

  // Build existing costing context for consistency
  const existingCosting = quote.costingBreakdown as CostingBreakdown | null;
  const existingCostingContext = existingCosting
    ? `\n\n## Previous Costing Breakdown (reference only)

The following is the previous costing breakdown. Use it as a REFERENCE for time estimate consistency — if a function for an integration has not materially changed, keep the same time estimate to avoid price fluctuations.

\`\`\`json
${JSON.stringify(existingCosting.integrations, null, 2)}
\`\`\`

Previous calculation was based on: ${existingCosting.costingCalculatedFrom}`
    : "";

  const systemPrompt = `You are an expert at estimating development costs for WhatsApp AI chatbot integrations.

You will be given a FIXED LIST of integrations that the chatbot requires. You MUST produce a cost breakdown for EACH integration listed and ONLY these integrations. Do NOT add, remove, or rename any integrations.

For each integration, you must identify the individual tools/functions that a developer will need to code for the AI agent to interact with that service, and provide an honest time estimate in hours for each.

Rules:
- Every integration MUST include an "Initial Setup & Tooling" task that covers authentication setup, API client configuration, and basic tooling.
- Where setup hours are provided for an integration, you MUST use that exact value for the "Initial Setup & Tooling" task hours. Do not change it.
- Where setup hours say "estimate required", estimate the setup hours yourself (typically 2-4 hours depending on complexity).
- Each additional function/tool should represent a distinct capability the AI agent needs (e.g. "Check Calendar Availability", "Create Lead", "Send Email").
- Use the ${source} text provided as context to determine what specific functions each integration needs.
- Time estimates should be LEAN. These functions are being built by experienced developers who work with these APIs daily, using existing tooling and patterns. Do not overestimate.
- For each task, provide a clear description of what the function does and justify the time estimate.

CALIBRATION EXAMPLES — Use these as a guide for typical time estimates:

Google Workspace / Gmail Calendar:
- Initial Setup & Tooling: 2 hours (OAuth2 config, API client, basic auth flow)
- Check availability of a specific user: 0.5 hours (query calendar API, parse free/busy slots)
- Save new calendar event: 1.5 hours (create event with attendees, location, reminders)

Salesforce CRM:
- Initial Setup & Tooling: 3 hours (OAuth2 connected app, API client, token refresh)
- Check if contact already exists by email: 0.5 hours (SOQL query, parse response)
- Create lead and add all opportunity information: 2 hours (create lead, create opportunity, link records)

Time estimates can be as low as 0.25 hours (15 minutes) for very simple tasks. Most simple read/query functions take 0.5-1 hour. Write/create functions typically take 1-2 hours. Setup tasks typically take 2-3 hours. Only complex multi-step functions with significant business logic should exceed 2 hours.${existingCostingContext}`;

  const userPrompt = `## Integrations to Cost

${integrationListText}

## ${source === "concept" ? "Concept" : "Proposal"} Context

The following ${source} text provides context for what functions each integration will need:\n\n${inputText}`;

  try {
    const { object } = await generateObject({
      model: getAdminAiLanguageModel({
        providerName: quote.providerName,
        apiKey: quote.providerApiKey,
      }),
      schema: costingSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Calculate totals server-side to avoid AI maths errors
    const totalIntegrationTime = object.integrations.reduce(
      (total, integration) =>
        total + integration.tasks.reduce((sum, task) => sum + task.hours, 0),
      0,
    );

    const buildDays = Math.max(
      Math.ceil(totalIntegrationTime / HOURS_PER_DAY),
      MINIMUM_BUILD_DAYS,
    );

    const totalIntegrationCost = Math.max(
      totalIntegrationTime * hourlyRate,
      MINIMUM_SETUP_FEE,
    );

    const costingBreakdown: CostingBreakdown = {
      integrations: object.integrations,
      totalIntegrationTime,
      totalIntegrationCost,
      totalMonthly:
        monthlyBase + object.integrations.length * monthlyPerIntegration,
      costingCalculatedFrom: source,
    };

    // Save breakdown and update Voxd cost fields
    await db("quote")
      .where({ id: quoteId })
      .update({
        costingBreakdown: JSON.stringify(costingBreakdown),
        setupFeeVoxdCost: costingBreakdown.totalIntegrationCost,
        monthlyFeeVoxdCost: costingBreakdown.totalMonthly,
        hourlyRateVoxdCost: hourlyRate,
        buildDays,
      });

    return {
      success: true,
      data: {
        costingBreakdown,
        setupFeeVoxdCost: costingBreakdown.totalIntegrationCost,
        monthlyFeeVoxdCost: costingBreakdown.totalMonthly,
        buildDays,
      },
    };
  } catch (error) {
    console.error("Error generating quote costing:", error);
    return {
      success: false,
      error: "Failed to generate costing estimate",
    };
  }
};

const saGenerateQuoteCosting = async ({
  quoteId,
  source,
}: {
  quoteId: string;
  source: "concept" | "proposal";
}) => {
  const accessToken = await verifyAccessToken();

  if (!(await userCanViewQuote({ quoteId, accessToken }))) {
    return { success: false, error: "Quote not found" };
  }

  const quote = await db("quote")
    .select("archived")
    .where({ id: quoteId })
    .first();

  if (!quote) {
    return { success: false, error: "Quote not found" };
  }

  if (quote.archived) {
    return {
      success: false,
      error: "Archived quotes cannot be edited",
    };
  }

  const canViewCostPrice =
    !!accessToken.superAdmin ||
    (!!accessToken.adminUserId &&
      (await hasAdminUserPermission({
        adminUserId: accessToken.adminUserId,
        permissionKey: "view_cost_price",
      })));

  if (!canViewCostPrice) {
    return {
      success: false,
      error: "You don't have permission to view quote cost pricing",
    };
  }

  if (!accessToken.superAdmin) {
    return {
      success: false,
      error: "You don't have permission to update quote cost pricing",
    };
  }

  return generateQuoteCostingInternal({ quoteId, source });
};

export default saGenerateQuoteCosting;
