/* Shared by the local report and the static dashboard. Entries are newest first. */
(function (root, factory) {
  const analysis = factory();
  if (typeof module === "object" && module.exports) module.exports = analysis;
  if (root) root.OlympicoAnalysis = analysis;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const ANALYSIS_CONFIG = Object.freeze({
    activityWindowDays: 20,
    reportWeekDays: 7,
    trendDays: 90,
    recentWindowEntries: 3,
    minPersonalBaselineWindows: 6,
    minTeamPercentileN: 6,
  });

  const mean = (values) => {
    const valid = values.filter(Number.isFinite);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };
  const rounded = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  const withinDays = (entry, updatedAtIso, days) => {
    const date = Date.parse(entry?.timestampIso || "");
    const anchor = Date.parse(updatedAtIso || "");
    const end = new Date(anchor);
    const start = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - days + 1);
    return Number.isFinite(date) && Number.isFinite(anchor) && date <= anchor && date >= start;
  };
  const recentEntries = (athlete, updatedAtIso, days = ANALYSIS_CONFIG.reportWeekDays) =>
    (athlete.entries || []).filter((entry) => withinDays(entry, updatedAtIso, days));
  const getAnalysisEligibleAthletes = (athletes, updatedAtIso, options = {}) =>
    athletes.filter((athlete) => recentEntries(athlete, updatedAtIso,
      options.days ?? ANALYSIS_CONFIG.activityWindowDays).length > 0);

  // Source labels: sleep 1 = "muito tranquilo", 5 = "insônia";
  // mood 1 = "muito bom humor", 5 = "muito triste".
  function computeRecoveryScore(entry) {
    const value = mean([
      Number.isFinite(entry.fatigueScore) ? 6 - entry.fatigueScore : null,
      Number.isFinite(entry.stressScore) ? 6 - entry.stressScore : null,
      Number.isFinite(entry.muscleScore) ? 6 - entry.muscleScore : null,
      Number.isFinite(entry.sleepScore) ? 6 - entry.sleepScore : null,
      Number.isFinite(entry.moodScore) ? 6 - entry.moodScore : null,
      Number.isFinite(entry.painLevel) ? 5 - Math.min(10, Math.max(0, entry.painLevel)) / 2 : null,
    ]);
    return value === null ? null : rounded(Math.max(0, Math.min(5, value)));
  }

  function percentile(values, value) {
    if (!Number.isFinite(value) || !values.length) return null;
    const valid = values.filter(Number.isFinite);
    return valid.length ? Math.round((valid.filter((item) => item < value).length + valid.filter((item) => item === value).length / 2) / valid.length * 100) : null;
  }

  function personalBaseline(athlete, metricKey) {
    const entries = athlete.entries || [];
    const currentValues = entries.slice(0, ANALYSIS_CONFIG.recentWindowEntries).map((entry) => entry[metricKey]);
    const current = currentValues.length === ANALYSIS_CONFIG.recentWindowEntries && currentValues.every(Number.isFinite)
      ? rounded(mean(currentValues)) : null;
    const chronological = entries.slice().reverse();
    const windows = [];
    for (let index = 0; index <= chronological.length - ANALYSIS_CONFIG.recentWindowEntries; index += 1) {
      const values = chronological.slice(index, index + ANALYSIS_CONFIG.recentWindowEntries).map((entry) => entry[metricKey]);
      if (values.every(Number.isFinite)) windows.push(rounded(mean(values)));
    }
    // The current window is never part of its own reference distribution.
    if (windows.length) windows.pop();
    return {
      current,
      baselineCount: windows.length,
      percentile: windows.length >= ANALYSIS_CONFIG.minPersonalBaselineWindows ? percentile(windows, current) : null,
    };
  }

  function buildAttentionItems(athletes, updatedAtIso) {
    const eligible = getAnalysisEligibleAthletes(athletes, updatedAtIso, { days: ANALYSIS_CONFIG.reportWeekDays });
    const byTeam = new Map();
    eligible.forEach((athlete) => {
      if (!byTeam.has(athlete.category)) byTeam.set(athlete.category, []);
      byTeam.get(athlete.category).push(athlete);
    });
    return eligible.map((athlete) => {
      const entries = recentEntries(athlete, updatedAtIso).slice(0, 3);
      const latest = entries[0];
      const baseline = personalBaseline(athlete, "loadScore");
      const recoveryBaseline = personalBaseline(athlete, "recoveryScore");
      const stressBaseline = personalBaseline(athlete, "stressScore");
      const persistent = (key, predicate) => entries.length === 3 && entries.filter((entry) => predicate(entry[key])).length >= 2;
      const signals = [];
      const add = (domain, reason, strength, absolute = 0, persistence = false) => signals.push({ domain, reason, strength, absolute, persistence });
      if (Number.isFinite(latest.painLevel) && latest.painLevel >= 6) add("pain", `Dor ${latest.painLevel}/10`, 3, latest.painLevel);
      if (Number.isFinite(latest.recoveryScore) && latest.recoveryScore <= 2.2) add("recovery", `Recuperação ${latest.recoveryScore}/5`, 3, 5 - latest.recoveryScore);
      if (persistent("fatigueScore", (value) => Number.isFinite(value) && value >= 4)) add("fatigue", "Fadiga alta em 2 das 3 respostas", 2, 0, true);
      if (persistent("stressScore", (value) => Number.isFinite(value) && value >= 4)) add("stress", "Estresse alto em 2 das 3 respostas", 2, 0, true);
      if (persistent("recoveryScore", (value) => Number.isFinite(value) && value <= 2.8)) add("recovery", "Recuperação baixa em 2 das 3 respostas", 2, 0, true);
      if (baseline.percentile >= 85 && baseline.current >= 3) add("load", "Desgaste acima do padrão pessoal", 1);
      if (recoveryBaseline.percentile !== null && recoveryBaseline.percentile <= 15 && Number.isFinite(recoveryBaseline.current)) add("recovery", "Recuperação abaixo do padrão pessoal", 1);
      if (stressBaseline.percentile >= 85 && stressBaseline.current >= 3) add("stress", "Estresse acima do padrão pessoal", 1);
      if (!signals.length) return null;
      signals.sort((a, b) => b.strength - a.strength || b.absolute - a.absolute || Number(b.persistence) - Number(a.persistence));
      const domains = new Set(signals.map((signal) => signal.domain));
      const strong = signals[0].strength === 3;
      const combined = domains.size >= 2 && signals.some((signal) => signal.strength >= 2);
      const level = strong || combined ? "Atenção alta" : signals.some((signal) => signal.strength >= 2) ? "Atenção" : "Acompanhar";
      const tone = level === "Atenção alta" ? "high" : level === "Atenção" ? "medium" : "watch";
      const teamValues = (byTeam.get(athlete.category) || []).map((item) => personalBaseline(item, "loadScore").current).filter(Number.isFinite);
      return {
        athlete, level, tone, primaryReason: signals[0].reason,
        secondaryReasons: signals.slice(1, 3).map((signal) => signal.reason),
        metrics: { load: baseline.current, recovery: latest.recoveryScore, stress: latest.stressScore },
        dataQuality: { recentCount: entries.length, baselineCount: baseline.baselineCount,
          note: entries.length < 3 ? "Base recente reduzida" : baseline.percentile === null ? "Base histórica insuficiente" : "" },
        context: { personalPercentile: baseline.percentile,
          teamPercentile: teamValues.length >= ANALYSIS_CONFIG.minTeamPercentileN ? percentile(teamValues, baseline.current) : null },
        absoluteStrength: signals[0].absolute,
        persistenceCount: signals.filter((signal) => signal.persistence).length,
      };
    }).filter(Boolean).sort((a, b) =>
      ({ high: 0, medium: 1, watch: 2 })[a.tone] - ({ high: 0, medium: 1, watch: 2 })[b.tone] ||
      b.absoluteStrength - a.absoluteStrength || b.persistenceCount - a.persistenceCount ||
      Date.parse(b.athlete.latest?.timestampIso || b.athlete.entries?.[0]?.timestampIso || 0) - Date.parse(a.athlete.latest?.timestampIso || a.athlete.entries?.[0]?.timestampIso || 0) ||
      a.athlete.name.localeCompare(b.athlete.name, "pt-BR"));
  }

  return { ANALYSIS_CONFIG, computeRecoveryScore, getAnalysisEligibleAthletes, recentEntries, personalBaseline, buildAttentionItems };
});
