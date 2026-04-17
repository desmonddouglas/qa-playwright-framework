import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from '@playwright/test/reporter';

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

type ReporterRecord = {
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

class CustomReporter implements Reporter {
  private results: ReporterRecord[] = [];

  onBegin(config: FullConfig, suite: Suite) {
    console.log(`Starting test run with ${suite.allTests().length} tests`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const annotations: AnnotationRecord[] = (result.annotations ?? test.annotations ?? []).map(a => ({
      type: a.type,
      description: a.description ?? null
    }));

    const attachments: AttachmentRecord[] = (result.attachments ?? []).map(a => ({
      name: a.name,
      contentType: a.contentType,
      path: a.path ?? null
    }));

    this.results.push({
      projectName: test.parent.project()?.name ?? 'unknown',
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      column: test.location.column,
      status: result.status,
      expectedStatus: test.expectedStatus,
      duration: result.duration,
      retry: result.retry,
      startTime: result.startTime.toISOString(),
      annotations,
      attachments,
      errorMessage: result.error?.message ?? null,
      errorStack: result.error?.stack ?? null
    });
  }

  onEnd(result: FullResult) {
    const outputDir = path.resolve('artifacts');
    const outputFile = path.join(outputDir, 'custom-results.json');

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(this.results, null, 2));

    console.log(`Finished with status: ${result.status}`);
    console.log(`Custom report written to ${outputFile}`);
  }
}

export default CustomReporter;