import fs from 'fs';
import path from 'path';

type JiraStory = {
  key: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  component: string;
};

function readJson<T>(filePath: string): T {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as T;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildPrompt(story: JiraStory): string {
  const shortFeatureName = slugify(story.title.replace(/^User can view\s+/i, ''));

  return `Review this GitHub repository for context:
https://github.com/desmonddouglas/qa-playwright-framework

Use prompts/jira-to-test-generator.md.

Use this Jira story:

${JSON.stringify(story, null, 2)}

Use Playwright MCP to inspect:
https://desmonddouglas.github.io/qa-playwright-framework/

Generate production-ready Playwright tests.

Required files:
- tests/smoke/${story.key.toLowerCase()}-${shortFeatureName}.smoke.spec.ts
- tests/regression/${story.key.toLowerCase()}-${shortFeatureName}.regression.spec.ts

Requirements:
- Follow existing QA-102, QA-103, QA-104, and QA-105 conventions.
- Use data-testid selectors.
- Use helper functions for repeated logic.
- Wait for async placeholders like "--" or "Loading..." to disappear.
- Avoid MCP ref selectors.
- Avoid emoji selectors.
- Avoid brittle positional selectors.
- Do not hardcode exact dynamic values unless required by acceptance criteria.
- Include human review notes.
- Include selector stability assessment.
- Include recommended framework improvements.`;
}

const storyPath = process.argv[2];

if (!storyPath) {
  console.error('Usage: npm run build:prompt -- data/mock-jira-stories/QA-105-coverage-gaps.json');
  process.exit(1);
}

const story = readJson<JiraStory>(storyPath);
const prompt = buildPrompt(story);

const outputDir = path.resolve('artifacts/prompts');
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, `${story.key}-test-generation-prompt.md`);
fs.writeFileSync(outputPath, prompt);

console.log(`Prompt generated: ${outputPath}`);