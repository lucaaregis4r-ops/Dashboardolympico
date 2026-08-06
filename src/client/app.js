const METRICS = [
  { key: "loadScore", label: "Carga", max: 5, color: "#4246a6" },
  { key: "recoveryScore", label: "Recuperação", max: 5, color: "#168a64" },
  { key: "painLevel", label: "Dor", max: 10, color: "#df3046" },
  { key: "fatigueScore", label: "Fadiga", max: 5, color: "#d98418" },
  { key: "sleepScore", label: "Insônia", max: 5, color: "#4777c9" },
  { key: "muscleScore", label: "Dor muscular", max: 5, color: "#7856b8" },
  { key: "stressScore", label: "Estresse", max: 5, color: "#b9427f" },
  { key: "moodScore", label: "Humor", max: 5, color: "#168d82" },
];

const MODALITY_DEFS = [
  { id: "basquete", label: "Basquete", matchers: ["BASQUETE"] },
  { id: "volei-feminino", label: "Vôlei feminino", matchers: ["VOLEI FEM"] },
  { id: "volei-masculino", label: "Vôlei masculino", matchers: ["VOLEI MASC"] },
  { id: "natacao", label: "Natação", matchers: ["NATACAO"] },
  { id: "futsal", label: "Futsal", matchers: ["FUTSAL"] },
];

const STORAGE_KEY = "dashboard-olympico-training-checks";
const LOGIN_SESSION_KEY = "dashboard-olympico-authenticated";
const LOGIN_USER = "olympico";
const LOGIN_PASSWORD = "olympico80";
const DEPLOYMENT = {
  staticHosting: false,
  reportsEnabled: true,
  athletesUrl: "/api/athletes",
  physiotherapyUrl: "/api/physiotherapy",
  ...(window.OLYMPICO_CONFIG || {}),
};
const state = {
  athletes: [],
  categories: [],
  updatedAt: null,
  selectedAthleteId: null,
  selectedTeam: "",
  viewMode: "athlete",
  activeSection: "panel",
  filters: {
    search: "",
    category: "",
  },
  controls: {
    timeline: {
      period: "90",
      metrics: ["loadScore", "recoveryScore", "painLevel", "stressScore"],
    },
    profile: {
      period: "90",
      metrics: ["loadScore", "recoveryScore", "fatigueScore", "sleepScore", "stressScore"],
    },
    distribution: {
      period: "latest",
      metrics: ["loadScore", "recoveryScore", "painLevel", "stressScore"],
    },
    sample: {
      period: "latest",
      metric: "loadScore",
    },
  },
  charts: {
    timeline: null,
    profile: null,
    distribution: null,
    sample: null,
  },
  trainingCalendar: null,
  trainingChecks: loadTrainingChecks(),
  staffDrawerOpen: false,
  staffReturnFocus: null,
  staffModality: "all",
  staffPeriod: "30",
  exportInFlight: false,
  selectedTrainingDate: null,
  physiotherapy: {
    items: [],
    modalities: [],
    updatedAtLabel: "",
    loaded: false,
    loading: false,
    error: "",
    filters: {
      search: "",
      modality: "",
      team: "",
      severity: "",
    },
  },
};

const elements = {
  appShell: document.querySelector("#app-shell"),
  loginScreen: document.querySelector("#login-screen"),
  loginForm: document.querySelector("#login-form"),
  loginUser: document.querySelector("#login-user"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  logoutButton: document.querySelector("#logout-button"),
  stats: document.querySelector("#stats"),
  updatedAt: document.querySelector("#updated-at"),
  searchInput: document.querySelector("#search-input"),
  categoryFilter: document.querySelector("#category-filter"),
  refreshButton: document.querySelector("#refresh-button"),
  exportMenu: document.querySelector("#export-menu"),
  exportButtons: document.querySelector("#export-buttons"),
  resultsCount: document.querySelector("#results-count"),
  athletesGrid: document.querySelector("#athletes-grid"),
  emptyState: document.querySelector("#empty-state"),
  errorState: document.querySelector("#error-state"),
  navPanelButton: document.querySelector("#nav-panel-button"),
  navAthletesButton: document.querySelector("#nav-athletes-button"),
  navTeamsButton: document.querySelector("#nav-teams-button"),
  navCalendarButton: document.querySelector("#nav-calendar-button"),
  navPhysiotherapyButton: document.querySelector("#nav-physiotherapy-button"),
  topbarEyebrow: document.querySelector("#topbar-eyebrow"),
  topbarTitle: document.querySelector("#topbar-title"),
  topbarActions: document.querySelector("#topbar-actions"),
  panelWorkspace: document.querySelector("#panel-workspace"),
  calendarWorkspace: document.querySelector("#calendar-workspace"),
  physiotherapyWorkspace: document.querySelector("#physiotherapy-workspace"),
  physiotherapyUpdatedAt: document.querySelector("#physiotherapy-updated-at"),
  physiotherapyRefresh: document.querySelector("#physiotherapy-refresh"),
  physiotherapySearch: document.querySelector("#physiotherapy-search"),
  physiotherapyModality: document.querySelector("#physiotherapy-modality"),
  physiotherapyTeam: document.querySelector("#physiotherapy-team"),
  physiotherapySeverity: document.querySelector("#physiotherapy-severity"),
  physiotherapyStats: document.querySelector("#physiotherapy-stats"),
  physiotherapyResultsCount: document.querySelector("#physiotherapy-results-count"),
  physiotherapyState: document.querySelector("#physiotherapy-state"),
  physiotherapyList: document.querySelector("#physiotherapy-list"),
  calendarTeamSelect: document.querySelector("#calendar-team-select"),
  trainingCalendarView: document.querySelector("#training-calendar-view"),
  template: document.querySelector("#athlete-card-template"),
  detail: document.querySelector("#athlete-detail"),
  detailPlaceholder: document.querySelector("#detail-placeholder"),
  detailContent: document.querySelector("#detail-content"),
  detailCategory: document.querySelector("#detail-category"),
  detailName: document.querySelector("#detail-name"),
  detailSubtitle: document.querySelector("#detail-subtitle"),
  detailHighlights: document.querySelector("#detail-highlights"),
  teamSelect: document.querySelector("#team-select"),
  athleteModeButton: document.querySelector("#athlete-mode-button"),
  teamModeButton: document.querySelector("#team-mode-button"),
  timelineTitle: document.querySelector("#timeline-title"),
  profileTitle: document.querySelector("#profile-title"),
  distributionTitle: document.querySelector("#distribution-title"),
  sampleTitle: document.querySelector("#sample-title"),
  timelineCanvas: document.querySelector("#timeline-chart"),
  profileCanvas: document.querySelector("#profile-chart"),
  distributionCanvas: document.querySelector("#distribution-chart"),
  sampleCanvas: document.querySelector("#sample-chart"),
  timelinePeriod: document.querySelector("#timeline-period"),
  profilePeriod: document.querySelector("#profile-period"),
  distributionPeriod: document.querySelector("#distribution-period"),
  samplePeriod: document.querySelector("#sample-period"),
  sampleMetric: document.querySelector("#sample-metric"),
  timelineMetrics: document.querySelector("#timeline-metrics"),
  profileMetrics: document.querySelector("#profile-metrics"),
  distributionMetrics: document.querySelector("#distribution-metrics"),
  distributionReport: document.querySelector("#distribution-report"),
  trainingPanel: document.querySelector("#training-panel"),
  trainingList: document.querySelector("#training-list"),
  trainingDetail: document.querySelector("#training-calendar-detail"),
  staffDrawer: document.querySelector("#staff-drawer"),
  staffOpenButton: document.querySelector("#staff-open-button"),
  staffCloseButton: document.querySelector("#staff-close-button"),
  staffCloseBackdrop: document.querySelector("#staff-close-backdrop"),
  staffModalityFilter: document.querySelector("#staff-modality-filter"),
  staffPeriodFilter: document.querySelector("#staff-period-filter"),
  staffFatigueList: document.querySelector("#staff-fatigue-list"),
  staffStressList: document.querySelector("#staff-stress-list"),
  staffRecoveryList: document.querySelector("#staff-recovery-list"),
};

if (!DEPLOYMENT.reportsEnabled) {
  elements.exportMenu?.classList.add("hidden");
}

function isAuthenticated() {
  return sessionStorage.getItem(LOGIN_SESSION_KEY) === "true";
}

function showDashboard() {
  elements.loginScreen.classList.add("hidden");
  elements.appShell.classList.remove("hidden");
  loadAthletes();
}

function showLogin() {
  elements.appShell.classList.add("hidden");
  elements.loginScreen.classList.remove("hidden");
  elements.loginPassword.value = "";
  elements.loginUser.focus();
}

function handleLogin(event) {
  event.preventDefault();

  const user = elements.loginUser.value.trim().toLowerCase();
  const password = elements.loginPassword.value;

  if (user === LOGIN_USER && password === LOGIN_PASSWORD) {
    sessionStorage.setItem(LOGIN_SESSION_KEY, "true");
    elements.loginError.classList.add("hidden");
    showDashboard();
    return;
  }

  elements.loginError.classList.remove("hidden");
  elements.loginPassword.value = "";
  elements.loginPassword.focus();
}

function handleLogout() {
  sessionStorage.removeItem(LOGIN_SESSION_KEY);
  showLogin();
}

function loadTrainingChecks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveTrainingChecks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trainingChecks));
}

function roundNumber(value, digits = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return null;
  }

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

function standardDeviation(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length < 2) {
    return null;
  }

  const mean = average(validValues);
  const variance =
    validValues.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (validValues.length - 1);

  return Math.sqrt(variance);
}

function skewness(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length < 3) {
    return null;
  }

  const mean = average(validValues);
  const sd = standardDeviation(validValues);

  if (!Number.isFinite(sd) || sd === 0) {
    return 0;
  }

  const n = validValues.length;
  return validValues.reduce((total, value) => total + ((value - mean) / sd) ** 3, 0) / n;
}

function kurtosisExcess(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length < 4) {
    return null;
  }

  const mean = average(validValues);
  const sd = standardDeviation(validValues);

  if (!Number.isFinite(sd) || sd === 0) {
    return 0;
  }

  const n = validValues.length;
  return (
    validValues.reduce((total, value) => total + ((value - mean) / sd) ** 4, 0) / n - 3
  );
}

function erfApproximation(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);

  return sign * y;
}

function normalCdf(value, mean, sd) {
  if (!Number.isFinite(sd) || sd <= 0) {
    return null;
  }

  return 0.5 * (1 + erfApproximation((value - mean) / (sd * Math.sqrt(2))));
}

function logNormalCdf(value, meanLog, sdLog) {
  if (value <= 0 || !Number.isFinite(sdLog) || sdLog <= 0) {
    return null;
  }

  return normalCdf(Math.log(value), meanLog, sdLog);
}

function uniformCdf(value, minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue <= minValue) {
    return null;
  }

  if (value <= minValue) {
    return 0;
  }

  if (value >= maxValue) {
    return 1;
  }

  return (value - minValue) / (maxValue - minValue);
}

function ksStatistic(values, cdfFunction) {
  const sortedValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (!sortedValues.length) {
    return null;
  }

  let maxDistance = 0;
  const n = sortedValues.length;

  sortedValues.forEach((value, index) => {
    const empiricalTop = (index + 1) / n;
    const empiricalBottom = index / n;
    const theoretical = cdfFunction(value);

    if (!Number.isFinite(theoretical)) {
      return;
    }

    maxDistance = Math.max(
      maxDistance,
      Math.abs(empiricalTop - theoretical),
      Math.abs(empiricalBottom - theoretical)
    );
  });

  return roundNumber(maxDistance, 3);
}

function describeFitStrength(statistic) {
  if (!Number.isFinite(statistic)) {
    return "insuficiente";
  }

  if (statistic <= 0.08) {
    return "forte";
  }

  if (statistic <= 0.14) {
    return "moderado";
  }

  return "fraco";
}

