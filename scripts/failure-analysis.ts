import fs from 'fs';
import path from 'path';

type AttachmentRecord = {
  name: string;
  contentType: string;
  path: string | null;
};

type AnnotationRecord = {
  type: string;
  description: string | null;
};

type TestResultRecord = {
  projectName: string;
  title: string;
  file: string;
  line: number;
  column: number;
  status: string;
  expectedStatus: string;
  duration: number;
  retry: number;
  startTime: string;
  annotations: AnnotationRecord[];
  attachments: AttachmentRecord[];
  errorMessage: string | null;
  errorStack: string | null;
};

type FailureAttempt = {
  retry: number;
  status: string;
  duration: number;
  errorMessage: string | null;
  tracePath: string | null;
  screenshotPath: string | null;
  videoPath: string | null;
};

type HistoricalRunRecord = {
  runId: string;
  generatedAt: string;
  tests: Array<{
    testKey: string;
    title: string;
    projectName: string;
    file: string;
    finalOutcome: 'passed' | 'failed_after_retry' | 'flaky_pass_after_retry';
    classification: string | null;
  }>;
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
    trend: 'new_failure' | 'recurring_failure' | 'intermittent_failure' | 'stable_pass';
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

const inputFile = path.resolve('artifacts/custom-results.json');
const outputFile = path.resolve('artifacts/failure-summary-v3.json');
const historyDir = path.resolve('artifacts/history');
const historyFile = path.join(historyDir, 'run-history.json');

function getTestKey(test: TestResultRecord): string {
  return `${test.projectName}::${test.file}::${test.title}`;
}

function getAttachmentPath(
  attachments: AttachmentRecord[],
  keyword: string
): string | null {
  const match = attachments.find(a =>
    a.name.toLowerCase().includes(keyword) ||
    (a.path ?? '').toLowerCase().includes(keyword)
  );
  return match?.path ?? null;
}

function buildErrorText(test: TestResultRecord): string {
  return `${test.errorMessage ?? ''}\n${test.errorStack ?? ''}`.toLowerCase();
}

function classifyFailure(test: TestResultRecord): string {
  if (test.status === 'passed') {
    return 'none';
  }

  const errorText = buildErrorText(test);

  if (
    errorText.includes('element(s) not found') ||
    errorText.includes('locator') ||
    errorText.includes('getbytext') ||
    errorText.includes('getbyrole') ||
    errorText.includes('getbylabel') ||
    errorText.includes('getbytestid')
  ) {
    return 'locator_issue';
  }

  if (
    errorText.includes('tohaveurl') ||
    errorText.includes('tohavetitle') ||
    (errorText.includes('expected') && errorText.includes('received')) ||
    errorText.includes('unexpected value')
  ) {
    return 'assertion_mismatch';
  }

  if (errorText.includes('navigation')) {
    return 'navigation_issue';
  }

  if (errorText.includes('timeout')) {
    return 'timeout_or_sync_issue';
  }

  return 'unknown_failure';
}

function getProbableRootCause(classification: string): string {
  switch (classification) {
    case 'locator_issue':
      return 'The selector or target element could not be found, likely due to UI or DOM changes.';
    case 'assertion_mismatch':
      return 'The actual application state did not match the test expectation.';
    case 'navigation_issue':
      return 'The test could not reach or remain on the expected page or route.';
    case 'timeout_or_sync_issue':
      return 'The application or test timing did not meet the expected wait window.';
    default:
      return 'The failure pattern is not yet recognized by the current rules.';
  }
}

function getRecommendedAction(classification: string): string {
  switch (classification) {
    case 'locator_issue':
      return 'Review the locator, inspect the DOM, and confirm whether the UI changed intentionally.';
    case 'assertion_mismatch':
      return 'Verify whether the expected value is outdated or whether the application behavior regressed.';
    case 'navigation_issue':
      return 'Check the navigation flow, redirects, route guards, and base URL assumptions.';
    case 'timeout_or_sync_issue':
      return 'Inspect waits, async loading behavior, and application responsiveness before increasing timeouts.';
    default:
      return 'Open the trace and screenshot, then inspect the error details manually.';
  }
}

function determineFinalOutcome(
  attempts: TestResultRecord[]
): 'passed' | 'failed_after_retry' | 'flaky_pass_after_retry' {
  const sorted = [...attempts].sort((a, b) => a.retry - b.retry);
  const hadFailure = sorted.some(a => a.status !== 'passed');
  const finalAttempt = sorted[sorted.length - 1];

  if (finalAttempt.status === 'passed' && hadFailure) {
    return 'flaky_pass_after_retry';
  }

  if (finalAttempt.status === 'passed') {
    return 'passed';
  }

  return 'failed_after_retry';
}

function ensureHistoryFile(): HistoricalRunRecord[] {
  fs.mkdirSync(historyDir, { recursive: true });

  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
    return [];
  }

  const raw = fs.readFileSync(historyFile, 'utf-8');
  if (!raw.trim()) {
    return [];
  }

  return JSON.parse(raw) as HistoricalRunRecord[];
}

