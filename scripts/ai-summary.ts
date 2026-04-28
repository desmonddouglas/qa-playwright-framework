import fs from 'fs';
import path from 'path';

const failureSummaryPath = path.resolve('artifacts/failure-summary-v3.json');
const maintenancePath = path.resolve('artifacts/maintenance-suggestions.json');
const releaseRiskPath = path.resolve('artifacts/release-risk-report.json');
const outputPath = path.resolve('artifacts/ai-summary.md');

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

const failureSummary = readJson<any>(failureSummaryPath, {});
const maintenanceSuggestions = readJson<any[]>(maintenancePath, []);
const releaseRisk = readJson<any>(releaseRiskPath, {});

fs.mkdirSync(path.resolve('artifacts'), { recursive: true });

let md = `# AI QA Run Summary\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;

md += `## Overall Status\n\n`;

if ((failureSummary.failedTests ?? 0) === 0) {
  md += `The smoke suite completed without failed tests. Current automated signals indicate a stable baseline.\n\n`;
} else {
  md += `The smoke suite detected ${failureSummary.failedTests} failed test(s). Review failure analysis and maintenance recommendations before release approval.\n\n`;
}

md += `## Key Signals\n\n`;
md += `- Total Tests: ${failureSummary.uniqueTests ?? 0}\n`;
md += `- Passed Results: ${failureSummary.passedResults ?? 0}\n`;
md += `- Failed Results: ${failureSummary.failedResults ?? 0}\n`;
md += `- Failed Tests: ${failureSummary.failedTests ?? 0}\n`;
md += `- Flaky Tests: ${failureSummary.flakyTests ?? 0}\n`;
md += `- Maintenance Suggestions: ${maintenanceSuggestions.length}\n`;
md += `- Release Risk Score: ${releaseRisk.riskScore ?? 'N/A'}\n`;
md += `- Release Risk Level: ${releaseRisk.riskLevel ?? 'N/A'}\n`;
md += `- Release Recommendation: ${releaseRisk.releaseRecommendation ?? 'N/A'}\n\n`;

md += `## Risk Drivers\n\n`;

const riskDrivers = releaseRisk.riskDrivers ?? [];
if (riskDrivers.length === 0) {
  md += `- No significant risk drivers identified.\n`;
} else {
  for (const driver of riskDrivers) {
    md += `- ${driver}\n`;
  }
}

md += `\n## Maintenance Recommendations\n\n`;

if (maintenanceSuggestions.length === 0) {
  md += `No maintenance actions are currently recommended.\n\n`;
} else {
  for (const suggestion of maintenanceSuggestions) {
    md += `### ${suggestion.title}\n`;
    md += `- Classification: ${suggestion.classification}\n`;
    md += `- Confidence: ${suggestion.confidence}\n`;
    md += `- Human Review Required: ${suggestion.humanReviewRequired ? 'Yes' : 'No'}\n`;
    md += `- Suggested Change: ${suggestion.suggestedChange}\n\n`;
  }
}

md += `## Recommended Next Steps\n\n`;

if (releaseRisk.riskLevel === 'high') {
  md += `- Do not release until failed smoke tests are resolved.\n`;
  md += `- Review traces, screenshots, and maintenance suggestions.\n`;
} else if (releaseRisk.riskLevel === 'medium') {
  md += `- Review flagged areas before release.\n`;
  md += `- Consider rerunning smoke tests before approval.\n`;
} else {
  md += `- Release risk is low based on current automated signals.\n`;
  md += `- Continue monitoring future runs for recurring or flaky failures.\n`;
}

fs.writeFileSync(outputPath, md);
console.log(`AI summary written to ${outputPath}`);