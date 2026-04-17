import fs from 'fs';
import path from 'path';

type FailureAttempt = {
  retry: number;
  status: string;
  duration: number;
  errorMessage: string | null;
  tracePath: string | null;
  screenshotPath: string | null;
  videoPath: string | null;
};

type GroupedFailure = {
  testKey: string;
  projectName: string;
  title: string;
  file: string;
  line: number;
  column: number;
  classification: string;
  probableRootCause: string;
  recommendedAction: string;
  finalOutcome: 'passed' | 'failed_after_retry' | 'flaky_pass_after_retry';
  totalAttempts: number;
  totalDuration: number;
  attempts: FailureAttempt[];
  history: {
    isNewFailure: boolean;
    seenInPreviousRun: boolean;
    failureCountInLast5Runs: number;
    recentOutcomes: string[];
    trend: string;
    releaseRiskSignal: 'low' | 'medium' | 'high';
  };
};

type FailureSummaryV3 = {
  runId: string;
  generatedAt: string;
  totalResults: number;
  uniqueTests: number;
  passedResults: number;
  failedResults: number;
  retryResults: number;
  flakyTests: number;
  failedTests: number;
  groupedFailures: GroupedFailure[];
};

type MaintenanceSuggestion = {
  testKey: string;
  title: string;
  file: string;
  line: number;
  classification: string;
  probableRootCause: string;
  suggestedChange: string;
  confidence: 'low' | 'medium' | 'high';
  humanReviewRequired: boolean;
  supportingEvidence: {
    errorMessage: string | null;
    tracePath: string | null;
    screenshotPath: string | null;
    videoPath: string | null;
  };
};

const inputFile = path.resolve('artifacts/failure-summary-v3.json');
const outputFile = path.resolve('artifacts/maintenance-suggestions.json');

function buildSuggestion(failure: GroupedFailure): MaintenanceSuggestion | null {
  const firstAttempt = failure.attempts[0];

  if (failure.classification === 'locator_issue') {
    return {
      testKey: failure.testKey,
      title: failure.title,
      file: failure.file,
      line: failure.line,
      classification: failure.classification,
      probableRootCause: failure.probableRootCause,
      suggestedChange:
        'Inspect the locator in the page object or test and update it to a more stable selector such as getByRole, getByLabel, or getByTestId. Confirm the UI changed intentionally before updating.',
      confidence: failure.history.trend === 'recurring_failure' ? 'high' : 'medium',
      humanReviewRequired: true,
      supportingEvidence: {
        errorMessage: firstAttempt?.errorMessage ?? null,
        tracePath: firstAttempt?.tracePath ?? null,
        screenshotPath: firstAttempt?.screenshotPath ?? null,
        videoPath: firstAttempt?.videoPath ?? null
      }
    };
  }

  if (failure.classification === 'assertion_mismatch') {
    return {
      testKey: failure.testKey,
      title: failure.title,
      file: failure.file,
      line: failure.line,
      classification: failure.classification,
      probableRootCause: failure.probableRootCause,
      suggestedChange:
        'Review the expected assertion value in the test. Confirm whether the product behavior changed intentionally or whether this indicates a regression before updating the expected value.',
      confidence: 'medium',
      humanReviewRequired: true,
      supportingEvidence: {
        errorMessage: firstAttempt?.errorMessage ?? null,
        tracePath: firstAttempt?.tracePath ?? null,
        screenshotPath: firstAttempt?.screenshotPath ?? null,
        videoPath: firstAttempt?.videoPath ?? null
      }
    };
  }

  return null;
}

function runTestMaintenance() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const summary: FailureSummaryV3 = JSON.parse(raw);

  const suggestions = summary.groupedFailures
    .map(buildSuggestion)
    .filter((s): s is MaintenanceSuggestion => s !== null);

  fs.writeFileSync(outputFile, JSON.stringify(suggestions, null, 2));
  console.log(`Maintenance suggestions written to ${outputFile}`);
  console.log(suggestions);
}

runTestMaintenance();