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

type GeneratedScenario = {
  id: string;
  title: string;
  type: 'positive' | 'negative';
  sourceAcceptanceCriteria: string;
  recommendedTestType: 'smoke' | 'regression';
  priority: string;
};

const inputFile = path.resolve('data/mock-jira-stories/QA-101-login.json');
const outputJson = path.resolve('artifacts/generated-test-plan.json');
const outputMd = path.resolve('artifacts/generated-test-plan.md');

function determineScenarioType(ac: string): 'positive' | 'negative' {
  const lower = ac.toLowerCase();

  if (
    lower.includes('invalid') ||
    lower.includes('error') ||
    lower.includes('fail') ||
    lower.includes('denied')
  ) {
    return 'negative';
  }

  return 'positive';
}

function determineRecommendedTestType(
  story: JiraStory,
  scenarioType: 'positive' | 'negative'
): 'smoke' | 'regression' {
  if (story.priority.toLowerCase() === 'high' && scenarioType === 'positive') {
    return 'smoke';
  }

  return 'regression';
}

function generateScenarios(story: JiraStory): GeneratedScenario[] {
  return story.acceptanceCriteria.map((ac, index) => {
    const scenarioType = determineScenarioType(ac);

    return {
      id: `${story.key}-SCENARIO-${index + 1}`,
      title: `${story.title} - ${ac}`,
      type: scenarioType,
      sourceAcceptanceCriteria: ac,
      recommendedTestType: determineRecommendedTestType(story, scenarioType),
      priority: story.priority
    };
  });
}

function writeMarkdown(story: JiraStory, scenarios: GeneratedScenario[]) {
  let md = `# Generated Test Plan\n\n`;
  md += `## Jira Story\n\n`;
  md += `- **Key:** ${story.key}\n`;
  md += `- **Title:** ${story.title}\n`;
  md += `- **Priority:** ${story.priority}\n`;
  md += `- **Component:** ${story.component}\n\n`;
  md += `## Description\n\n${story.description}\n\n`;

  md += `## Acceptance Criteria\n\n`;
  story.acceptanceCriteria.forEach((ac, index) => {
    md += `${index + 1}. ${ac}\n`;
  });

  md += `\n## Generated Scenarios\n\n`;

  scenarios.forEach((scenario, index) => {
    md += `### ${index + 1}. ${scenario.title}\n\n`;
    md += `- **Scenario ID:** ${scenario.id}\n`;
    md += `- **Type:** ${scenario.type}\n`;
    md += `- **Recommended Test Type:** ${scenario.recommendedTestType}\n`;
    md += `- **Priority:** ${scenario.priority}\n`;
    md += `- **Source AC:** ${scenario.sourceAcceptanceCriteria}\n\n`;
  });

  md += `## Notes\n\n`;
  md += `This is a draft test plan generated from Jira-style acceptance criteria. Human review is required before converting scenarios into Playwright tests.\n`;

  fs.writeFileSync(outputMd, md);
}

function runTestGenerationAgent() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  fs.mkdirSync(path.resolve('artifacts'), { recursive: true });

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const story: JiraStory = JSON.parse(raw);

  const scenarios = generateScenarios(story);

  fs.writeFileSync(
    outputJson,
    JSON.stringify(
      {
        story,
        scenarios,
        generatedAt: new Date().toISOString(),
        humanReviewRequired: true
      },
      null,
      2
    )
  );

  writeMarkdown(story, scenarios);

  console.log(`Generated test plan JSON written to ${outputJson}`);
  console.log(`Generated test plan markdown written to ${outputMd}`);
}

runTestGenerationAgent();