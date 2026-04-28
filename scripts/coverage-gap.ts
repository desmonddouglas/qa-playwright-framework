import fs from 'fs';
import path from 'path';

type CoverageArea = {
  name: string;
  keywords: string[];
  requiredForSmoke: boolean;
};

type CoverageResult = {
  area: string;
  status: 'covered' | 'missing';
  requiredForSmoke: boolean;
  matchingTests: string[];
  recommendation: string;
};

const testsDir = path.resolve('tests');
const outputJson = path.resolve('artifacts/coverage-gap-report.json');
const outputMd = path.resolve('artifacts/coverage-gap-report.md');

const expectedAreas: CoverageArea[] = [
  {
    name: 'homepage',
    keywords: ['homepage', 'home page', 'example domain'],
    requiredForSmoke: true
  },
  {
    name: 'login',
    keywords: ['login', 'sign in', 'authentication', 'auth'],
    requiredForSmoke: true
  },
  {
    name: 'navigation',
    keywords: ['navigation', 'nav', 'menu', 'link'],
    requiredForSmoke: true
  },
  {
    name: 'search',
    keywords: ['search', 'filter', 'query'],
    requiredForSmoke: false
  },
  {
    name: 'checkout',
    keywords: ['checkout', 'payment', 'purchase', 'cart'],
    requiredForSmoke: false
  }
];

function getTestFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getTestFiles(fullPath);
    }

    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      return [fullPath];
    }

    return [];
  });
}

function extractTestTitles(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = [...content.matchAll(/test\(['"`](.*?)['"`]/g)];
  return matches.map(match => match[1]);
}

function analyzeCoverage(): CoverageResult[] {
  const testFiles = getTestFiles(testsDir);

  const testTitles = testFiles.flatMap(file => {
    const titles = extractTestTitles(file);
    return titles.map(title => `${path.relative(process.cwd(), file)} :: ${title}`);
  });

  return expectedAreas.map(area => {
    const matchingTests = testTitles.filter(test =>
      area.keywords.some(keyword =>
        test.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    const status = matchingTests.length > 0 ? 'covered' : 'missing';

    return {
      area: area.name,
      status,
      requiredForSmoke: area.requiredForSmoke,
      matchingTests,
      recommendation:
        status === 'covered'
          ? 'Coverage exists for this area.'
          : area.requiredForSmoke
            ? 'Add at least one smoke test for this required area.'
            : 'Consider adding regression coverage for this area if it is relevant to the product.'
    };
  });
}

function writeMarkdown(results: CoverageResult[]) {
  let md = `# Coverage Gap Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;

  const covered = results.filter(r => r.status === 'covered').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const missingRequired = results.filter(r => r.status === 'missing' && r.requiredForSmoke).length;

  md += `## Summary\n\n`;
  md += `- Covered Areas: ${covered}\n`;
  md += `- Missing Areas: ${missing}\n`;
  md += `- Missing Required Smoke Areas: ${missingRequired}\n\n`;

  md += `## Area Results\n\n`;

  for (const result of results) {
    md += `### ${result.area}\n\n`;
    md += `- **Status:** ${result.status}\n`;
    md += `- **Required for Smoke:** ${result.requiredForSmoke ? 'Yes' : 'No'}\n`;
    md += `- **Recommendation:** ${result.recommendation}\n\n`;

    if (result.matchingTests.length > 0) {
      md += `**Matching Tests:**\n`;
      for (const test of result.matchingTests) {
        md += `- ${test}\n`;
      }
      md += `\n`;
    }
  }

  fs.writeFileSync(outputMd, md);
}

function runCoverageGapAgent() {
  fs.mkdirSync(path.resolve('artifacts'), { recursive: true });

  const results = analyzeCoverage();

  fs.writeFileSync(outputJson, JSON.stringify(results, null, 2));
  writeMarkdown(results);

  console.log(`Coverage gap JSON report written to ${outputJson}`);
  console.log(`Coverage gap markdown report written to ${outputMd}`);
  console.log(results);
}

runCoverageGapAgent();