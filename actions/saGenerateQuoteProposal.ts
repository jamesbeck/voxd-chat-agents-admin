"use server";

import db from "../database/db";
import { ServerActionResponse } from "@/types/types";
import { generateText } from "ai";
import { generateQuoteCostingInternal } from "./saGenerateQuoteCosting";
import { getAdminAiLanguageModel } from "@/lib/adminAi";
import { applyAiAgentTerminology } from "@/lib/aiAgentTerminology";

const getPartnerContext = (partnerName: string) => `## About ${partnerName}

${partnerName} provides AI agent solutions that help businesses automate customer interactions across WhatsApp, websites, web apps and mobile apps.

### How ${partnerName} Works:
1. **WhatsApp Integration**: We use the Meta API to add webhooks to WhatsApp Business Accounts (WABAs)
2. **Website, Web App and Mobile App Deployment**: The same AI agent can also be embedded into websites and integrated into web apps and mobile apps with the same core functionality
3. **Message Processing**: Incoming messages are saved to our database and queued for processing
4. **AI-Powered Responses**: Each message is sent to an LLM (Large Language Model) along with:
   - An agent-specific prompt customized for the business
   - Any attached media (images, documents) that the AI can understand and include in the conversation context
   - Full conversation history
   - User data and history (name, previous orders, etc.)
   - Relevant information from external applications (user account details, addresses, etc.)
   - Tools giving the LLM real-time access to external systems (CRM and back-office systems)
   - Tools providing access to unlimited knowledge documents (policies, FAQs, general information, product lists, menus, etc.)
5. **Response Delivery**: The AI-generated reply is saved and sent back to the user via the relevant channel, including WhatsApp, website chat and app-based experiences

### Workers System:
${partnerName} runs "workers" - separate AI-powered scripts that monitor conversations and perform actions outside the message reply mechanism:
- Monitor conversation sentiment and notify customer service reps if users are unhappy
- Send user details to sales teams when they show sufficient interest
- Workers can be scheduled to run at specific times after conversations end
- Workers can reply to users, useful for continuing quiet conversations or providing order updates

### Outbound Messaging:
- ${partnerName} can send outbound messages to users
- For first-time contacts: Messages must use Meta-approved templates
- Within 24-hour reply window: Messages can be free-form
- Meta charges for "cold" messages, but replies within the window are free
- Outbound messages can be used for marketing campaigns such as promotions, product launches, re-engagement and personalised offers
- What makes WhatsApp outbound marketing unique is that recipients can reply directly to marketing messages, which triggers a live conversation with the AI agent
- This transforms traditional one way marketing into an interactive two way experience, far more engaging than email or SMS

### Key Benefits:
- 24/7 automated customer support via WhatsApp
- One AI agent that can be deployed across WhatsApp, websites, web apps and mobile apps
- Intelligent AI responses with full context awareness
- Integration with existing business systems
- Proactive customer engagement through workers
- Cost-effective messaging within reply windows
- Interactive outbound marketing where customers can reply and engage with the AI agent
- Offer multilingual support for diverse customer bases`;

