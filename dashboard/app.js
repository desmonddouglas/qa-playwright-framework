async function loadJson(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

async function loadText(path, fallback) {
  try {
    const response = await fetch(path);
    if (!response.ok) return fallback;
    return await response.text();
  } catch {
    return fallback;
  }
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderList(id, items) {
  const list = document.getElementById(id);
  list.innerHTML = '';

  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'None';
    list.appendChild(li);
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

async function initDashboard() {
  const failureSummary = await loadJson('./artifacts/failure-summary-v3.json', {});
  const releaseRisk = await loadJson('./artifacts/release-risk-report.json', {});
  const coverageGap = await loadJson('./artifacts/coverage-gap-report.json', []);
  const maintenance = await loadJson('./artifacts/maintenance-suggestions.json', []);
  const aiSummary = await loadText('./artifacts/ai-summary.md', 'No AI summary found.');

  const riskLevel = releaseRisk.riskLevel || 'unknown';
  const releaseRecommendation = releaseRisk.releaseRecommendation || 'unknown';

  const releaseStatus = document.getElementById('releaseStatus');
  releaseStatus.textContent = `${riskLevel.toUpperCase()} RISK\n${releaseRecommendation}`;
  releaseStatus.classList.add(`status-${riskLevel}`);

  setText('totalTests', failureSummary.uniqueTests ?? '--');
  setText('passedResults', failureSummary.passedResults ?? '--');
  setText('failedTests', failureSummary.failedTests ?? '--');
  setText('flakyTests', failureSummary.flakyTests ?? '--');
  setText('maintenanceCount', maintenance.length ?? 0);

  const missingCoverage = coverageGap.filter(area => area.status === 'missing');
  setText('coverageGaps', missingCoverage.length);

  setText('riskScore', releaseRisk.riskScore ?? '--');
  setText('riskLevel', riskLevel);
  setText('releaseRecommendation', releaseRecommendation);

  renderList('riskDrivers', releaseRisk.riskDrivers ?? []);

  renderList(
    'coverageList',
    coverageGap.map(area => `${area.area}: ${area.status} - ${area.recommendation}`)
  );

  renderList(
    'maintenanceList',
    maintenance.map(item => `${item.title}: ${item.suggestedChange}`)
  );

  setText('aiSummary', aiSummary);
}

initDashboard();