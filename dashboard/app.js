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

function getBadgeClass(level) {
  if (level === 'low') return 'badge badge-low';
  if (level === 'medium') return 'badge badge-medium';
  if (level === 'high') return 'badge badge-high';
  return 'badge badge-unknown';
}

async function initDashboard() {
  const failureSummary = await loadJson('./artifacts/failure-summary-v3.json', {});
  const releaseRisk = await loadJson('./artifacts/release-risk-report.json', {});
  const coverageGap = await loadJson('./artifacts/coverage-gap-report.json', []);
  const maintenance = await loadJson('./artifacts/maintenance-suggestions.json', []);
  const aiSummary = await loadText('./artifacts/ai-summary.md', 'No AI summary found.');

  const riskLevel = releaseRisk.riskLevel || 'unknown';
  const releaseRecommendation = releaseRisk.releaseRecommendation || 'unknown';

  // 🔥 Release Status Card (with badge + timestamp)
  const releaseStatus = document.getElementById('releaseStatus');
  releaseStatus.innerHTML = `
    <div class="${getBadgeClass(riskLevel)}">
      ${riskLevel.toUpperCase()} RISK
    </div>
    <div style="margin-top:10px; font-weight:600;">
      ${releaseRecommendation}
    </div>
  `;

  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
  releaseStatus.appendChild(timestamp);

  // 🔢 Metrics
  setText('totalTests', failureSummary.uniqueTests ?? '--');
  setText('passedResults', failureSummary.passedResults ?? '--');
  setText('failedTests', failureSummary.failedTests ?? '--');
  setText('flakyTests', failureSummary.flakyTests ?? '--');
  setText('maintenanceCount', maintenance.length ?? 0);

  const missingCoverage = coverageGap.filter(area => area.status === 'missing');
  setText('coverageGaps', missingCoverage.length);

  // 🚦 Risk Details
  setText('riskScore', releaseRisk.riskScore ?? '--');
  setText('riskLevel', riskLevel);
  setText('releaseRecommendation', releaseRecommendation);

  renderList('riskDrivers', releaseRisk.riskDrivers ?? []);

  renderList(
    'coverageList',
    coverageGap.map(area =>
      `${area.area.toUpperCase()}: ${area.status.toUpperCase()} — ${area.recommendation}`
    )
  );

  renderList(
    'maintenanceList',
    maintenance.map(item =>
      `${item.title}: ${item.suggestedChange}`
    )
  );

  // 🤖 AI Summary
  setText('aiSummary', aiSummary);
}

initDashboard();