const saGenerateQuoteProposal = async ({
  quoteId,
  extraPrompt,
  mode = "scratch",
  existingIntroduction,
  existingSpecification,
}: {
  quoteId: string;
  extraPrompt?: string;
  mode?: "scratch" | "amend";
  existingIntroduction?: string;
  existingSpecification?: string;
}): Promise<ServerActionResponse> => {
  if (!quoteId) {
    return { success: false, error: "Quote ID is required" };
  }

  // Get the quote with all specification details and partner's API key
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
      "partnerOrganisation.name as partnerName",
      db.raw('"providerApiKey"."key" as "providerApiKey"'),
      "provider.name as providerName",
    )
    .where({ "quote.id": quoteId })
    .first();

  if (!quote) {
    return { success: false, error: "Quote not found" };
  }

  // Check if partner has a provider API key
  if (!quote.providerApiKey || !quote.providerName) {
    return {
      success: false,
      error: "Partner does not have a provider API key configured",
    };
  }

  // Get the partner context with dynamic name
  const partnerName = quote.partnerName || "Our company";
  const partnerContext = getPartnerContext(partnerName);

  // Get knowledge sources linked to this quote
  const quoteKnowledgeSources = await db("quoteKnowledgeSource")
    .leftJoin(
      "knowledgeSource",
      "quoteKnowledgeSource.knowledgeSourceId",
      "knowledgeSource.id",
    )
    .where("quoteKnowledgeSource.quoteId", quoteId)
    .select(
      "knowledgeSource.name as itemName",
      "quoteKnowledgeSource.otherName",
      "quoteKnowledgeSource.note",
    )
    .orderBy("quoteKnowledgeSource.createdAt", "asc");

  // Get integrations linked to this quote
  const quoteIntegrations = await db("quoteIntegration")
    .leftJoin("integration", "quoteIntegration.integrationId", "integration.id")
    .where("quoteIntegration.quoteId", quoteId)
    .select(
      "integration.name as itemName",
      "quoteIntegration.otherName",
      "quoteIntegration.note",
    )
    .orderBy("quoteIntegration.createdAt", "asc");

  // Check if there's any specification content to work with
  const hasContent =
    quote.background ||
    quote.objectives ||
    quoteKnowledgeSources.length > 0 ||
    quoteIntegrations.length > 0 ||
    quote.otherNotes;

  if (!hasContent) {
    return {
      success: false,
      error:
        "Please add some specification details before generating the proposal",
    };
  }

  // Build the specification context
  const specificationContext = `
## Quote Details
- **Title**: ${quote.title}
- **Organisation**: ${quote.organisationName}

## Provided Specification

${quote.background ? `### Background\n${quote.background}\n` : ""}
${quote.objectives ? `### Objectives\n${quote.objectives}\n` : ""}
${
  quoteKnowledgeSources.length > 0
    ? `### Knowledge Sources\n${quoteKnowledgeSources
        .map((ks: any) => {
          const name = ks.itemName || ks.otherName;
          return ks.note ? `- **${name}**: ${ks.note}` : `- **${name}**`;
        })
        .join("\n")}\n`
    : ""
}
${
  quoteIntegrations.length > 0
    ? `### Integrations\n${quoteIntegrations
        .map((i: any) => {
          const name = i.itemName || i.otherName;
          return i.note ? `- **${name}**: ${i.note}` : `- **${name}**`;
        })
        .join("\n")}\n`
    : ""
}
${quote.otherNotes ? `### Other Notes\n${quote.otherNotes}\n` : ""}
`.trim();

  try {
    // Build amend-specific context if in amend mode
    const isAmendMode =
      mode === "amend" && existingIntroduction && existingSpecification;

    // Build the introduction system prompt
    const introSystemPrompt = isAmendMode
      ? `You are an expert proposal writer for ${partnerName}, a company that provides AI agents across WhatsApp, websites, web apps and mobile apps.

${partnerContext}

The above context is for YOUR UNDERSTANDING ONLY of what ${partnerName} does. Do NOT automatically include all ${partnerName} capabilities in the proposal.

Your task is to AMEND an existing proposal introduction based on the user's instructions. You have the existing introduction and should modify it according to their specific requests while maintaining the overall structure and purpose.

The introduction should:
- Welcome the client and thank them for their interest
- Briefly explain that we provide AI agent solutions across WhatsApp, websites, web apps and mobile apps
- Set the stage for the detailed specification that follows
- Be warm, professional, and confident
- Reference ONLY the client's specific needs as mentioned in their specification
- Be exactly 2 paragraphs
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list

TERMINOLOGY: Always refer to the solution as an "AI agent", "AI assistant" or "agent". Never use "chatbot" or "chat bot" in the generated content, even if those terms appear in the source material or existing content.

IMPORTANT: Only reference features and capabilities that the client has specifically mentioned or requested. The only default platform context you may mention without it being explicitly requested is that the AI agent can be deployed across WhatsApp, websites, web apps and mobile apps. Do not add optional features or suggest additional capabilities beyond what they've asked for. Outbound messaging, workers and other optional capabilities should only be mentioned when they are clearly relevant to the client's specification or the user explicitly asks for them. ONLY reference knowledge sources and integrations that are explicitly listed in the specification. Do NOT invent, assume or suggest any additional data sources, integrations or system connections beyond what is provided.

Write in Markdown format. Use **bold** for emphasis. Do not use headings in this section - it will be displayed under an "Introduction" heading.

EXISTING INTRODUCTION TO AMEND:
${existingIntroduction}