function evaluateDistributionFits(values) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length < 5) {
    return {
      bestFit: null,
      candidates: [],
      skewness: roundNumber(skewness(validValues), 2),
      kurtosis: roundNumber(kurtosisExcess(validValues), 2),
      sampleSize: validValues.length,
    };
  }

  const mean = average(validValues);
  const sd = standardDeviation(validValues);
  const logValues = validValues.filter((value) => value > 0).map((value) => Math.log(value));
  const meanLog = average(logValues);
  const sdLog = standardDeviation(logValues);
  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);

  const candidates = [];

  if (Number.isFinite(mean) && Number.isFinite(sd) && sd > 0) {
    candidates.push({
      name: "Normal",
      statistic: ksStatistic(validValues, (value) => normalCdf(value, mean, sd)),
      details: `média ${roundNumber(mean, 2)} · desvio ${roundNumber(sd, 2)}`,
    });
  }

  if (logValues.length === validValues.length && sdLog > 0) {
    candidates.push({
      name: "Log-normal",
      statistic: ksStatistic(validValues, (value) => logNormalCdf(value, meanLog, sdLog)),
      details: `média log ${roundNumber(meanLog, 2)} · desvio log ${roundNumber(sdLog, 2)}`,
    });
  }

  if (maxValue > minValue) {
    candidates.push({
      name: "Uniforme",
      statistic: ksStatistic(validValues, (value) => uniformCdf(value, minValue, maxValue)),
      details: `min ${roundNumber(minValue, 2)} · max ${roundNumber(maxValue, 2)}`,
    });
  }

  const ranked = candidates
    .filter((candidate) => Number.isFinite(candidate.statistic))
    .sort((left, right) => left.statistic - right.statistic)
    .map((candidate) => ({
      ...candidate,
      strength: describeFitStrength(candidate.statistic),
    }));

  return {
    bestFit: ranked[0] || null,
    candidates: ranked,
    skewness: roundNumber(skewness(validValues), 2),
    kurtosis: roundNumber(kurtosisExcess(validValues), 2),
    sampleSize: validValues.length,
  };
}

function buildHistogram(values, metricKey) {
  const validValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (!validValues.length) {
    return {
      labels: [],
      counts: [],
    };
  }

  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);
  const targetBins = Math.min(8, Math.max(4, Math.round(Math.sqrt(validValues.length))));
  const range = maxValue - minValue || 1;
  const binWidth = metricKey === "painLevel" ? 1 : Math.max(0.5, range / targetBins);
  const start =
    metricKey === "painLevel" ? Math.floor(minValue) : Math.floor(minValue / binWidth) * binWidth;
  const end = metricKey === "painLevel" ? Math.ceil(maxValue) + 1 : maxValue + binWidth;

  const bins = [];
  for (let edge = start; edge < end; edge += binWidth) {
    bins.push({
      start: edge,
      end: edge + binWidth,
      count: 0,
    });
  }

  validValues.forEach((value) => {
    const index = Math.min(
      bins.length - 1,
      Math.max(0, Math.floor((value - start) / binWidth))
    );
    bins[index].count += 1;
  });

  return {
    labels: bins.map((bin) =>
      metricKey === "painLevel"
        ? `${roundNumber(bin.start, 0)}`
        : `${roundNumber(bin.start, 1)}-${roundNumber(bin.end, 1)}`
    ),
    counts: bins.map((bin) => bin.count),
  };
}

function percentile(values, target) {
  const validValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (!validValues.length || !Number.isFinite(target)) {
    return null;
  }

  const lessThan = validValues.filter((value) => value < target).length;
  const equalTo = validValues.filter((value) => value === target).length;
  return roundNumber(((lessThan + equalTo * 0.5) / validValues.length) * 100, 0);
}

function quantile(values, ratio) {
  const validValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (!validValues.length) {
    return null;
  }

  if (validValues.length === 1) {
    return validValues[0];
  }

  const index = (validValues.length - 1) * ratio;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return validValues[lowerIndex];
  }

  return validValues[lowerIndex] * (1 - weight) + validValues[upperIndex] * weight;
}

function buildDistributionSummary(values) {
  return {
    p25: roundNumber(quantile(values, 0.25)),
    median: roundNumber(quantile(values, 0.5)),
    p75: roundNumber(quantile(values, 0.75)),
  };
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function getMetricByKey(metricKey) {
  return METRICS.find((metric) => metric.key === metricKey);
}

function getModalityDefById(modalityId) {
  return MODALITY_DEFS.find((item) => item.id === modalityId) || null;
}

function inferModalityId(category) {
  const token = normalizeToken(category);
  const modality = MODALITY_DEFS.find((item) =>
    item.matchers.some((matcher) => token.includes(normalizeToken(matcher)))
  );

  return modality?.id || "outras";
}

function inferModalityLabel(category) {
  return getModalityDefById(inferModalityId(category))?.label || "Outras";
}

function computeRecoveryFromEntry(entry) {
  const values = [
    Number.isFinite(entry.fatigueScore) ? 6 - entry.fatigueScore : null,
    Number.isFinite(entry.stressScore) ? 6 - entry.stressScore : null,
    Number.isFinite(entry.muscleScore) ? 6 - entry.muscleScore : null,
    Number.isFinite(entry.sleepScore) ? 6 - entry.sleepScore : null,
    Number.isFinite(entry.moodScore) ? entry.moodScore : null,
    Number.isFinite(entry.painLevel) ? 6 - Math.min(5, entry.painLevel / 2) : null,
  ];

  return roundNumber(average(values));
}

function hydrateAthletes(athletes) {
  return athletes.map((athlete) => {
    const entries = athlete.entries.map((entry) => ({
      ...entry,
      recoveryScore: computeRecoveryFromEntry(entry),
    }));
    const latest = {
      ...athlete.latest,
      recoveryScore: computeRecoveryFromEntry(athlete.latest),
    };

    return {
      ...athlete,
      entries,
      latest,
      modalityId: inferModalityId(athlete.category),
      modalityLabel: inferModalityLabel(athlete.category),
      trendAverage: roundNumber(athlete.trendAverage),
    };
  });
}

function getSelectedAthlete() {
  return state.athletes.find((athlete) => athlete.id === state.selectedAthleteId) || null;
}

function getActiveTeam() {
  const selectedAthlete = getSelectedAthlete();
  if (state.selectedTeam) {
    return state.selectedTeam;
  }
  if (selectedAthlete) {
    return selectedAthlete.category;
  }
  return state.categories[0] || "";
}

function filterEntriesByPeriod(entries, period) {
  if (period === "all") {
    return entries;
  }

  if (period === "latest") {
    return entries.slice(0, 1);
  }

  const days = Number(period);
  const latestTimestamp = state.updatedAt ? Date.parse(state.updatedAt) : Date.now();
  const threshold = latestTimestamp - days * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const timestamp = entry.timestampIso ? Date.parse(entry.timestampIso) : null;
    return Number.isFinite(timestamp) && timestamp >= threshold;
  });
}

function getMetricValue(entry, metricKey) {
  return entry?.[metricKey];
}

function getMetricDisplayValue(entry, metricKey) {
  const value = getMetricValue(entry, metricKey);

  if (!Number.isFinite(value)) {
    return null;
  }

  if (metricKey === "painLevel") {
    return roundNumber(value / 2, 2);
  }

  return value;
}

function getMetricDisplayMax(metricKey) {
  return metricKey === "painLevel" ? 5 : getMetricByKey(metricKey)?.max || 5;
}

function getLineChartRange(metricKeys) {
  const maxValue = Math.max(...metricKeys.map((metricKey) => getMetricDisplayMax(metricKey)), 5);
  return {
    min: 0,
    max: maxValue,
    stepSize: maxValue <= 5 ? 1 : 2,
  };
}

function aggregateEntries(entries, metricKey) {
  return average(entries.map((entry) => getMetricValue(entry, metricKey)));
}

function buildRollingWindowValues(entries, metricKey, windowSize = 3) {
  if (!Array.isArray(entries) || entries.length < windowSize) {
    return [];
  }

  const chronological = entries.slice().reverse();
  const values = [];

  for (let index = 0; index <= chronological.length - windowSize; index += 1) {
    const windowEntries = chronological.slice(index, index + windowSize);
    const windowValues = windowEntries.map((entry) => getMetricValue(entry, metricKey));

    if (windowValues.every((value) => Number.isFinite(value))) {
      values.push(roundNumber(average(windowValues), 2));
    }
  }

  return values;
}

function getCurrentMovingAverage(entries, metricKey, windowSize = 3) {
  if (!Array.isArray(entries) || entries.length < windowSize) {
    return null;
  }

  const recentEntries = entries.slice(0, windowSize);
  const values = recentEntries.map((entry) => getMetricValue(entry, metricKey));

  if (!values.every((value) => Number.isFinite(value))) {
    return null;
  }

  return roundNumber(average(values), 2);
}

function classifyPercentileBand(percentileValue) {
  if (!Number.isFinite(percentileValue)) {
    return "Sem base";
  }

  if (percentileValue >= 85) {
    return "Muito alta";
  }

  if (percentileValue >= 65) {
    return "Alta";
  }

  if (percentileValue >= 35) {
    return "Habitual";
  }

  if (percentileValue >= 15) {
    return "Baixa";
  }

  return "Muito baixa";
}

function buildAthleteLoadBaseline(athlete) {
  const baselineSeries = buildRollingWindowValues(athlete.entries, "loadScore", 3);
  const currentMovingAverage = getCurrentMovingAverage(athlete.entries, "loadScore", 3);
  const ownPercentile = percentile(baselineSeries, currentMovingAverage);
  const teamCurrentMovingAverages = getAthletesByTeam(athlete.category)
    .map((teamAthlete) => getCurrentMovingAverage(teamAthlete.entries, "loadScore", 3))
    .filter((value) => Number.isFinite(value));
  const teamPercentile = percentile(teamCurrentMovingAverages, currentMovingAverage);

  return {
    currentMovingAverage,
    ownPercentile,
    ownBand: classifyPercentileBand(ownPercentile),
    teamPercentile,
    teamBand: classifyPercentileBand(teamPercentile),
    baselineCount: baselineSeries.length,
  };
}

