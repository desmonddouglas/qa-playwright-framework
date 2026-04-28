import fs from 'fs';
import path from 'path';

type FailureSummaryV3 = {
  totalResults: number;
  uniqueTests: number;
  passedResults: number;
  failedResults: number;
  retryResults: number;
  flakyTests: number;
  failedTests: number;
  groupedFailures: Array<{
    title: string;
    classification: string;
    finalOutcome: string;
    history: {
      trend: string;
      releaseRiskSignal: 'low' | 'medium' | 'high';
      failureCountInLast5Runs: number;
    };
  }>;
};

type MaintenanceSuggestion = {
  title: string;
  classification: string;
  confidence: 'low' | 'medium' | 'high';
  humanReviewRequired: boolean;
};

type ReleaseRiskReport = {
  generatedAt: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  releaseRecommendation: 'safe_to_release' | 'release_with_caution' | 'do_not_release';
  summary: {
    totalTests: number;
    passedResults: number;
    failedResults: number;
    failedTests: number;
    flakyTests: number;
    maintenanceSuggestions: number;
  };
  riskDrivers: string[];
  recommendedActions: string[];
};

const failureSummaryFile = path.resolve('artifacts/failure-summary-v3.json');
const maintenanceFile = path.resolve('artifacts/maintenance-suggestions.json');
const outputJson = path.resolve('artifacts/release-risk-report.json');
const outputMd = path.resolve('artifacts/release-risk-report.md');

function readJsonIfExists<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  if (!raw.trim()) {
    return fallback;
  }

  return JSON.parse(raw) as T;
}

function calculateRiskScore(
  failureSummary: FailureSummaryV3,
  maintenanceSuggestions: MaintenanceSuggestion[]
): number {
  let score = 0;

  score += failureSummary.failedTests * 25;
  score += failureSummary.flakyTests * 15;
  score += maintenanceSuggestions.length * 10;

  for (const failure of failureSummary.groupedFailures) {
    if (failure.history.releaseRiskSignal === 'high') {
      score += 25;
    }

    if (failure.history.releaseRiskSignal === 'medium') {
      score += 15;
    }

    if (failure.history.trend === 'recurring_failure') {
      score += 20;
    }

    if (failure.classification === 'locator_issue') {
      score += 10;
    }

    if (failure.classification === 'assertion_mismatch') {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function getReleaseRecommendation(
  riskLevel: 'low' | 'medium' | 'high'
): 'safe_to_release' | 'release_with_caution' | 'do_not_release' {
  if (riskLevel === 'high') return 'do_not_release';
  if (riskLevel === 'medium') return 'release_with_caution';
  return 'safe_to_release';
}

function buildRiskDrivers(
  failureSummary: FailureSummaryV3,
  maintenanceSuggestions: MaintenanceSuggestion[]
): string[] {
  const drivers: string[] = [];

  if (failureSummary.failedTests > 0) {
    drivers.push(`${failureSummary.failedTests} unique test(s) failed.`);
  }

  if (failureSummary.flakyTests > 0) {
    drivers.push(`${failureSummary.flakyTests} flaky test(s) detected.`);
  }

  if (maintenanceSuggestions.length > 0) {
    drivers.push(`${maintenanceSuggestions.length} maintenance suggestion(s) generated.`);
  }

  const recurringFailures = failureSummary.groupedFailures.filter(
    f => f.history.trend === 'recurring_failure'
  );

  if (recurringFailures.length > 0) {
    drivers.push(`${recurringFailures.length} recurring failure(s) detected.`);
  }

  const highRiskFailures = failureSummary.groupedFailures.filter(
    f => f.history.releaseRiskSignal === 'high'
  );

  if (highRiskFailures.length > 0) {
    drivers.push(`${highRiskFailures.length} high-risk failure signal(s) detected.`);
  }

  if (drivers.length === 0) {
    drivers.push('No significant release risk drivers detected.');
  }

  return drivers;
}

function buildRecommendedActions(
  riskLevel: 'low' | 'medium' | 'high',
  failureSummary: FailureSummaryV3
): string[] {
  if (riskLevel === 'high') {
    return [
      'Do not release until failed smoke tests are resolved.',
      'Review trace, screenshot, and video evidence for failed tests.',
      'Confirm whether failures are product regressions or test maintenance issues.'
    ];
  }

  if (riskLevel === 'medium') {
    return [
      'Release only after reviewing failed or unstable test areas.',
      'Confirm maintenance suggestions with a human reviewer.',
      'Consider rerunning the smoke suite before release approval.'
    ];
  }

  return [
    'Release risk is low based on current automated test signals.',
    'Continue monitoring future runs for recurring or flaky behavior.'
  ];
}

function writeMarkdownReport(report: ReleaseRiskReport) {
  let md = `# Release Risk Report\n\n`;
  md += `Generated: ${report.generatedAt}\n\n`;
  md += `## Overall Risk\n\n`;
  md += `- **Risk Score:** ${report.riskScore}/100\n`;
  md += `- **Risk Level:** ${report.riskLevel}\n`;
  md += `- **Release Recommendation:** ${report.releaseRecommendation}\n\n`;

  md += `## Summary\n\n`;
  md += `- Total Tests: ${report.summary.totalTests}\n`;
  md += `- Passed Results: ${report.summary.passedResults}\n`;
  md += `- Failed Results: ${report.summary.failedResults}\n`;
  md += `- Failed Tests: ${report.summary.failedTests}\n`;
  md += `- Flaky Tests: ${report.summary.flakyTests}\n`;
  md += `- Maintenance Suggestions: ${report.summary.maintenanceSuggestions}\n\n`;

  md += `## Risk Drivers\n\n`;
  for (const driver of report.riskDrivers) {
    md += `- ${driver}\n`;
  }

  md += `\n## Recommended Actions\n\n`;
  for (const action of report.recommendedActions) {
    md += `- ${action}\n`;
  }

  fs.writeFileSync(outputMd, md);
}

function runReleaseRiskAgent() {
  const failureSummary = readJsonIfExists<FailureSummaryV3>(failureSummaryFile, {
    totalResults: 0,
    uniqueTests: 0,
    passedResults: 0,
    failedResults: 0,
    retryResults: 0,
    flakyTests: 0,
    failedTests: 0,
    groupedFailures: []
  });

  const maintenanceSuggestions = readJsonIfExists<MaintenanceSuggestion[]>(
    maintenanceFile,
    []
  );

  fs.mkdirSync(path.resolve('artifacts'), { recursive: true });

  const riskScore = calculateRiskScore(failureSummary, maintenanceSuggestions);
  const riskLevel = getRiskLevel(riskScore);

  const report: ReleaseRiskReport = {
    generatedAt: new Date().toISOString(),
    riskScore,
    riskLevel,
    releaseRecommendation: getReleaseRecommendation(riskLevel),
    summary: {
      totalTests: failureSummary.uniqueTests,
      passedResults: failureSummary.passedResults,
      failedResults: failureSummary.failedResults,
      failedTests: failureSummary.failedTests,
      flakyTests: failureSummary.flakyTests,
      maintenanceSuggestions: maintenanceSuggestions.length
    },
    riskDrivers: buildRiskDrivers(failureSummary, maintenanceSuggestions),
    recommendedActions: buildRecommendedActions(riskLevel, failureSummary)
  };

  fs.writeFileSync(outputJson, JSON.stringify(report, null, 2));
  writeMarkdownReport(report);

  console.log(`Release risk JSON report written to ${outputJson}`);
  console.log(`Release risk markdown report written to ${outputMd}`);
  console.log(report);
}

runReleaseRiskAgent();