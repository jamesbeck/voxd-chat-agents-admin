export const applyAiAgentTerminology = (content: string) =>
  content
    .replace(/\bA chat[\s-]?bot\b/gi, (match) =>
      match.startsWith("A ") ? "An AI agent" : "an AI agent",
    )
    .replace(/\bchat[\s-]?bots\b/gi, "AI agents")
    .replace(/\bchat[\s-]?bot\b/gi, "AI agent");