function buildTeamLoadBaseline(teamName) {
  const teamAthletes = getAthletesByTeam(teamName);
  const currentMovingAverages = teamAthletes
    .map((athlete) => getCurrentMovingAverage(athlete.entries, "loadScore", 3))
    .filter((value) => Number.isFinite(value));

  const currentTeamAverage = roundNumber(average(currentMovingAverages), 2);

  const teamTimeline = new Map();
  teamAthletes.forEach((athlete) => {
    const chronological = athlete.entries.slice().reverse();
    chronological.forEach((entry) => {
      const key = entry.reportedDate || entry.timestampDisplay || entry.timestampIso;
      if (!teamTimeline.has(key)) {
        const sortValue = entry.timestampIso ? Date.parse(entry.timestampIso) : Date.parse(key) || 0;
        teamTimeline.set(key, { sortValue, values: [] });
      }
      const value = getMetricValue(entry, "loadScore");
      if (Number.isFinite(value)) {
        teamTimeline.get(key).values.push(value);
      }
    });
  });

  const teamAggregatedSeries = Array.from(teamTimeline.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((item) => roundNumber(average(item.values), 2))
    .filter((value) => Number.isFinite(value));

  const teamBaselineSeries = buildRollingWindowValues(
    teamAggregatedSeries.map((value) => ({ loadScore: value })),
    "loadScore",
    3
  );

  const clubCurrentTeamAverages = state.categories
    .map((category) => {
      const values = getAthletesByTeam(category)
        .map((athlete) => getCurrentMovingAverage(athlete.entries, "loadScore", 3))
        .filter((value) => Number.isFinite(value));
      return roundNumber(average(values), 2);
    })
    .filter((value) => Number.isFinite(value));

  const teamHistoryPercentile = percentile(teamBaselineSeries, currentTeamAverage);
  const clubPercentile = percentile(clubCurrentTeamAverages, currentTeamAverage);

  return {
    currentTeamAverage,
    teamHistoryPercentile,
    teamHistoryBand: classifyPercentileBand(teamHistoryPercentile),
    clubPercentile,
    clubBand: classifyPercentileBand(clubPercentile),
    baselineCount: teamBaselineSeries.length,
  };
}

function aggregateAthlete(athlete, metricKey, period) {
  const entries = filterEntriesByPeriod(athlete.entries, period);
  return aggregateEntries(entries, metricKey);
}

function getAthletesByTeam(teamName) {
  return state.athletes.filter((athlete) => athlete.category === teamName);
}

function getTeamDistribution(teamName, metricKey, period) {
  return getAthletesByTeam(teamName)
    .map((athlete) => aggregateAthlete(athlete, metricKey, period))
    .filter((value) => Number.isFinite(value));
}

function getBaseDistribution(metricKey, period) {
  return state.athletes
    .map((athlete) => aggregateAthlete(athlete, metricKey, period))
    .filter((value) => Number.isFinite(value));
}

function getTeamAggregate(teamName, metricKey, period) {
  return average(getTeamDistribution(teamName, metricKey, period));
}

function getAllTeamsAggregate(metricKey, period) {
  return state.categories
    .map((category) => getTeamAggregate(category, metricKey, period))
    .filter((value) => Number.isFinite(value));
}

function formatRatio(value, max = 5) {
  if (!Number.isFinite(value)) {
    return "Sem base";
  }
  return `${roundNumber(value, 1)}/${max}`;
}

function formatPercentile(value) {
  if (!Number.isFinite(value)) {
    return "Sem base";
  }
  return `${value}%`;
}

function formatEntryDate(entry) {
  return entry.reportedDate || entry.timestampDisplay || "Sem data";
}

function formatPeriodLabel(period) {
  if (period === "all") {
    return "todo o histórico";
  }

  const days = Number(period);
  return Number.isFinite(days) ? `${days} dias` : "período recente";
}

function getTrainingCheckKey(teamName, dateLabel) {
  return `${teamName}__${dateLabel}`;
}

function isTrainingChecked(teamName, dateLabel) {
  return Boolean(state.trainingChecks[getTrainingCheckKey(teamName, dateLabel)]);
}

function setTrainingChecked(teamName, dateLabel, checked) {
  const key = getTrainingCheckKey(teamName, dateLabel);
  if (checked) {
    state.trainingChecks[key] = true;
  } else {
    delete state.trainingChecks[key];
  }
  saveTrainingChecks();
}

function filterAthletes() {
  const search = state.filters.search.trim().toLowerCase();

  return state.athletes.filter((athlete) => {
    const matchesSearch =
      !search ||
      athlete.name.toLowerCase().includes(search) ||
      athlete.category.toLowerCase().includes(search);
    const matchesTeam = !state.filters.category || athlete.category === state.filters.category;
    return matchesSearch && matchesTeam;
  });
}

function computeCardSummaryLegacy(athlete) {
  const teamValues = getTeamDistribution(athlete.category, "loadScore", "latest");
  const percentileValue = percentile(teamValues, athlete.latest.loadScore);

  return {
    teamPercentile: percentileValue,
    text: `Carga ${formatRatio(athlete.latest.loadScore)} · recuperação ${formatRatio(
      athlete.latest.recoveryScore
    )}`,
  };
}

function computeCardSummary(athlete) {
  const baseline = buildAthleteLoadBaseline(athlete);

  return {
    teamPercentile: baseline.teamPercentile,
    text: `MM3 ${formatRatio(baseline.currentMovingAverage)} · ${baseline.ownBand.toLowerCase()} pessoal`,
  };
}

function computeStaffRanking(athletes, period) {
  const current = athletes.map((athlete) => {
    const recentEntries = filterEntriesByPeriod(athlete.entries, period);
    const teamAthletes = athletes.filter((item) => item.category === athlete.category);
    const loadBaseline = buildAthleteLoadBaseline({
      ...athlete,
      entries: recentEntries.length ? recentEntries : athlete.entries,
    });
    const sustainedFatigue = average(
      recentEntries.map((entry) => entry.fatigueScore)
    );
    const sustainedStress = average(
      recentEntries.map((entry) => entry.stressScore)
    );
    const sustainedRecovery = average(
      recentEntries.map((entry) => entry.recoveryScore)
    );
    const fatigueHighCount = recentEntries.filter(
      (entry) => Number.isFinite(entry.fatigueScore) && entry.fatigueScore >= 4
    ).length;
    const recoveryLowCount = recentEntries.filter(
      (entry) => Number.isFinite(entry.recoveryScore) && entry.recoveryScore <= 2.5
    ).length;

    return {
      ...athlete,
      fatigueValue: sustainedFatigue,
      stressValue: sustainedStress,
      recoveryValue: sustainedRecovery,
      fatigueHighCount,
      recoveryLowCount,
      recentWindow: recentEntries.length,
      loadBaseline,
      stressHighCount: recentEntries.filter(
        (entry) => Number.isFinite(entry.stressScore) && entry.stressScore >= 4
      ).length,
    };
  });

  const fatigueMeans = current.map((item) => item.fatigueValue).filter(Number.isFinite);
  const stressMeans = current.map((item) => item.stressValue).filter(Number.isFinite);
  const recoveryMeans = current.map((item) => item.recoveryValue).filter(Number.isFinite);
  const fatigueMean = average(fatigueMeans);
  const stressMean = average(stressMeans);
  const recoveryMean = average(recoveryMeans);
  const fatigueSd = standardDeviation(fatigueMeans) || 1;
  const stressSd = standardDeviation(stressMeans) || 1;
  const recoverySd = standardDeviation(recoveryMeans) || 1;

  current.forEach((item) => {
    const fatigueZ = Number.isFinite(item.fatigueValue)
      ? (item.fatigueValue - fatigueMean) / fatigueSd
      : null;
    const stressZ = Number.isFinite(item.stressValue)
      ? (item.stressValue - stressMean) / stressSd
      : null;
    const recoveryZ = Number.isFinite(item.recoveryValue)
      ? (recoveryMean - item.recoveryValue) / recoverySd
      : null;

    item.fatigueRiskScore = roundNumber(
      (Number.isFinite(item.loadBaseline.teamPercentile) ? Math.max(0, (item.loadBaseline.teamPercentile - 65) / 20) : 0) +
        (Number.isFinite(fatigueZ) ? fatigueZ * 0.45 : 0) +
        (item.fatigueHighCount / Math.max(1, item.recentWindow)) * 1.35 +
        (item.recoveryLowCount / Math.max(1, item.recentWindow)) * 0.7,
      2
    );
    item.stressRiskScore = roundNumber(
      (Number.isFinite(stressZ) ? stressZ * 0.65 : 0) +
        (item.stressHighCount / Math.max(1, item.recentWindow)) * 1.2,
      2
    );
    item.recoveryRiskScore = roundNumber(
      (Number.isFinite(recoveryZ) ? recoveryZ * 0.55 : 0) +
        (item.recoveryLowCount / Math.max(1, item.recentWindow)) * 1.4 +
        (item.fatigueHighCount / Math.max(1, item.recentWindow)) * 0.55,
      2
    );
  });

  return {
    fatigue: current
      .filter(
        (item) =>
          Number.isFinite(item.fatigueValue) &&
          Number.isFinite(item.loadBaseline.teamPercentile) &&
          item.loadBaseline.teamPercentile >= 65
      )
      .sort((left, right) => right.fatigueRiskScore - left.fatigueRiskScore)
      .slice(0, 8),
    stress: current
      .filter(
        (item) =>
          Number.isFinite(item.stressValue) &&
          (item.stressHighCount >= 2 || item.stressRiskScore >= 1)
      )
      .sort((left, right) => right.stressRiskScore - left.stressRiskScore)
      .slice(0, 8),
    recovery: current
      .filter(
        (item) =>
          Number.isFinite(item.recoveryValue) &&
          (item.recoveryLowCount >= 2 || item.fatigueHighCount >= 2)
      )
      .sort((left, right) => right.recoveryRiskScore - left.recoveryRiskScore)
      .slice(0, 8),
  };
}

function getRiskLevel(score) {
  if (!Number.isFinite(score)) {
    return { label: "Sem base", tone: "low" };
  }
  if (score >= 1.9) {
    return { label: "Crítico", tone: "high" };
  }
  if (score >= 1.1) {
    return { label: "Atenção", tone: "medium" };
  }
  return { label: "Monitorar", tone: "low" };
}

function renderStaffList(container, items, valueFormatter, scoreGetter, noteGetter) {
  if (!items.length) {
    container.innerHTML = '<div class="staff-empty">Sem base suficiente.</div>';
    return;
  }

  container.innerHTML = items
    .map(
      (athlete, index) => {
        const score = scoreGetter(athlete);
        const risk = getRiskLevel(score);
        return `
        <article class="staff-item">
          <div>
            <span class="staff-item__rank">#${index + 1}</span>
            <h4>${athlete.name}</h4>
            <p>${athlete.category} · janela ${athlete.recentWindow}</p>
            <div class="staff-item__bar">
              <span class="staff-item__bar-fill staff-item__bar-fill--${risk.tone}" style="width:${Math.max(
                18,
                Math.min(100, ((score || 0) / 2.6) * 100)
              )}%"></span>
            </div>
            <small>${noteGetter(athlete)}</small>
          </div>
          <div class="staff-item__aside">
            <strong>${valueFormatter(athlete)}</strong>
            <span class="staff-item__risk staff-item__risk--${risk.tone}">${risk.label}</span>
          </div>
        </article>
      `;
      }
    )
    .join("");

  container.querySelectorAll(".staff-item").forEach((item, index) => {
    const meta = item.querySelector("p");
    if (meta) {
      meta.textContent = `${items[index].category} · ${items[index].recentWindow} respostas`;
    }
  });
}

function renderStaffDrawerLegacy() {
  const filtered =
    state.staffModality === "all"
      ? state.athletes
      : state.athletes.filter((athlete) => athlete.modalityId === state.staffModality);
  const ranking = computeStaffRanking(filtered, state.staffPeriod);

  renderStaffList(
    elements.staffFatigueList,
    ranking.fatigue,
    (athlete) => formatRatio(athlete.fatigueValue),
    (athlete) => athlete.fatigueRiskScore,
    (athlete) =>
      `${athlete.fatigueHighCount} fadiga alta + ${athlete.recoveryLowCount} recuperação baixa em ${formatPeriodLabel(
        state.staffPeriod
      )}`
  );
  renderStaffList(
    elements.staffStressList,
    ranking.stress,
    (athlete) => formatRatio(athlete.stressValue),
    (athlete) => athlete.stressRiskScore,
    (athlete) =>
      `${athlete.stressHighCount} respostas altas em ${formatPeriodLabel(state.staffPeriod)}`
  );
  renderStaffList(
    elements.staffRecoveryList,
    ranking.recovery,
    (athlete) => formatRatio(athlete.recoveryValue),
    (athlete) => athlete.recoveryRiskScore,
    (athlete) =>
      `${athlete.recoveryLowCount} recuperação baixa + ${athlete.fatigueHighCount} fadiga alta em ${formatPeriodLabel(
        state.staffPeriod
      )}`
  );
}

function renderStaffDrawer() {
  const filtered =
    state.staffModality === "all"
      ? state.athletes
      : state.athletes.filter((athlete) => athlete.modalityId === state.staffModality);
  const ranking = computeStaffRanking(filtered, state.staffPeriod);

  renderStaffList(
    elements.staffFatigueList,
    ranking.fatigue,
    (athlete) => formatRatio(athlete.fatigueValue),
    (athlete) => athlete.fatigueRiskScore,
    (athlete) =>
      `Baseline ${formatPercentile(athlete.loadBaseline.teamPercentile)} · ${athlete.loadBaseline.teamBand} na equipe`
  );
  renderStaffList(
    elements.staffStressList,
    ranking.stress,
    (athlete) => formatRatio(athlete.stressValue),
    (athlete) => athlete.stressRiskScore,
    (athlete) =>
      `${athlete.stressHighCount} respostas altas em ${formatPeriodLabel(state.staffPeriod)}`
  );
  renderStaffList(
    elements.staffRecoveryList,
    ranking.recovery,
    (athlete) => formatRatio(athlete.recoveryValue),
    (athlete) => athlete.recoveryRiskScore,
    (athlete) =>
      `${athlete.recoveryLowCount} recuperação baixa + ${athlete.fatigueHighCount} fadiga alta`
  );
}

function openStaffDrawer() {
  state.staffReturnFocus = document.activeElement;
  state.staffDrawerOpen = true;
  elements.staffDrawer.classList.remove("hidden");
  elements.staffDrawer.setAttribute("aria-hidden", "false");
  renderStaffDrawer();
  elements.staffCloseButton.focus();
}

function closeStaffDrawer() {
  state.staffDrawerOpen = false;
  elements.staffDrawer.classList.add("hidden");
  elements.staffDrawer.setAttribute("aria-hidden", "true");
  if (state.staffReturnFocus instanceof HTMLElement) {
    state.staffReturnFocus.focus();
  }
  state.staffReturnFocus = null;
}

function handleStaffDrawerKeydown(event) {
  if (!state.staffDrawerOpen) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeStaffDrawer();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = Array.from(
    elements.staffDrawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.closest(".hidden"));

  if (!focusable.length) {
    event.preventDefault();
    elements.staffCloseButton.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function renderStatsLegacy() {
  const activeTeam = getActiveTeam();
  const teamAthletes = activeTeam ? getAthletesByTeam(activeTeam) : [];
  const globalLoadValues = getBaseDistribution("loadScore", "latest");
  const teamLoadValues = activeTeam ? getTeamDistribution(activeTeam, "loadScore", "latest") : [];
  const globalSummary = buildDistributionSummary(globalLoadValues);
  const teamSummary = buildDistributionSummary(teamLoadValues);
  const lowRecoveryCount = state.athletes.filter(
    (athlete) => Number.isFinite(athlete.latest.recoveryScore) && athlete.latest.recoveryScore <= 2.5
  ).length;

  const cards = [
    {
      label: "Atletas monitorados",
      value: state.athletes.length,
      note: `${state.categories.length} equipes na base`,
    },
    {
      label: "Equipe em foco",
      value: teamAthletes.length || 0,
      note: activeTeam || "Sem equipe selecionada",
    },
    {
      label: "Faixa central global",
      value:
        globalSummary.p25 !== null && globalSummary.p75 !== null
          ? `${formatRatio(globalSummary.p25)} a ${formatRatio(globalSummary.p75)}`
          : "Sem base",
      note: `Mediana global ${formatRatio(globalSummary.median)}`,
    },
    {
      label: "Recuperação baixa",
      value: `${lowRecoveryCount}`,
      note:
        teamSummary.p25 !== null && teamSummary.p75 !== null
          ? `Equipe ${formatRatio(teamSummary.p25)} a ${formatRatio(teamSummary.p75)}`
          : "Sem base",
    },
  ];

  elements.stats.innerHTML = cards
    .map(
      (card) => `
        <article>
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function renderStats() {
  const activeTeam = getActiveTeam();
  const teamAthletes = activeTeam ? getAthletesByTeam(activeTeam) : [];
  const selectedAthlete = getSelectedAthlete();
  const athleteBaseline = selectedAthlete ? buildAthleteLoadBaseline(selectedAthlete) : null;
  const teamBaseline = activeTeam ? buildTeamLoadBaseline(activeTeam) : null;
  const globalLoadValues = getBaseDistribution("loadScore", "latest");
  const globalSummary = buildDistributionSummary(globalLoadValues);

  const cards = [
    {
      label: "Atletas monitorados",
      value: state.athletes.length,
      note: `${state.categories.length} equipes na base`,
    },
    {
      label: "Equipe em foco",
      value: teamAthletes.length || 0,
      note: teamBaseline
        ? `${activeTeam} · MM3 ${formatRatio(teamBaseline.currentTeamAverage)}`
        : activeTeam || "Sem equipe selecionada",
    },
    {
      label: "Baseline atleta",
      value: athleteBaseline ? formatRatio(athleteBaseline.currentMovingAverage) : "Sem base",
      note: athleteBaseline
        ? `${athleteBaseline.ownBand} · P ${formatPercentile(athleteBaseline.ownPercentile)}`
        : "Selecione um atleta para leitura pessoal",
    },
    {
      label: "Baseline equipe",
      value: teamBaseline ? formatPercentile(teamBaseline.teamHistoryPercentile) : "Sem base",
      note: teamBaseline
        ? `${teamBaseline.teamHistoryBand} · clube ${formatPercentile(teamBaseline.clubPercentile)}`
        : `Faixa global ${formatRatio(globalSummary.p25)} a ${formatRatio(globalSummary.p75)}`,
    },
  ];

  elements.stats.innerHTML = cards
    .map(
      (card) => `
        <article>
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function populateCategorySelects() {
  elements.categoryFilter.innerHTML =
    '<option value="">Todas</option>' +
    state.categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  elements.categoryFilter.value = state.filters.category;

  elements.teamSelect.innerHTML = state.categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
  elements.calendarTeamSelect.innerHTML = state.categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
  if (state.selectedTeam) {
    elements.teamSelect.value = state.selectedTeam;
    elements.calendarTeamSelect.value = state.selectedTeam;
  }

  elements.staffModalityFilter.innerHTML =
    '<option value="all">Todas</option>' +
    MODALITY_DEFS.map(
      (item) => `<option value="${item.id}">${item.label}</option>`
    ).join("");
  elements.staffModalityFilter.value = state.staffModality;
  elements.staffPeriodFilter.value = state.staffPeriod;
}

function renderExportButtons() {
  if (!DEPLOYMENT.reportsEnabled) {
    elements.exportMenu?.classList.add("hidden");
    elements.exportButtons.innerHTML = "";
    return;
  }

  elements.exportMenu?.classList.remove("hidden");
  elements.exportButtons.innerHTML = `
    <div class="export-menu__group export-menu__group--weekly">
      <strong>Pacote semanal</strong>
      <button class="export-menu__button export-menu__button--weekly" type="button" data-weekly-report>
        Gerar relatório semanal
      </button>
    </div>
  ` + MODALITY_DEFS.map(
    (item) => {
      const teams = getTeamsByModality(item.id);
      return `
        <div class="export-menu__group">
          <strong>${item.label}</strong>
          <button class="export-menu__button" type="button" data-modality="${item.id}">
            Todas equipes
          </button>
          <div class="export-menu__teams">
            ${teams
              .map(
                (teamName) => `
                  <button class="export-menu__button export-menu__button--team" type="button" data-modality="${item.id}" data-team="${teamName}">
                    ${teamName}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      `;
    }
  ).join("");

  elements.exportButtons.querySelector("[data-weekly-report]")?.addEventListener("click", exportWeeklyReportKit);

  elements.exportButtons.querySelectorAll("[data-modality]").forEach((button) => {
    button.addEventListener("click", async () => {
      const modalityId = button.dataset.modality;
      await exportModalityPdf(modalityId, button.dataset.team || "");
    });
  });
}

function setExportButtonsBusy(isBusy) {
  elements.exportButtons.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
}

function buildMetricCheckboxes(container, selectedKeys, name) {
  container.innerHTML = METRICS.map(
    (metric) => `
      <label class="check-item">
        <input type="checkbox" name="${name}" value="${metric.key}" ${
          selectedKeys.includes(metric.key) ? "checked" : ""
        } />
        <span>${metric.label}</span>
      </label>
    `
  ).join("");
}

function renderControls() {
  elements.timelinePeriod.value = state.controls.timeline.period;
  elements.profilePeriod.value = state.controls.profile.period;
  elements.distributionPeriod.value = state.controls.distribution.period;
  elements.samplePeriod.value = state.controls.sample.period;
  elements.sampleMetric.innerHTML = METRICS.map(
    (metric) =>
      `<option value="${metric.key}" ${
        metric.key === state.controls.sample.metric ? "selected" : ""
      }>${metric.label}</option>`
  ).join("");

  buildMetricCheckboxes(elements.timelineMetrics, state.controls.timeline.metrics, "timeline-metric");
  buildMetricCheckboxes(elements.profileMetrics, state.controls.profile.metrics, "profile-metric");
  buildMetricCheckboxes(
    elements.distributionMetrics,
    state.controls.distribution.metrics,
    "distribution-metric"
  );
}

function setModeButtonState() {
  elements.athleteModeButton.classList.toggle("is-active", state.viewMode === "athlete");
  elements.teamModeButton.classList.toggle("is-active", state.viewMode === "team");
  elements.athleteModeButton.setAttribute("aria-selected", String(state.viewMode === "athlete"));
  elements.teamModeButton.setAttribute("aria-selected", String(state.viewMode === "team"));
}

function destroyCharts() {
  Object.values(state.charts).forEach((chart) => {
    if (chart) {
      chart.destroy();
    }
  });

  Object.keys(state.charts).forEach((key) => {
    state.charts[key] = null;
  });
}

function createTimelineChartForAthlete(athlete) {
  const metricKeys = state.controls.timeline.metrics;
  const entries = filterEntriesByPeriod(athlete.entries, state.controls.timeline.period)
    .slice()
    .reverse();

  state.charts.timeline = new Chart(elements.timelineCanvas, {
    type: "line",
    data: {
      labels: entries.map((entry) => entry.timestampDisplay || entry.reportedDate || "Sem data"),
      datasets: metricKeys.map((metricKey) => {
        const metric = getMetricByKey(metricKey);
        return {
          label: metric.label,
          data: entries.map((entry) => getMetricDisplayValue(entry, metricKey)),
          borderColor: metric.color,
          backgroundColor: `${metric.color}33`,
          tension: 0.35,
          spanGaps: true,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
        };
      }),
    },
    options: buildLineOptions(metricKeys),
  });
}

function createTimelineChartForTeam(teamName) {
  const metricKeys = state.controls.timeline.metrics;
  const grouped = new Map();
  getAthletesByTeam(teamName).forEach((athlete) => {
    filterEntriesByPeriod(athlete.entries, state.controls.timeline.period).forEach((entry) => {
      const key = entry.reportedDate || entry.timestampDisplay;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(entry);
    });
  });

  const labels = Array.from(grouped.keys()).sort((left, right) => {
    const [ld, lm, ly] = left.split("/");
    const [rd, rm, ry] = right.split("/");
    return Date.parse(`${ly}-${lm}-${ld}`) - Date.parse(`${ry}-${rm}-${rd}`);
  });

  state.charts.timeline = new Chart(elements.timelineCanvas, {
    type: "line",
    data: {
      labels,
      datasets: metricKeys.map((metricKey) => {
        const metric = getMetricByKey(metricKey);
        return {
          label: metric.label,
          data: labels.map((label) =>
            average((grouped.get(label) || []).map((entry) => getMetricDisplayValue(entry, metricKey)))
          ),
          borderColor: metric.color,
          backgroundColor: `${metric.color}33`,
          tension: 0.35,
          spanGaps: true,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
        };
      }),
    },
    options: buildLineOptions(metricKeys),
  });
}

function buildLineOptions(metricKeys = []) {
  const range = getLineChartRange(metricKeys);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#4b5878",
          usePointStyle: true,
          padding: 18,
        },
      },
    },
    scales: {
      y: {
        min: range.min,
        max: range.max,
        ticks: {
          color: "#5f6b88",
          stepSize: range.stepSize,
        },
        grid: {
          color: "rgba(23, 29, 73, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "#5f6b88",
        },
        grid: {
          display: false,
        },
      },
    },
  };
}

function normalizeForRadar(metricKey, value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (metricKey === "painLevel") {
    return value / 2;
  }
  if (metricKey === "loadScore") {
    return value;
  }
  return value;
}

function createProfileChartForAthlete(athlete, teamName) {
  const metrics = state.controls.profile.metrics;

  state.charts.profile = new Chart(elements.profileCanvas, {
    type: "radar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: athlete.name,
          data: metrics.map((metricKey) =>
            normalizeForRadar(metricKey, aggregateAthlete(athlete, metricKey, state.controls.profile.period))
          ),
          borderColor: "#df3046",
          backgroundColor: "rgba(223, 48, 70, 0.18)",
          pointBackgroundColor: "#df3046",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: `Média ${teamName}`,
          data: metrics.map((metricKey) =>
            normalizeForRadar(metricKey, getTeamAggregate(teamName, metricKey, state.controls.profile.period))
          ),
          borderColor: "#4246a6",
          backgroundColor: "rgba(66, 70, 166, 0.14)",
          pointBackgroundColor: "#4246a6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    },
    options: buildRadarOptions(),
  });
}

function createProfileChartForTeam(teamName) {
  const metrics = state.controls.profile.metrics;

  state.charts.profile = new Chart(elements.profileCanvas, {
    type: "radar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: teamName,
          data: metrics.map((metricKey) =>
            normalizeForRadar(metricKey, getTeamAggregate(teamName, metricKey, state.controls.profile.period))
          ),
          borderColor: "#df3046",
          backgroundColor: "rgba(223, 48, 70, 0.18)",
          pointBackgroundColor: "#df3046",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
        {
          label: "Média geral",
          data: metrics.map((metricKey) =>
            normalizeForRadar(metricKey, average(state.athletes.map((athlete) => aggregateAthlete(athlete, metricKey, state.controls.profile.period))))
          ),
          borderColor: "#4246a6",
          backgroundColor: "rgba(66, 70, 166, 0.14)",
          pointBackgroundColor: "#4246a6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    },
    options: buildRadarOptions(),
  });
}

function buildRadarOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#4b5878",
          usePointStyle: true,
          padding: 18,
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          backdropColor: "#ffffff",
          color: "#5f6b88",
        },
        grid: {
          color: "rgba(23, 29, 73, 0.13)",
        },
        angleLines: {
          color: "rgba(23, 29, 73, 0.11)",
        },
        pointLabels: {
          color: "#3d4968",
          font: {
            size: 12,
            family: "IBM Plex Sans",
            weight: "600",
          },
        },
      },
    },
  };
}

function createDistributionChartForAthlete(athlete, teamName) {
  const metrics = state.controls.distribution.metrics;
  const period = state.controls.distribution.period;

  state.charts.distribution = new Chart(elements.distributionCanvas, {
    type: "bar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: "Percentil na equipe",
          data: metrics.map((metricKey) =>
            percentile(
              getTeamDistribution(teamName, metricKey, period),
              aggregateAthlete(athlete, metricKey, period)
            )
          ),
          backgroundColor: "rgba(66, 70, 166, 0.92)",
          borderRadius: 999,
          borderSkipped: false,
        },
        {
          label: "Percentil na base",
          data: metrics.map((metricKey) =>
            percentile(
              getBaseDistribution(metricKey, period),
              aggregateAthlete(athlete, metricKey, period)
            )
          ),
          backgroundColor: "rgba(223, 48, 70, 0.88)",
          borderRadius: 999,
          borderSkipped: false,
        },
      ],
    },
    options: buildPercentileOptions(),
  });
}

function createDistributionChartForTeam(teamName) {
  const metrics = state.controls.distribution.metrics;
  const period = state.controls.distribution.period;

  state.charts.distribution = new Chart(elements.distributionCanvas, {
    type: "bar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: "Percentil entre equipes",
          data: metrics.map((metricKey) =>
            percentile(
              getAllTeamsAggregate(metricKey, period),
              getTeamAggregate(teamName, metricKey, period)
            )
          ),
          backgroundColor: "rgba(66, 70, 166, 0.92)",
          borderRadius: 999,
          borderSkipped: false,
          xAxisID: "x",
        },
        {
          label: "Dispersão interna",
          data: metrics.map((metricKey) => {
            const summary = buildDistributionSummary(getTeamDistribution(teamName, metricKey, period));
            if (summary.p25 === null || summary.p75 === null) {
              return null;
            }
            return roundNumber(summary.p75 - summary.p25, 1);
          }),
          backgroundColor: "rgba(71, 119, 201, 0.88)",
          borderRadius: 999,
          borderSkipped: false,
          xAxisID: "x1",
        },
      ],
    },
    options: {
      ...buildPercentileOptions(),
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          min: 0,
          max: 100,
          ticks: {
            color: "#5f6b88",
            callback(value) {
              return `${value}%`;
            },
          },
          grid: {
            color: "rgba(23, 29, 73, 0.1)",
          },
        },
        x1: {
          type: "linear",
          position: "top",
          min: 0,
          max: 5,
          ticks: {
            color: "#5f6b88",
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#5f6b88",
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

function buildPercentileOptions() {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#4b5878",
          usePointStyle: true,
          padding: 18,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          color: "#5f6b88",
          callback(value) {
            return `${value}%`;
          },
        },
        grid: {
          color: "rgba(23, 29, 73, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "#5f6b88",
        },
        grid: {
          display: false,
        },
      },
    },
  };
}

function createSampleChart(values, metricKey) {
  const metric = getMetricByKey(metricKey);
  const histogram = buildHistogram(values, metricKey);

  state.charts.sample = new Chart(elements.sampleCanvas, {
    type: "bar",
    data: {
      labels: histogram.labels,
      datasets: [
        {
          label: "Frequência",
          data: histogram.counts,
          backgroundColor: `${metric.color}cc`,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#5f6b88",
          },
          title: {
            display: true,
            text: metric.label,
            color: "#4b5878",
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: "#5f6b88",
            precision: 0,
          },
          title: {
            display: true,
            text: "Frequência",
            color: "#4b5878",
          },
          grid: {
            color: "rgba(23, 29, 73, 0.1)",
          },
        },
      },
    },
  });
}

function renderDistributionReport(values, metricKey, scopeLabel) {
  const fit = evaluateDistributionFits(values);
  const metric = getMetricByKey(metricKey);

  if (!fit.bestFit) {
    elements.distributionReport.innerHTML =
      '<div class="distribution-report__empty">Amostra insuficiente para classificar a distribuição.</div>';
    return;
  }

  const validValues = values.filter((value) => Number.isFinite(value));
  const summary = buildDistributionSummary(validValues);
  const mean = roundNumber(average(validValues), 2);
  const sd = roundNumber(standardDeviation(validValues), 2);

  elements.distributionReport.innerHTML = `
    <div class="distribution-report__summary">
      <p class="distribution-report__eyebrow">Leitura estatística indicativa</p>
      <h4>${scopeLabel} · ${metric.label}</h4>
      <p>
        Melhor aderência: <strong>${fit.bestFit.name}</strong> · KS
        <strong>${fit.bestFit.statistic}</strong> · ajuste
        <strong>${fit.bestFit.strength}</strong>.
      </p>
    </div>
    <div class="distribution-report__grid">
      <article>
        <span>Amostra</span>
        <strong>${fit.sampleSize}</strong>
        <small>observações válidas</small>
      </article>
      <article>
        <span>Média e desvio</span>
        <strong>${roundNumber(mean, 1)} · ${roundNumber(sd, 1)}</strong>
        <small>tendência central e dispersão</small>
      </article>
      <article>
        <span>Assimetria e curtose</span>
        <strong>${fit.skewness} · ${fit.kurtosis}</strong>
        <small>forma da amostra</small>
      </article>
      <article>
        <span>Faixa central</span>
        <strong>${formatRatio(summary.p25, metric.max)} a ${formatRatio(summary.p75, metric.max)}</strong>
        <small>intervalo P25-P75</small>
      </article>
    </div>
    <div class="distribution-report__fits">
      ${fit.candidates
        .map(
          (candidate) => `
            <div class="distribution-fit">
              <strong>${candidate.name}</strong>
              <span>KS ${candidate.statistic}</span>
              <small>${candidate.details}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderHighlightsForAthleteLegacy(athlete, teamName) {
  const period = state.controls.distribution.period;
  const loadBaseline = buildAthleteLoadBaseline(athlete);
  const teamLoadPercentile = percentile(
    getTeamDistribution(teamName, "loadScore", period),
    aggregateAthlete(athlete, "loadScore", period)
  );
  const baseLoadPercentile = percentile(
    getBaseDistribution("loadScore", period),
    aggregateAthlete(athlete, "loadScore", period)
  );

  const cards = [
    {
      label: "Carga MM3",
      value: formatRatio(loadBaseline.currentMovingAverage),
      note: `${loadBaseline.ownBand} · percentil pessoal ${formatPercentile(loadBaseline.ownPercentile)}`,
    },
    {
      label: "Recuperação",
      value: formatRatio(aggregateAthlete(athlete, "recoveryScore", period)),
      note: `Último ${formatRatio(athlete.latest.recoveryScore)}`,
    },
    {
      label: "Percentil equipe",
      value: formatPercentile(teamLoadPercentile),
      note: `${getAthletesByTeam(teamName).length} atletas na equipe`,
    },
    {
      label: "Percentil base",
      value: formatPercentile(baseLoadPercentile),
      note: athlete.modalityLabel,
    },
  ];

  elements.detailHighlights.innerHTML = cards
    .map(
      (card) => `
        <article class="highlight">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function renderHighlightsForAthlete(athlete, teamName) {
  const period = state.controls.distribution.period;
  const loadBaseline = buildAthleteLoadBaseline(athlete);
  const teamLoadPercentile = percentile(
    getTeamDistribution(teamName, "loadScore", period),
    aggregateAthlete(athlete, "loadScore", period)
  );
  const baseLoadPercentile = percentile(
    getBaseDistribution("loadScore", period),
    aggregateAthlete(athlete, "loadScore", period)
  );

  const cards = [
    {
      label: "Carga MM3",
      value: formatRatio(loadBaseline.currentMovingAverage),
      note: `${loadBaseline.ownBand} · percentil pessoal ${formatPercentile(loadBaseline.ownPercentile)}`,
    },
    {
      label: "Leitura na equipe",
      value: formatPercentile(loadBaseline.teamPercentile),
      note: `${loadBaseline.teamBand} na distribuicao atual da equipe`,
    },
    {
      label: "Percentil equipe",
      value: formatPercentile(teamLoadPercentile),
      note: `${getAthletesByTeam(teamName).length} atletas · baseline ${loadBaseline.baselineCount} janelas`,
    },
    {
      label: "Percentil base",
      value: formatPercentile(baseLoadPercentile),
      note: athlete.modalityLabel,
    },
  ];

  elements.detailHighlights.innerHTML = cards
    .map(
      (card) => `
        <article class="highlight">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function renderHighlightsForTeamLegacy(teamName) {
  const period = state.controls.distribution.period;
  const teamLoadValues = getTeamDistribution(teamName, "loadScore", period);
  const teamRecoveryValues = getTeamDistribution(teamName, "recoveryScore", period);
  const teamSummary = buildDistributionSummary(teamLoadValues);
  const teamMedianPercentile = percentile(
    getAllTeamsAggregate("loadScore", period),
    getTeamAggregate(teamName, "loadScore", period)
  );

  const cards = [
    {
      label: "Mediana da equipe",
      value: formatRatio(teamSummary.median),
      note: `Faixa ${formatRatio(teamSummary.p25)} a ${formatRatio(teamSummary.p75)}`,
    },
    {
      label: "Recuperação média",
      value: formatRatio(average(teamRecoveryValues)),
      note: `${teamRecoveryValues.length} atletas válidos`,
    },
    {
      label: "Percentil entre equipes",
      value: formatPercentile(teamMedianPercentile),
      note: "Comparativo por carga",
    },
    {
      label: "Treinos marcados",
      value: `${getTrainingDatesForTeam(teamName).filter((item) => item.checked).length}`,
      note: "Dias com treino confirmado",
    },
  ];

  elements.detailHighlights.innerHTML = cards
    .map(
      (card) => `
        <article class="highlight">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function renderHighlightsForTeam(teamName) {
  const period = state.controls.distribution.period;
  const teamLoadValues = getTeamDistribution(teamName, "loadScore", period);
  const teamRecoveryValues = getTeamDistribution(teamName, "recoveryScore", period);
  const teamSummary = buildDistributionSummary(teamLoadValues);
  const teamMedianPercentile = percentile(
    getAllTeamsAggregate("loadScore", period),
    getTeamAggregate(teamName, "loadScore", period)
  );
  const loadBaseline = buildTeamLoadBaseline(teamName);

  const cards = [
    {
      label: "Carga MM3 equipe",
      value: formatRatio(loadBaseline.currentTeamAverage),
      note: `${loadBaseline.teamHistoryBand} · percentil historico ${formatPercentile(loadBaseline.teamHistoryPercentile)}`,
    },
    {
      label: "Recuperacao media",
      value: formatRatio(average(teamRecoveryValues)),
      note: `${teamRecoveryValues.length} atletas validos`,
    },
    {
      label: "Percentil entre equipes",
      value: formatPercentile(loadBaseline.clubPercentile),
      note: `${loadBaseline.clubBand} no comparativo atual entre equipes`,
    },
    {
      label: "Faixa central",
      value: formatRatio(teamSummary.median),
      note: `P25-P75 ${formatRatio(teamSummary.p25)} a ${formatRatio(teamSummary.p75)}`,
    },
  ];

  elements.detailHighlights.innerHTML = cards
    .map(
      (card) => `
        <article class="highlight">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function getTrainingDatesForTeam(teamName) {
  const athletes = getAthletesByTeam(teamName);
  const dateMap = new Map();

  athletes.forEach((athlete) => {
    athlete.entries.forEach((entry) => {
      const dateLabel = formatEntryDate(entry);
      if (!dateMap.has(dateLabel)) {
        dateMap.set(dateLabel, new Set());
      }
      dateMap.get(dateLabel).add(athlete.name);
    });
  });

  return Array.from(dateMap.entries())
    .map(([dateLabel, responders]) => {
      const [ld = "01", lm = "01", ly = "2000"] = dateLabel.split("/");
      const dateObject = new Date(`${ly}-${lm}-${ld}T12:00:00`);
      const missing = athletes
        .map((athlete) => athlete.name)
        .filter((name) => !responders.has(name))
        .sort((left, right) => left.localeCompare(right, "pt-BR"));

      return {
        dateLabel,
        isoDate: `${ly}-${lm.padStart(2, "0")}-${ld.padStart(2, "0")}`,
        monthKey: `${ly}-${lm}`,
        monthLabel: new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
        }).format(dateObject),
        shortDay: ld,
        responded: responders.size,
        total: athletes.length,
        missing,
        checked: isTrainingChecked(teamName, dateLabel),
      };
    })
    .sort((left, right) => {
      const [ld, lm, ly] = left.dateLabel.split("/");
      const [rd, rm, ry] = right.dateLabel.split("/");
      return Date.parse(`${ry}-${rm}-${rd}`) - Date.parse(`${ly}-${lm}-${ld}`);
    });
}

function buildTrainingStatus(day) {
  if (!day.checked) {
    return "off";
  }
  if (!day.missing.length) {
    return "full";
  }
  if (day.responded / Math.max(1, day.total) >= 0.7) {
    return "partial";
  }
  return "low";
}

function renderTrainingDetailLegacy(teamName, day) {
  if (!day || !day.checked) {
    elements.trainingDetail.classList.add("hidden");
    elements.trainingDetail.innerHTML = "";
    return;
  }

  elements.trainingDetail.classList.remove("hidden");
  elements.trainingDetail.innerHTML = `
    <div class="training-detail__head">
      <div>
        <p class="chart-card__eyebrow">Detalhe do treino</p>
        <h4>${day.dateLabel}</h4>
      </div>
      <span>${day.responded}/${day.total} responderam</span>
    </div>
    ${
      day.missing.length
        ? `
      <div class="training-detail__section">
        <span class="training-day__missing-label">Não responderam</span>
        <div class="training-day__chips">
          ${day.missing.map((name) => `<span class="training-chip">${name}</span>`).join("")}
        </div>
      </div>
    `
        : `
      <div class="training-ok">Todos responderam nesse treino.</div>
    `
    }
  `;
}

function renderTrainingDetail(teamName, day) {
  if (!day) {
    elements.trainingDetail.classList.add("hidden");
    elements.trainingDetail.innerHTML = "";
    return;
  }

  elements.trainingDetail.classList.remove("hidden");
  elements.trainingDetail.innerHTML = `
    <div class="training-detail__head">
      <div>
        <p class="chart-card__eyebrow">Detalhe do dia</p>
        <h4>${day.dateLabel}</h4>
      </div>
      <span>${day.responded}/${day.total} responderam</span>
    </div>
    <div class="training-ok">${day.checked ? "Treino marcado" : "Treino ainda não marcado"}</div>
    ${
      day.missing.length
        ? `
      <div class="training-detail__section">
        <span class="training-day__missing-label">Não responderam</span>
        <div class="training-day__chips">
          ${day.missing.map((name) => `<span class="training-chip">${name}</span>`).join("")}
        </div>
      </div>
    `
        : `
      <div class="training-ok">Todos responderam nesse dia.</div>
    `
    }
  `;
}

function buildTrainingCalendarEvents(teamName) {
  return getTrainingDatesForTeam(teamName).map((day) => {
    const status = buildTrainingStatus(day);
    const palette = {
      off: { backgroundColor: "#2a376d", borderColor: "#42529c", textColor: "#d9e2ff" },
      full: { backgroundColor: "#193f38", borderColor: "#2cb68a", textColor: "#ecfff7" },
      partial: { backgroundColor: "#54411d", borderColor: "#ffb24d", textColor: "#fff4df" },
      low: { backgroundColor: "#5d2330", borderColor: "#ff6d7f", textColor: "#fff0f2" },
    }[status];

    return {
      id: day.dateLabel,
      title: day.checked ? `${day.responded}/${day.total}` : `${day.responded} resp.`,
      start: day.isoDate,
      allDay: true,
      backgroundColor: palette.backgroundColor,
      borderColor: palette.borderColor,
      textColor: palette.textColor,
      extendedProps: { day },
    };
  });
}

function renderTrainingCalendarWorkspace(teamName) {
  if (!teamName || !elements.trainingCalendarView || !window.FullCalendar?.Calendar) {
    return;
  }

  const days = getTrainingDatesForTeam(teamName);
  const latestDay = days[0] || null;
  const initialDate = latestDay?.isoDate || new Date().toISOString().slice(0, 10);

  if (state.trainingCalendar) {
    state.trainingCalendar.destroy();
    state.trainingCalendar = null;
  }

  state.trainingCalendar = new FullCalendar.Calendar(elements.trainingCalendarView, {
    initialView: "dayGridMonth",
    initialDate,
    locale: "pt-br",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    buttonText: {
      today: "Hoje",
    },
    events: buildTrainingCalendarEvents(teamName),
    eventClick(info) {
      state.selectedTrainingDate = info.event.id;
      const selectedDay = info.event.extendedProps.day;
      renderTrainingDetail(teamName, selectedDay);
    },
    eventContent(arg) {
      const day = arg.event.extendedProps.day;
      const wrapper = document.createElement("div");
      wrapper.className = "fc-training-event";
      wrapper.innerHTML = `
        <strong>${day.shortDay}</strong>
        <span>${arg.event.title}</span>
      `;
      return { domNodes: [wrapper] };
    },
  });

  state.trainingCalendar.render();

  const selectedDay = days.find((day) => day.dateLabel === state.selectedTrainingDate) || latestDay;

  if (!selectedDay) {
    elements.trainingDetail.classList.add("hidden");
    elements.trainingDetail.innerHTML = "";
    return;
  }

  renderTrainingDetail(teamName, selectedDay);

  const controls = document.createElement("div");
  controls.className = "training-detail__actions";
  controls.innerHTML = `
    <button class="training-detail__button" type="button">
      ${selectedDay.checked ? "Desmarcar treino" : "Marcar treino"}
    </button>
  `;
  controls.querySelector("button").addEventListener("click", () => {
    setTrainingChecked(teamName, selectedDay.dateLabel, !selectedDay.checked);
    renderStats();
    renderTrainingCalendarWorkspace(teamName);
  });
  elements.trainingDetail.append(controls);
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function getPhysioModalityLabel(modalityId) {
  return (
    state.physiotherapy.modalities.find((modality) => modality.id === modalityId)?.label ||
    modalityId ||
    "Sem modalidade"
  );
}

function getPhysioVetoLevel(value) {
  const key = normalizeSearchValue(value);
  if (!key || key === "NAO" || key === "SEM VETO") return "none";
  if (key.includes("PARCIAL")) return "partial";
  if (key.includes("COMPLETO") || key.includes("TOTAL") || key === "SIM" || key.includes("VETADO")) {
    return "full";
  }
  return "none";
}

function getFilteredPhysiotherapyItems() {
  const filters = state.physiotherapy.filters;
  const searchKey = normalizeSearchValue(filters.search);

  return state.physiotherapy.items.filter((item) => {
    if (filters.modality && item.modalityId !== filters.modality) return false;
    if (filters.team && item.teamName !== filters.team) return false;
    if (filters.severity && normalizeSearchValue(item.severity || item.semaphore) !== filters.severity) {
      return false;
    }
    if (!searchKey) return true;

    return normalizeSearchValue(
      [
        item.athleteName,
        item.teamName,
        item.injury,
        item.conduct,
        item.observations,
        item.phase,
      ].join(" ")
    ).includes(searchKey);
  });
}

function summarizePhysiotherapyItems(items) {
  return items.reduce(
    (summary, item) => {
      const section = normalizeSearchValue(item.section);
      const severity = normalizeSearchValue(item.severity || item.semaphore);
      const trainingVeto = getPhysioVetoLevel(item.trainingVeto);
      const pfVeto = getPhysioVetoLevel(item.pfVeto);
      if (section.includes("EM TRATAMENTO")) summary.inTreatment += 1;
      if (section.includes("ATENDIMENTO IMEDIATO")) summary.immediate += 1;
      if (severity === "VERMELHO") summary.red += 1;
      if (severity === "AMARELO") summary.yellow += 1;
      if (trainingVeto === "full" || pfVeto === "full") summary.fullVeto += 1;
      else if (trainingVeto === "partial" || pfVeto === "partial") summary.partialVeto += 1;
      return summary;
    },
    { inTreatment: 0, immediate: 0, red: 0, yellow: 0, fullVeto: 0, partialVeto: 0 }
  );
}

function populatePhysiotherapyFilters() {
  const selectedModality = state.physiotherapy.filters.modality;
  elements.physiotherapyModality.innerHTML = [
    '<option value="">Todas</option>',
    ...state.physiotherapy.modalities.map(
      (modality) =>
        `<option value="${escapeHtml(modality.id)}">${escapeHtml(modality.label)}</option>`
    ),
  ].join("");
  elements.physiotherapyModality.value = selectedModality;

  const teams = Array.from(
    new Set(
      state.physiotherapy.items
        .filter((item) => !selectedModality || item.modalityId === selectedModality)
        .map((item) => item.teamName)
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));

  if (state.physiotherapy.filters.team && !teams.includes(state.physiotherapy.filters.team)) {
    state.physiotherapy.filters.team = "";
  }
  elements.physiotherapyTeam.innerHTML = [
    '<option value="">Todas</option>',
    ...teams.map((team) => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`),
  ].join("");
  elements.physiotherapyTeam.value = state.physiotherapy.filters.team;
}

function renderPhysiotherapyStats(items) {
  const summary = summarizePhysiotherapyItems(items);
  const cards = [
    { label: "Em tratamento", value: summary.inTreatment, note: "Casos ativos", tone: "blue" },
    { label: "Atendimentos", value: summary.immediate, note: "Imediatos da semana", tone: "purple" },
    { label: "Prioridade", value: summary.red, note: "Semáforo vermelho", tone: "red" },
    { label: "Atenção", value: summary.yellow, note: "Semáforo amarelo", tone: "yellow" },
    { label: "Veto completo", value: summary.fullVeto, note: "Treino ou PF", tone: "red" },
    { label: "Veto parcial", value: summary.partialVeto, note: "Treino ou PF", tone: "yellow" },
  ];

  elements.physiotherapyStats.innerHTML = cards
    .map(
      (card) => `
        <article class="physio-stat physio-stat--${card.tone}">
          <p>${card.label}</p>
          <strong>${card.value}</strong>
          <span>${card.note}</span>
        </article>
      `
    )
    .join("");
}

function renderPhysiotherapyCard(item) {
  const severity = normalizeSearchValue(item.severity || item.semaphore) || "NEUTRO";
  const severityTone = severity === "VERMELHO" ? "red" : severity === "AMARELO" ? "yellow" : severity === "VERDE" ? "green" : "neutral";
  const detailItems = [
    ["Fase", item.phase],
    ["Dor", item.painScale ? `${item.painScale}/10` : ""],
    ["Veto treino", item.trainingVeto],
    ["Veto PF", item.pfVeto],
  ].filter(([, value]) => value);

  return `
    <article class="physio-card physio-card--${severityTone}">
      <header class="physio-card__head">
        <div>
          <span class="physio-card__context">${escapeHtml(getPhysioModalityLabel(item.modalityId))} · ${escapeHtml(item.teamName)}</span>
          <h4>${escapeHtml(item.athleteName)}</h4>
        </div>
        <div class="physio-card__badges">
          <span class="physio-badge physio-badge--section">${escapeHtml(item.section || "Registro")}</span>
          <span class="physio-badge physio-badge--${severityTone}">${escapeHtml(severity === "NEUTRO" ? "Sem semáforo" : severity)}</span>
        </div>
      </header>
      <div class="physio-card__injury">
        <span>Lesão ou demanda</span>
        <strong>${escapeHtml(item.injury || item.demand || "Não informada")}</strong>
      </div>
      ${
        detailItems.length
          ? `<dl class="physio-card__details">${detailItems
              .map(
                ([label, value]) =>
                  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
              )
              .join("")}</dl>`
          : ""
      }
      ${item.conduct ? `<p class="physio-card__conduct"><b>Conduta:</b> ${escapeHtml(item.conduct)}</p>` : ""}
      ${item.observations ? `<p class="physio-card__observations"><b>Observações:</b> ${escapeHtml(item.observations)}</p>` : ""}
    </article>
  `;
}

function renderPhysiotherapy() {
  const physio = state.physiotherapy;
  elements.physiotherapyRefresh.disabled = physio.loading;
  elements.physiotherapyRefresh.textContent = physio.loading ? "Atualizando..." : "Atualizar fisioterapia";
  elements.physiotherapyUpdatedAt.textContent = physio.updatedAtLabel || "Ainda não consultado";

  if (physio.loading && !physio.loaded) {
    elements.physiotherapyState.textContent = "Carregando registros da fisioterapia...";
    elements.physiotherapyState.className = "physio-state";
    elements.physiotherapyList.innerHTML = "";
    elements.physiotherapyStats.innerHTML = "";
    elements.physiotherapyResultsCount.textContent = "Consultando as modalidades...";
    return;
  }

  if (physio.error) {
    elements.physiotherapyState.textContent = physio.error;
    elements.physiotherapyState.className = "physio-state physio-state--error";
  } else {
    elements.physiotherapyState.className = "physio-state hidden";
    elements.physiotherapyState.textContent = "";
  }

  const items = getFilteredPhysiotherapyItems();
  renderPhysiotherapyStats(items);
  elements.physiotherapyResultsCount.textContent = `${items.length} registro${items.length === 1 ? "" : "s"} exibido${items.length === 1 ? "" : "s"}`;
  elements.physiotherapyList.innerHTML = items.map(renderPhysiotherapyCard).join("");

  if (!items.length && !physio.error) {
    elements.physiotherapyState.textContent = "Nenhum registro encontrado com os filtros atuais.";
    elements.physiotherapyState.className = "physio-state";
  }
}

async function loadPhysiotherapy(force = false) {
  if (state.physiotherapy.loading) {
    return;
  }
  if (state.physiotherapy.loaded && !force) {
    renderPhysiotherapy();
    return;
  }

  state.physiotherapy.loading = true;
  state.physiotherapy.error = "";
  renderPhysiotherapy();

  try {
    const response = await fetch(DEPLOYMENT.physiotherapyUrl, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.details || payload.message || "Erro ao carregar a fisioterapia.");
    }

    state.physiotherapy.items = payload.items || [];
    state.physiotherapy.modalities = payload.modalities || [];
    state.physiotherapy.updatedAtLabel = payload.updatedAtLabel || "Consulta concluída";
    state.physiotherapy.loaded = true;
    populatePhysiotherapyFilters();
  } catch (error) {
    state.physiotherapy.error = error.message;
  } finally {
    state.physiotherapy.loading = false;
    renderPhysiotherapy();
  }
}

function renderActiveWorkspace() {
  const isCalendar = state.activeSection === "calendar";
  const isPhysiotherapy = state.activeSection === "physiotherapy";
  elements.panelWorkspace.classList.toggle("hidden", isCalendar || isPhysiotherapy);
  elements.calendarWorkspace.classList.toggle("hidden", !isCalendar);
  elements.physiotherapyWorkspace.classList.toggle("hidden", !isPhysiotherapy);
  elements.stats.classList.toggle("hidden", isPhysiotherapy);
  elements.topbarActions.classList.toggle("hidden", isPhysiotherapy);
  elements.topbarEyebrow.textContent = isPhysiotherapy ? "Núcleo de saúde" : "Centro de análise";
  elements.topbarTitle.textContent = isPhysiotherapy ? "Fisioterapia" : "Atletas e equipes";

  if (isCalendar) {
    elements.calendarTeamSelect.value = getActiveTeam();
    renderTrainingCalendarWorkspace(getActiveTeam());
  } else if (state.trainingCalendar) {
    state.trainingCalendar.destroy();
    state.trainingCalendar = null;
  }

  if (isPhysiotherapy) {
    loadPhysiotherapy();
  }
}

function renderTrainingPanel(teamName) {
  elements.trainingPanel.classList.add("hidden");
  elements.trainingList.innerHTML = "";
  if (!teamName || state.activeSection !== "calendar") {
    elements.trainingPanel.classList.add("hidden");
    elements.trainingList.innerHTML = "";
    return;
  }

  const days = getTrainingDatesForTeam(teamName);

  if (!days.length) {
    elements.trainingList.innerHTML = '<div class="training-empty">Sem datas disponíveis.</div>';
    elements.trainingDetail.innerHTML = "";
    elements.trainingDetail.classList.add("hidden");
    return;
  }

  if (
    state.selectedTrainingDate &&
    !days.some((day) => day.dateLabel === state.selectedTrainingDate)
  ) {
    state.selectedTrainingDate = null;
  }

  const months = new Map();
  days.forEach((day) => {
    if (!months.has(day.monthKey)) {
      months.set(day.monthKey, {
        label: day.monthLabel,
        days: [],
      });
    }
    months.get(day.monthKey).days.push(day);
  });

  elements.trainingList.innerHTML = Array.from(months.values())
    .map(
      (month) => `
        <section class="training-month">
          <div class="training-month__label">${month.label}</div>
          <div class="training-month__grid">
            ${month.days
              .map(
                (day) => `
                  <article
                    class="training-day training-day--${buildTrainingStatus(day)} ${
                      state.selectedTrainingDate === day.dateLabel ? "training-day--selected" : ""
                    }"
                    data-day-card="${day.dateLabel}"
                    title="${day.dateLabel} · ${day.responded}/${day.total} responderam${
                      day.checked ? ` · ${day.missing.length} faltando` : " · sem treino marcado"
                    }"
                  >
                    <label class="training-day__toggle">
                      <input
                        class="training-day__checkbox"
                        type="checkbox"
                        data-training-date="${day.dateLabel}"
                        ${day.checked ? "checked" : ""}
                      />
                      <span>T</span>
                    </label>
                    <strong>${day.shortDay}</strong>
                    <span>${day.responded}/${day.total}</span>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  elements.trainingList.querySelectorAll("[data-training-date]").forEach((input) => {
    input.addEventListener("change", (event) => {
      setTrainingChecked(teamName, event.target.dataset.trainingDate, event.target.checked);
      renderStats();
      renderTrainingPanel(teamName);
    });
  });

  elements.trainingList.querySelectorAll("[data-day-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-training-date]")) {
        return;
      }
      const dateLabel = card.dataset.dayCard;
      state.selectedTrainingDate =
        state.selectedTrainingDate === dateLabel ? null : dateLabel;
      renderTrainingPanel(teamName);
    });
  });

  const selectedDay =
    days.find((day) => day.dateLabel === state.selectedTrainingDate) || null;
  renderTrainingDetail(teamName, selectedDay);
}

function renderPanel() {
  const athlete = getSelectedAthlete();
  const teamName = getActiveTeam();

  if (!athlete && !teamName) {
    elements.detail.classList.add("detail--empty");
    elements.detailPlaceholder.classList.remove("hidden");
    elements.detailContent.classList.add("hidden");
    destroyCharts();
    return;
  }

  elements.detail.classList.remove("detail--empty");
  elements.detailPlaceholder.classList.add("hidden");
  elements.detailContent.classList.remove("hidden");
  setModeButtonState();

  if (state.viewMode === "athlete" && athlete) {
    elements.detailCategory.textContent = athlete.category;
    elements.detailName.textContent = athlete.name;
    elements.detailSubtitle.textContent = `${athlete.totalEntries} check-ins registrados · ${athlete.modalityLabel}`;
    elements.timelineTitle.textContent = "Respostas do atleta ao longo do tempo";
    elements.profileTitle.textContent = "Assinatura média do atleta versus equipe";
    elements.distributionTitle.textContent = "Percentis do atleta por variável";
    elements.sampleTitle.textContent = "Distribuição das respostas do atleta";
    renderHighlightsForAthlete(athlete, athlete.category);
    renderTrainingPanel(athlete.category);
    destroyCharts();
    createTimelineChartForAthlete(athlete);
    createProfileChartForAthlete(athlete, athlete.category);
    createDistributionChartForAthlete(athlete, athlete.category);
    createSampleChart(
      filterEntriesByPeriod(athlete.entries, state.controls.sample.period).map((entry) =>
        getMetricValue(entry, state.controls.sample.metric)
      ),
      state.controls.sample.metric
    );
    renderDistributionReport(
      filterEntriesByPeriod(athlete.entries, state.controls.sample.period).map((entry) =>
        getMetricValue(entry, state.controls.sample.metric)
      ),
      state.controls.sample.metric,
      athlete.name
    );
    return;
  }

  elements.detailCategory.textContent = "Visão de equipe";
  elements.detailName.textContent = teamName;
  elements.detailSubtitle.textContent = `${getAthletesByTeam(teamName).length} atletas monitorados`;
  elements.timelineTitle.textContent = "Evolução média da equipe no tempo";
  elements.profileTitle.textContent = "Padrão médio da equipe versus base";
  elements.distributionTitle.textContent = "Percentis da equipe e dispersão interna";
  elements.sampleTitle.textContent = "Distribuição dos atletas da equipe";
  renderHighlightsForTeam(teamName);
  renderTrainingPanel(teamName);
  destroyCharts();
  createTimelineChartForTeam(teamName);
  createProfileChartForTeam(teamName);
  createDistributionChartForTeam(teamName);
  const sampleValues = getTeamDistribution(
    teamName,
    state.controls.sample.metric,
    state.controls.sample.period
  );
  createSampleChart(sampleValues, state.controls.sample.metric);
  renderDistributionReport(sampleValues, state.controls.sample.metric, teamName);
}

function selectAthlete(athleteId) {
  state.selectedAthleteId = athleteId;
  const athlete = getSelectedAthlete();
  if (athlete) {
    state.selectedTeam = athlete.category;
    elements.teamSelect.value = athlete.category;
  }
  state.activeSection = "panel";
  state.viewMode = "athlete";
  renderStats();
  renderAthletes();
  renderPanel();
  setSidebarActive("athletes");
  renderActiveWorkspace();
  elements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setSidebarActive(target) {
  const mapping = {
    panel: elements.navPanelButton,
    athletes: elements.navAthletesButton,
    teams: elements.navTeamsButton,
    calendar: elements.navCalendarButton,
    physiotherapy: elements.navPhysiotherapyButton,
  };

  Object.entries(mapping).forEach(([key, button]) => {
    if (!button) {
      return;
    }
    button.classList.toggle("sidebar__link--active", key === target);
    if (key === target) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function renderAthletes() {
  const filteredAthletes = filterAthletes();
  elements.athletesGrid.innerHTML = "";
  elements.resultsCount.textContent = `${filteredAthletes.length} atleta${
    filteredAthletes.length === 1 ? "" : "s"
  } exibido${filteredAthletes.length === 1 ? "" : "s"}`;

  if (!filteredAthletes.length) {
    elements.emptyState.classList.remove("hidden");
    return;
  }

  elements.emptyState.classList.add("hidden");

  const fragment = document.createDocumentFragment();
  filteredAthletes.forEach((athlete) => {
    const card = elements.template.content.firstElementChild.cloneNode(true);
    const summary = computeCardSummary(athlete);

    if (athlete.id === state.selectedAthleteId && state.viewMode === "athlete") {
      card.classList.add("card--selected");
    }

    card.querySelector(".card__category").textContent = athlete.category;
    card.querySelector(".card__name").textContent = athlete.name;
    card.querySelector(".card__team-percentile").textContent = formatPercentile(summary.teamPercentile);
    card.querySelector(".card__checkin").textContent = athlete.lastCheckIn || "Sem data";
    card.querySelector(".card__entries").textContent = `${athlete.totalEntries} respostas`;
    card.querySelector(".card__summary").textContent = summary.text;
    card.querySelector(".card__load").textContent = formatRatio(athlete.latest.loadScore);
    card.querySelector(".card__pain").textContent = formatRatio(athlete.latest.painLevel, 10);
    card.querySelector(".card__sleep").textContent = formatRatio(athlete.latest.sleepScore);
    card.querySelector(".card__mood").textContent = formatRatio(athlete.latest.moodScore);

    const historyList = card.querySelector(".history__list");
    athlete.recentHistory.forEach((entry) => {
      const item = document.createElement("li");
      const left = document.createElement("span");
      const right = document.createElement("span");
      left.textContent = entry.timestampDisplay || "Sem horário";
      right.textContent = `Carga ${formatRatio(entry.loadScore)} · Recuperação ${formatRatio(
        entry.recoveryScore
      )}`;
      item.append(left, right);
      historyList.append(item);
    });

    card.addEventListener("click", () => {
      selectAthlete(athlete.id);
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAthlete(athlete.id);
      }
    });

    fragment.append(card);
  });

  elements.athletesGrid.append(fragment);
}

function setLoading(isLoading) {
  elements.refreshButton.disabled = isLoading;
  elements.refreshButton.textContent = isLoading ? "Atualizando..." : "Atualizar";
}

function ensureSelections() {
  if (!state.selectedAthleteId && state.athletes.length) {
    state.selectedAthleteId = state.athletes[0].id;
  }

  const selectedAthlete = getSelectedAthlete();
  if (!state.selectedTeam) {
    state.selectedTeam = selectedAthlete?.category || state.categories[0] || "";
  }
}

async function loadAthletes() {
  setLoading(true);
  elements.errorState.classList.add("hidden");

  try {
    const response = await fetch(DEPLOYMENT.athletesUrl, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.details || payload.message || "Erro ao carregar dados.");
    }

    state.athletes = hydrateAthletes(payload.athletes);
    state.categories = payload.categories;
    state.updatedAt = payload.updatedAt;

    ensureSelections();
    populateCategorySelects();
    renderControls();
    renderExportButtons();
    renderStats();
    renderAthletes();
    renderPanel();
    setSidebarActive(
      state.activeSection === "physiotherapy"
        ? "physiotherapy"
        : state.activeSection === "calendar"
          ? "calendar"
          : state.viewMode === "team"
            ? "teams"
            : "athletes"
    );
    renderActiveWorkspace();
    if (state.staffDrawerOpen) {
      renderStaffDrawer();
    }

    elements.updatedAt.textContent = payload.updatedAtLabel
      ? `Última atualização: ${payload.updatedAtLabel}`
      : "Sem data de atualização.";
  } catch (error) {
    elements.errorState.textContent = error.message;
    elements.errorState.classList.remove("hidden");
    elements.resultsCount.textContent = "Não foi possível carregar os atletas.";
    elements.athletesGrid.innerHTML = "";
    elements.detail.classList.add("detail--empty");
    elements.detailPlaceholder.classList.remove("hidden");
    elements.detailContent.classList.add("hidden");
    destroyCharts();
  } finally {
    setLoading(false);
  }
}

function updateMetricsControl(chartKey, checkedValues) {
  state.controls[chartKey].metrics = checkedValues.length ? checkedValues : [METRICS[0].key];
}

function buildPdfBackground(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(13, 18, 50);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(243, 55, 74);
  doc.rect(0, 0, pageWidth, 12, "F");
  doc.setFillColor(36, 47, 117);
  doc.rect(0, 12, pageWidth, 12, "F");
}

function getTeamsByModality(modalityId) {
  return state.categories.filter(
    (category) => inferModalityId(category) === modalityId
  );
}

function getCrestDataUrl() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const image = document.querySelector(".sidebar__crest");

  if (!image?.complete) {
    return null;
  }

  canvas.width = image.naturalWidth || 240;
  canvas.height = image.naturalHeight || 240;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function createChartBackgroundPlugin() {
  return {
    id: "pdf-background",
    beforeDraw(chart) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
  };
}

async function renderChartImage(config, width = 1100, height = 420) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "fixed";
  canvas.style.left = "-99999px";
  canvas.style.top = "0";
  document.body.append(canvas);
  const context = canvas.getContext("2d");

  const chart = new Chart(context, {
    ...config,
    plugins: [...(config.plugins || []), createChartBackgroundPlugin()],
    options: {
      animation: false,
      responsive: false,
      maintainAspectRatio: false,
      ...config.options,
    },
  });

  await new Promise((resolve) => requestAnimationFrame(resolve));
  const dataUrl = canvas.toDataURL("image/png");
  chart.destroy();
  canvas.remove();
  return dataUrl;
}

function buildExportTrendConfig(teamName) {
  const grouped = new Map();
  getAthletesByTeam(teamName).forEach((athlete) => {
    filterEntriesByPeriod(athlete.entries, "90").forEach((entry) => {
      const key = entry.reportedDate || entry.timestampDisplay;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(entry);
    });
  });

  const labels = Array.from(grouped.keys()).sort((left, right) => {
    const [ld, lm, ly] = left.split("/");
    const [rd, rm, ry] = right.split("/");
    return Date.parse(`${ly}-${lm}-${ld}`) - Date.parse(`${ry}-${rm}-${rd}`);
  });

  const metrics = ["loadScore", "recoveryScore", "stressScore"];

  return {
    type: "line",
    data: {
      labels,
      datasets: metrics.map((metricKey) => {
        const metric = getMetricByKey(metricKey);
        return {
          label: metric.label,
          data: labels.map((label) => aggregateEntries(grouped.get(label) || [], metricKey)),
          borderColor: metric.color,
          backgroundColor: `${metric.color}33`,
          borderWidth: 3,
          pointRadius: 3,
          tension: 0.35,
        };
      }),
    },
    options: {
      ...buildLineOptions(),
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#12183d",
            usePointStyle: true,
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { color: "#12183d", stepSize: 1 },
          grid: { color: "rgba(18, 24, 61, 0.12)" },
        },
        x: {
          ticks: { color: "#12183d" },
          grid: { display: false },
        },
      },
    },
  };
}

function buildExportRadarConfig(teamName) {
  const metrics = ["loadScore", "recoveryScore", "fatigueScore", "sleepScore", "stressScore"];

  return {
    type: "radar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: teamName,
          data: metrics.map((metricKey) =>
            normalizeForRadar(metricKey, getTeamAggregate(teamName, metricKey, "90"))
          ),
          borderColor: "#ff5b6b",
          backgroundColor: "rgba(255, 91, 107, 0.22)",
          pointBackgroundColor: "#ff5b6b",
          borderWidth: 3,
        },
        {
          label: "Média geral",
          data: metrics.map((metricKey) =>
            normalizeForRadar(
              metricKey,
              average(state.athletes.map((athlete) => aggregateAthlete(athlete, metricKey, "90")))
            )
          ),
          borderColor: "#7ea8ff",
          backgroundColor: "rgba(126, 168, 255, 0.16)",
          pointBackgroundColor: "#7ea8ff",
          borderWidth: 3,
        },
      ],
    },
    options: {
      ...buildRadarOptions(),
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#12183d",
            usePointStyle: true,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1,
            backdropColor: "#ffffff",
            color: "#12183d",
          },
          grid: { color: "rgba(18, 24, 61, 0.12)" },
          angleLines: { color: "rgba(18, 24, 61, 0.12)" },
          pointLabels: {
            color: "#12183d",
            font: { size: 11, family: "IBM Plex Sans", weight: "600" },
          },
        },
      },
    },
  };
}

