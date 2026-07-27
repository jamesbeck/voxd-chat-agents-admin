import assert from "node:assert/strict";
import test from "node:test";
import {
  KNOWLEDGE_DOCUMENT_PROMPT_MAX_LENGTH,
  normalizeKnowledgeDocumentPrompt,
} from "./knowledgeDocumentSource";

test("normalizes empty document import instructions to null", () => {
  assert.deepEqual(normalizeKnowledgeDocumentPrompt("   "), {
    success: true,
    data: null,
  });
});

test("trims document import instructions", () => {
  assert.deepEqual(
    normalizeKnowledgeDocumentPrompt("  Focus on product specifications.  "),
    {
      success: true,
      data: "Focus on product specifications.",
    },
  );
});

test("rejects document import instructions over the length limit", () => {
  const result = normalizeKnowledgeDocumentPrompt(
    "x".repeat(KNOWLEDGE_DOCUMENT_PROMPT_MAX_LENGTH + 1),
  );

  assert.equal(result.success, false);
  assert.deepEqual(
    result.success ? undefined : result.fieldErrors,
    {
      prompt: "Import instructions must be 4,000 characters or fewer",
    },
  );
});