USER'S AMENDMENT INSTRUCTIONS:
${extraPrompt || "Please improve and refine the existing content."}`
      : `You are an expert proposal writer for ${partnerName}, a company that provides AI agents across WhatsApp, websites, web apps and mobile apps.

${partnerContext}

The above context is for YOUR UNDERSTANDING ONLY of what ${partnerName} does. Do NOT automatically include all ${partnerName} capabilities in the proposal.

Your task is to write a compelling, professional INTRODUCTION section for a client proposal. This introduction should:
- Welcome the client and thank them for their interest
- Briefly explain that we provide AI agent solutions across WhatsApp, websites, web apps and mobile apps
- Set the stage for the detailed specification that follows
- Be warm, professional, and confident
- Reference ONLY the client's specific needs as mentioned in their specification
- Be exactly 2 paragraphs
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list

TERMINOLOGY: Always refer to the solution as an "AI agent", "AI assistant" or "agent". Never use "chatbot" or "chat bot" in the generated content, even if those terms appear in the source material.

IMPORTANT: Only reference features and capabilities that the client has specifically mentioned or requested. The only default platform context you may mention without it being explicitly requested is that the AI agent can be deployed across WhatsApp, websites, web apps and mobile apps. Do not add optional features or suggest additional capabilities beyond what they've asked for. Outbound messaging, workers and other optional capabilities should only be mentioned when they are clearly relevant to the client's specification or the user explicitly asks for them. ONLY reference knowledge sources and integrations that are explicitly listed in the specification. Do NOT invent, assume or suggest any additional data sources, integrations or system connections beyond what is provided.

Write in Markdown format. Use **bold** for emphasis. Do not use headings in this section - it will be displayed under an "Introduction" heading.${
          extraPrompt
            ? `\n\nADDITIONAL INSTRUCTIONS FROM USER:\n${extraPrompt}`
            : ""
        }`;

    const introPrompt = isAmendMode
      ? `Please amend the existing proposal introduction for the following client based on the amendment instructions provided:\n\n${specificationContext}`
      : `Please write an introduction for the following proposal:\n\n${specificationContext}`;

    // Generate the introduction
    const { text: introduction } = await generateText({
      model: getAdminAiLanguageModel({
        providerName: quote.providerName,
        apiKey: quote.providerApiKey,
      }),
      system: introSystemPrompt,
      prompt: introPrompt,
      temperature: 0.7,
    });

    // Build the specification system prompt
    const specSystemPrompt = isAmendMode
      ? `You are an expert proposal writer for ${partnerName}, a company that provides AI agents across WhatsApp, websites, web apps and mobile apps.

${partnerContext}

The above context is for YOUR UNDERSTANDING ONLY of what ${partnerName} does. Do NOT automatically include all ${partnerName} capabilities in the proposal.

Your task is to AMEND an existing specification section based on the user's instructions. You have the existing specification and should modify it according to their specific requests while maintaining the overall structure.