function buildExportPercentileConfig(teamName) {
  const metrics = ["loadScore", "recoveryScore", "painLevel", "stressScore"];

  return {
    type: "bar",
    data: {
      labels: metrics.map((metricKey) => getMetricByKey(metricKey).label),
      datasets: [
        {
          label: "Percentil entre equipes",
          data: metrics.map((metricKey) =>
            percentile(getAllTeamsAggregate(metricKey, "latest"), getTeamAggregate(teamName, metricKey, "latest"))
          ),
          backgroundColor: ["#8d7bff", "#4fe0a2", "#ff5b6b", "#ff7fc0"],
          borderRadius: 999,
          borderSkipped: false,
        },
      ],
    },
    options: {
      indexAxis: "y",
      animation: false,
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            color: "#12183d",
            callback(value) {
              return `${value}%`;
            },
          },
          grid: { color: "rgba(18, 24, 61, 0.12)" },
        },
        y: {
          ticks: { color: "#12183d" },
          grid: { display: false },
        },
      },
    },
  };
}

async function exportModalityPdf(modalityId, teamName = "") {
  if (state.exportInFlight) {
    return;
  }

  const modality = getModalityDefById(modalityId);
  const teams = getTeamsByModality(modalityId);

  if (!teams.length || !modality) {
    return;
  }

  state.exportInFlight = true;
  setExportButtonsBusy(true);

  try {
    const teamParam = teamName ? `&team=${encodeURIComponent(teamName)}` : "";
    const printUrl = `/print-report?modality=${encodeURIComponent(modalityId)}${teamParam}&v=${Date.now()}`;
    const printWindow = window.open(printUrl, "_blank", "noopener,noreferrer");

    if (!printWindow) {
      throw new Error("O navegador bloqueou a abertura do relatório para impressão.");
    }
  } catch (error) {
    console.error("Falha ao exportar PDF:", error);
    alert(error.message || "Não foi possível exportar este PDF agora.");
  } finally {
    state.exportInFlight = false;
    setExportButtonsBusy(false);
  }
}