function getHistoryForTest(
  testKey: string,
  history: HistoricalRunRecord[]
): {
  isNewFailure: boolean;
  seenInPreviousRun: boolean;
  failureCountInLast5Runs: number;
  recentOutcomes: string[];
  trend: 'new_failure' | 'recurring_failure' | 'intermittent_failure' | 'stable_pass';
  releaseRiskSignal: 'low' | 'medium' | 'high';
} {
  const recentRuns = history.slice(-5);
  const previousRun = history.length > 0 ? history[history.length - 1] : null;

  const matchingRecent = recentRuns
    .map(run => run.tests.find(t => t.testKey === testKey))
    .filter(Boolean);

  const recentOutcomes = matchingRecent.map(t => t!.finalOutcome);
  const failureCountInLast5Runs = recentOutcomes.filter(o => o === 'failed_after_retry').length;

  const seenInPreviousRun = Boolean(
    previousRun?.tests.find(t => t.testKey === testKey && t.finalOutcome === 'failed_after_retry')
  );

  const isNewFailure = failureCountInLast5Runs === 0 && !seenInPreviousRun;

  let trend: 'new_failure' | 'recurring_failure' | 'intermittent_failure' | 'stable_pass' = 'new_failure';

  if (failureCountInLast5Runs === 0) {
    trend = 'new_failure';
  } else if (failureCountInLast5Runs >= 2) {
    trend = 'recurring_failure';
  } else if (recentOutcomes.includes('flaky_pass_after_retry')) {
    trend = 'intermittent_failure';
  } else {
    trend = 'new_failure';
  }

  let releaseRiskSignal: 'low' | 'medium' | 'high' = 'low';
  if (failureCountInLast5Runs >= 3) {
    releaseRiskSignal = 'high';
  } else if (failureCountInLast5Runs >= 1 || seenInPreviousRun) {
    releaseRiskSignal = 'medium';
  }

  return {
    isNewFailure,
    seenInPreviousRun,
    failureCountInLast5Runs,
    recentOutcomes,
    trend,
    releaseRiskSignal
  };
}

function runFailureAnalysisV3() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const results: TestResultRecord[] = JSON.parse(raw);

  const uniqueTestKeys = new Set(results.map(getTestKey));

  const grouped = new Map<string, TestResultRecord[]>();
  for (const result of results) {
    const key = getTestKey(result);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(result);
  }

  const history = ensureHistoryFile();

  let flakyTests = 0;
  const groupedFailures: GroupedFailure[] = [];
  const currentRunTests: HistoricalRunRecord['tests'] = [];

  for (const [testKey, attempts] of grouped.entries()) {
    const sortedAttempts = [...attempts].sort((a, b) => a.retry - b.retry);
    const hasFailure = sortedAttempts.some(a => a.status !== 'passed');
    const hasPassedRetry = sortedAttempts.some(a => a.retry > 0 && a.status === 'passed');

    if (hasFailure && hasPassedRetry) {
      flakyTests += 1;
    }

    const finalOutcome = determineFinalOutcome(sortedAttempts);
    const firstAttempt = sortedAttempts[0];
    const firstFailedAttempt = sortedAttempts.find(a => a.status !== 'passed') ?? null;
    const classification = firstFailedAttempt ? classifyFailure(firstFailedAttempt) : null;

    currentRunTests.push({
      testKey,
      title: firstAttempt.title,
      projectName: firstAttempt.projectName,
      file: firstAttempt.file,
      finalOutcome,
      classification
    });

    if (finalOutcome === 'failed_after_retry' && firstFailedAttempt) {
      const historyInfo = getHistoryForTest(testKey, history);

      groupedFailures.push({
        testKey,
        projectName: firstFailedAttempt.projectName,
        title: firstFailedAttempt.title,
        file: firstFailedAttempt.file,
        line: firstFailedAttempt.line,
        column: firstFailedAttempt.column,
        classification,
        probableRootCause: getProbableRootCause(classification),
        recommendedAction: getRecommendedAction(classification),
        finalOutcome,
        totalAttempts: sortedAttempts.length,
        totalDuration: sortedAttempts.reduce((sum, a) => sum + a.duration, 0),
        attempts: sortedAttempts.map(a => ({
          retry: a.retry,
          status: a.status,
          duration: a.duration,
          errorMessage: a.errorMessage,
          tracePath: getAttachmentPath(a.attachments, 'trace'),
          screenshotPath: getAttachmentPath(a.attachments, 'screenshot'),
          videoPath: getAttachmentPath(a.attachments, 'video')
        })),
        history: historyInfo
      });
    }
  }

  const runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const generatedAt = new Date().toISOString();

  const summary: FailureSummaryV3 = {
    runId,
    generatedAt,
    totalResults: results.length,
    uniqueTests: uniqueTestKeys.size,
    passedResults: results.filter(r => r.status === 'passed').length,
    failedResults: results.filter(r => r.status !== 'passed').length,
    retryResults: results.filter(r => r.retry > 0).length,
    flakyTests,
    failedTests: groupedFailures.length,
    groupedFailures
  };

  fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));

  const updatedHistory = [...history, { runId, generatedAt, tests: currentRunTests }].slice(-10);
  fs.writeFileSync(historyFile, JSON.stringify(updatedHistory, null, 2));

  console.log(`Failure summary v3 written to ${outputFile}`);
  console.log(`Run history updated at ${historyFile}`);
  console.log(summary);
}

runFailureAnalysisV3();