The specification MUST follow this structure:
- Organise content into logical numbered sections (e.g. ## 1. Section Title, ## 2. Section Title)
- Each section should have a short 1-2 sentence description explaining the purpose of that section
- Use a mix of short paragraphs and bullet points within each section — do not use only bullet lists
- Where bullet points are used, keep lists to roughly 3 to 12 items. If a section has many features, break them into subsections using ### subtitles with shorter lists or paragraphs under each
- Vary the structure across sections so the document feels scannable and readable, not like one continuous list
- Do NOT include a top-level "Specification" heading or the client's name/organisation, as these are displayed elsewhere
- Rewrite and expand on ONLY what the client has provided, using professional language
- Do NOT add features, integrations, or capabilities that the client hasn't mentioned
- Do NOT make assumptions about what the client might want
- Be concise and avoid repetition across sections
- Be clear and professional - the client should understand what they're getting
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list

TERMINOLOGY: Always refer to the solution as an "AI agent", "AI assistant" or "agent". Never use "chatbot" or "chat bot" in the generated content, even if those terms appear in the source material or existing content.

CRITICAL: Only include what the client has explicitly written in their specification. If they haven't mentioned workers, don't add workers. If they haven't mentioned CRM integration, don't add CRM integration. Do not add outbound messaging unless it is clearly relevant to what they have asked for or the user explicitly requests it. Stick strictly to their requirements. ONLY reference knowledge sources and integrations that are explicitly listed in the specification. Do NOT invent, assume or suggest any additional data sources, integrations or system connections beyond what is provided. The AI agent will only have access to the listed knowledge sources and integrations.

Write in Markdown format. Use ## for numbered section headings, ### for subsections within numbered sections, **bold** for emphasis, bullet points for feature lists with sub-bullets where needed.

EXISTING SPECIFICATION TO AMEND:
${existingSpecification}

USER'S AMENDMENT INSTRUCTIONS:
${extraPrompt || "Please improve and refine the existing content."}`
      : `You are an expert proposal writer for ${partnerName}, a company that provides AI agents across WhatsApp, websites, web apps and mobile apps.

${partnerContext}

The above context is for YOUR UNDERSTANDING ONLY of what ${partnerName} does. Do NOT automatically include all ${partnerName} capabilities in the proposal.

Your task is to write a detailed, professional SPECIFICATION section for a client proposal. Based on the client's provided information, you should:

The specification MUST follow this structure:
- Organise content into logical numbered sections (e.g. ## 1. Section Title, ## 2. Section Title)
- Each section should have a short 1-2 sentence description explaining the purpose of that section
- Use a mix of short paragraphs and bullet points within each section — do not use only bullet lists
- Where bullet points are used, keep lists to roughly 3 to 12 items. If a section has many features, break them into subsections using ### subtitles with shorter lists or paragraphs under each
- Vary the structure across sections so the document feels scannable and readable, not like one continuous list
- Do NOT include a top-level "Specification" heading or the client's name/organisation, as these are displayed elsewhere
- Rewrite and expand on ONLY what the client has provided, using professional language
- Do NOT add features, integrations, or capabilities that the client hasn't mentioned
- Do NOT make assumptions about what the client might want
- Be concise and avoid repetition across sections
- Be clear and professional - the client should understand what they're getting
- Avoid use of hyphens in the content
- Do not use the Oxford comma before 'and' in a list

TERMINOLOGY: Always refer to the solution as an "AI agent", "AI assistant" or "agent". Never use "chatbot" or "chat bot" in the generated content, even if those terms appear in the source material.

CRITICAL: Only include what the client has explicitly written in their specification. If they haven't mentioned workers, don't add workers. If they haven't mentioned CRM integration, don't add CRM integration. Do not add outbound messaging unless it is clearly relevant to what they have asked for or the user explicitly requests it. Stick strictly to their requirements. ONLY reference knowledge sources and integrations that are explicitly listed in the specification. Do NOT invent, assume or suggest any additional data sources, integrations or system connections beyond what is provided. The AI agent will only have access to the listed knowledge sources and integrations.

Write in Markdown format. Use ## for numbered section headings, ### for subsections within numbered sections, **bold** for emphasis, bullet points for feature lists with sub-bullets where needed.${
          extraPrompt
            ? `\n\nADDITIONAL INSTRUCTIONS FROM USER:\n${extraPrompt}`
            : ""
        }`;

    const specPrompt = isAmendMode
      ? `Please amend the existing specification for the following client based on the amendment instructions provided:\n\n${specificationContext}`
      : `Please write a detailed specification based on the following information:\n\n${specificationContext}`;

    // Generate the detailed specification
    const { text: specification } = await generateText({
      model: getAdminAiLanguageModel({
        providerName: quote.providerName,
        apiKey: quote.providerApiKey,
      }),
      system: specSystemPrompt,
      prompt: specPrompt,
      temperature: 0.7,
    });

    if (!introduction || !specification) {
      return { success: false, error: "Failed to generate proposal content" };
    }

    const normalisedIntroduction = applyAiAgentTerminology(introduction);
    const normalisedSpecification = applyAiAgentTerminology(specification);

    // Save the generated content to the database
    await db("quote").where({ id: quoteId }).update({
      generatedProposalIntroduction: normalisedIntroduction,
      generatedSpecification: normalisedSpecification,
    });

    // Auto-generate costing breakdown based on the proposal
    await generateQuoteCostingInternal({ quoteId, source: "proposal" });

    return {
      success: true,
      data: {
        generatedProposalIntroduction: normalisedIntroduction,
        generatedSpecification: normalisedSpecification,
      },
    };
  } catch (error) {
    console.error("Error generating quote proposal:", error);
    return {
      success: false,
      error: "Failed to generate proposal. Please try again.",
    };
  }
};

export default saGenerateQuoteProposal;