async function exportWeeklyReportKit() {
  if (state.exportInFlight) {
    return;
  }

  state.exportInFlight = true;
  setExportButtonsBusy(true);

  try {
    const response = await fetch(`/api/export-weekly-kit?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.message || "NÃ£o foi possÃ­vel gerar o kit semanal agora.");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const fileName =
      disposition.match(/filename="([^"]+)"/)?.[1] ||
      disposition.match(/filename=([^;]+)/)?.[1]?.trim() ||
      "relatorios-semanais.zip";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Falha ao gerar kit semanal:", error);
    alert(error.message || "NÃ£o foi possÃ­vel gerar o kit semanal agora.");
  } finally {
    state.exportInFlight = false;
    setExportButtonsBusy(false);
  }
}

elements.searchInput.addEventListener("input", (event) => {
  state.filters.search = event.target.value;
  renderAthletes();
});

elements.categoryFilter.addEventListener("change", (event) => {
  state.filters.category = event.target.value;
  if (event.target.value) {
    state.selectedTeam = event.target.value;
    elements.teamSelect.value = event.target.value;
    elements.calendarTeamSelect.value = event.target.value;
  }
  renderStats();
  renderAthletes();
  renderPanel();
  renderActiveWorkspace();
});

elements.teamSelect.addEventListener("change", (event) => {
  state.selectedTeam = event.target.value;
  elements.calendarTeamSelect.value = event.target.value;
  renderStats();
  renderPanel();
  renderActiveWorkspace();
});

elements.athleteModeButton.addEventListener("click", () => {
  state.activeSection = "panel";
  state.viewMode = "athlete";
  renderStats();
  renderAthletes();
  renderPanel();
  setSidebarActive("athletes");
  renderActiveWorkspace();
});

elements.teamModeButton.addEventListener("click", () => {
  state.activeSection = "panel";
  state.viewMode = "team";
  renderStats();
  renderAthletes();
  renderPanel();
  setSidebarActive("teams");
  renderActiveWorkspace();
});

elements.timelinePeriod.addEventListener("change", (event) => {
  state.controls.timeline.period = event.target.value;
  renderPanel();
});

elements.profilePeriod.addEventListener("change", (event) => {
  state.controls.profile.period = event.target.value;
  renderPanel();
});

elements.distributionPeriod.addEventListener("change", (event) => {
  state.controls.distribution.period = event.target.value;
  renderStats();
  renderAthletes();
  renderPanel();
});

elements.samplePeriod.addEventListener("change", (event) => {
  state.controls.sample.period = event.target.value;
  renderPanel();
});

elements.sampleMetric.addEventListener("change", (event) => {
  state.controls.sample.metric = event.target.value;
  renderPanel();
});

elements.timelineMetrics.addEventListener("change", () => {
  updateMetricsControl(
    "timeline",
    Array.from(elements.timelineMetrics.querySelectorAll("input:checked")).map((input) => input.value)
  );
  renderPanel();
});

elements.profileMetrics.addEventListener("change", () => {
  updateMetricsControl(
    "profile",
    Array.from(elements.profileMetrics.querySelectorAll("input:checked")).map((input) => input.value)
  );
  renderPanel();
});

elements.distributionMetrics.addEventListener("change", () => {
  updateMetricsControl(
    "distribution",
    Array.from(elements.distributionMetrics.querySelectorAll("input:checked")).map((input) => input.value)
  );
  renderPanel();
});

elements.refreshButton.addEventListener("click", () => {
  loadAthletes();
});

elements.physiotherapyRefresh.addEventListener("click", () => {
  loadPhysiotherapy(true);
});

elements.physiotherapySearch.addEventListener("input", (event) => {
  state.physiotherapy.filters.search = event.target.value;
  renderPhysiotherapy();
});

elements.physiotherapyModality.addEventListener("change", (event) => {
  state.physiotherapy.filters.modality = event.target.value;
  populatePhysiotherapyFilters();
  renderPhysiotherapy();
});

elements.physiotherapyTeam.addEventListener("change", (event) => {
  state.physiotherapy.filters.team = event.target.value;
  renderPhysiotherapy();
});

elements.physiotherapySeverity.addEventListener("change", (event) => {
  state.physiotherapy.filters.severity = event.target.value;
  renderPhysiotherapy();
});

elements.staffOpenButton.addEventListener("click", () => {
  openStaffDrawer();
});

elements.staffCloseButton.addEventListener("click", () => {
  closeStaffDrawer();
});

elements.staffCloseBackdrop.addEventListener("click", () => {
  closeStaffDrawer();
});

document.addEventListener("keydown", handleStaffDrawerKeydown);

elements.staffModalityFilter.addEventListener("change", (event) => {
  state.staffModality = event.target.value;
  renderStaffDrawer();
});

elements.staffPeriodFilter.addEventListener("change", (event) => {
  state.staffPeriod = event.target.value;
  renderStaffDrawer();
});

elements.navPanelButton.addEventListener("click", () => {
  state.activeSection = "panel";
  setSidebarActive("panel");
  renderActiveWorkspace();
  elements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.navAthletesButton.addEventListener("click", () => {
  state.activeSection = "panel";
  state.viewMode = "athlete";
  renderStats();
  renderAthletes();
  renderPanel();
  setSidebarActive("athletes");
  renderActiveWorkspace();
  elements.athletesGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.navTeamsButton.addEventListener("click", () => {
  state.activeSection = "panel";
  state.viewMode = "team";
  renderStats();
  renderAthletes();
  renderPanel();
  setSidebarActive("teams");
  renderActiveWorkspace();
  elements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.navCalendarButton.addEventListener("click", () => {
  state.activeSection = "calendar";
  setSidebarActive("calendar");
  renderActiveWorkspace();
  elements.calendarWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.navPhysiotherapyButton.addEventListener("click", () => {
  state.activeSection = "physiotherapy";
  setSidebarActive("physiotherapy");
  renderActiveWorkspace();
  elements.physiotherapyWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
});

elements.calendarTeamSelect.addEventListener("change", (event) => {
  state.selectedTeam = event.target.value;
  elements.teamSelect.value = event.target.value;
  state.activeSection = "calendar";
  renderStats();
  renderPanel();
  setSidebarActive("calendar");
  renderActiveWorkspace();
});

elements.loginForm.addEventListener("submit", handleLogin);
elements.logoutButton.addEventListener("click", handleLogout);

if (isAuthenticated()) {
  showDashboard();
} else {
  showLogin();
}
