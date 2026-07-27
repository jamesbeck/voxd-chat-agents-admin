import assert from "node:assert/strict";
import test from "node:test";
import { applyAiAgentTerminology } from "./aiAgentTerminology";

test("replaces legacy chatbot terminology with AI agent terminology", () => {
  assert.equal(
    applyAiAgentTerminology(
      "A Chatbot can replace older chat bots while several chat-bots work together. The chatbot's tone stays consistent.",
    ),
    "An AI agent can replace older AI agents while several AI agents work together. The AI agent's tone stays consistent.",
  );
});
