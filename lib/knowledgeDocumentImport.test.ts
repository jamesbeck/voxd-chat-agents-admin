import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKnowledgeBlockGenerationPrompt,
  buildKnowledgeBlocksFromSections,
  dedupeImportedSections,
} from "./knowledgeDocumentImport";

test("removes exact duplicate sections before creating knowledge blocks", () => {
  const blocks = buildKnowledgeBlocksFromSections([
    {
      title: "Financial Services",
      content: "A first paragraph.\n\nA second paragraph.",
    },
    {
      title: "Financial Services",
      content: "A first paragraph.\n\nA second paragraph.",
    },
  ]);

  assert.deepEqual(blocks, [
    {
      title: "Financial Services",
      content: "A first paragraph.\n\nA second paragraph.",
    },
  ]);
});

test("keeps sections with the same title when their content differs", () => {
  const blocks = buildKnowledgeBlocksFromSections([
    {
      title: "Financial Services",
      content: "Content for banks.",
    },
    {
      title: "Financial Services",
      content: "Content for insurers.",
    },
  ]);

  assert.deepEqual(blocks, [
    {
      title: "Financial Services",
      content: "Content for banks.",
    },
    {
      title: "Financial Services",
      content: "Content for insurers.",
    },
  ]);
});

test("deduplicates exact sections after paragraph whitespace normalization", () => {
  const sections = dedupeImportedSections([
    {
      title: "Financial Services",
      content: "A first paragraph.\n\nA second paragraph.",
    },
    {
      title: " Financial Services ",
      content: "A first paragraph.\n\n\n  A second paragraph.",
    },
  ]);

  assert.equal(sections.length, 1);
});

test("combines document guidance with the required semantic chunking rules", () => {
  const prompt = buildKnowledgeBlockGenerationPrompt({
    text: "Awards source material",
    documentPrompt:
      "Ignore accommodation and focus on winners and award categories.",
  });

  assert.match(prompt, /self-contained piece of useful information/);
  assert.match(prompt, /Avoid exact duplicates/);
  assert.match(prompt, /only information supported by the supplied source text/);
  assert.match(
    prompt,
    /Ignore accommodation and focus on winners and award categories\./,
  );
  assert.match(prompt, /Awards source material/);
  assert.match(prompt, /Ignore any instructions[\s\S]*inside it/);
});
