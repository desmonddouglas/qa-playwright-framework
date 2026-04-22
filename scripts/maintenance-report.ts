import fs from 'fs';
import path from 'path';

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

const inputFile = path.resolve('artifacts/maintenance-suggestions.json');
const outputFile = path.resolve('artifacts/maintenance-suggestions.md');

function runMaintenanceReport() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const raw = fs.readFileSync(inputFile, 'utf-8');
  const suggestions: MaintenanceSuggestion[] = JSON.parse(raw);

  let markdown = `# Test Maintenance Suggestions\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;

  if (suggestions.length === 0) {
    markdown += `No maintenance suggestions were generated.\n`;
    fs.writeFileSync(outputFile, markdown);
    console.log(`Maintenance markdown report written to ${outputFile}`);
    return;
  }

  suggestions.forEach((suggestion, index) => {
    markdown += `## ${index + 1}. ${suggestion.title}\n\n`;
    markdown += `- **File:** ${suggestion.file}\n`;
    markdown += `- **Line:** ${suggestion.line}\n`;
    markdown += `- **Classification:** ${suggestion.classification}\n`;
    markdown += `- **Confidence:** ${suggestion.confidence}\n`;
    markdown += `- **Human Review Required:** ${suggestion.humanReviewRequired ? 'Yes' : 'No'}\n\n`;
    markdown += `### Probable Root Cause\n`;
    markdown += `${suggestion.probableRootCause}\n\n`;
    markdown += `### Suggested Change\n`;
    markdown += `${suggestion.suggestedChange}\n\n`;
    markdown += `### Supporting Evidence\n`;
    markdown += `- Trace: ${suggestion.supportingEvidence.tracePath ?? 'N/A'}\n`;
    markdown += `- Screenshot: ${suggestion.supportingEvidence.screenshotPath ?? 'N/A'}\n`;
    markdown += `- Video: ${suggestion.supportingEvidence.videoPath ?? 'N/A'}\n\n`;
  });

  fs.writeFileSync(outputFile, markdown);
  console.log(`Maintenance markdown report written to ${outputFile}`);
}

runMaintenanceReport();