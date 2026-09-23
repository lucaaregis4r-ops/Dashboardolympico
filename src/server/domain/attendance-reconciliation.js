const { normalizeAthleteKey } = require("../integrations/attendance");
const { findApprovedIdentityOverride } = require("./identity-overrides");

const NAME_CONNECTORS = new Set(["DA", "DAS", "DE", "DO", "DOS", "E"]);

function normalizeWords(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normalizeTeamKey(value) {
  return normalizeWords(value).replace(/\s+/g, "");
}

function meaningfulNameTokens(value) {
  return normalizeWords(value)
    .split(" ")
    .filter((token) => token && !NAME_CONNECTORS.has(token));
}

function isSubsetName(leftName, rightName) {
  const left = new Set(meaningfulNameTokens(leftName));
  const right = new Set(meaningfulNameTokens(rightName));
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  return smaller.size >= 2 && [...smaller].every((token) => larger.has(token));
}

function levenshteinDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function similarity(leftName, rightName) {
  const left = normalizeAthleteKey(leftName);
  const right = normalizeAthleteKey(rightName);
  if (!left || !right) return 0;
  return 1 - levenshteinDistance(left, right) / Math.max(left.length, right.length);
}

function resolveAttendanceAthlete(attendanceName, teamName, primaryAthletes) {
  const candidates = primaryAthletes.filter(
    (athlete) => normalizeTeamKey(athlete.category) === normalizeTeamKey(teamName)
  );
  const approvedOverride = findApprovedIdentityOverride(teamName, attendanceName);
  if (approvedOverride) {
    const approvedTeam = approvedOverride.primaryTeam || teamName;
    const approved = primaryAthletes.filter(
      (athlete) => normalizeTeamKey(athlete.category) === normalizeTeamKey(approvedTeam)
    ).filter(
      (athlete) => normalizeAthleteKey(athlete.name) === normalizeAthleteKey(approvedOverride.primaryName)
    );
    if (approved.length === 1) return { status: "approved", athlete: approved[0], confidence: 1 };
  }
  const attendanceKey = normalizeAthleteKey(attendanceName);
  const exact = candidates.filter((athlete) => normalizeAthleteKey(athlete.name) === attendanceKey);
  if (exact.length === 1) return { status: "exact", athlete: exact[0], confidence: 1 };

  const aliases = candidates.filter((athlete) => isSubsetName(attendanceName, athlete.name));
  if (aliases.length === 1) return { status: "alias", athlete: aliases[0], confidence: 0.95 };

  const suggestions = candidates
    .map((athlete) => ({ athlete, confidence: similarity(attendanceName, athlete.name) }))
    .sort((left, right) => right.confidence - left.confidence);
  const best = suggestions[0];
  const second = suggestions[1];
  if (best && best.confidence >= 0.88 && (!second || best.confidence - second.confidence >= 0.04)) {
    return { status: "suggested", athlete: best.athlete, confidence: best.confidence };
  }
  return { status: "unmatched", athlete: null, confidence: best?.confidence || 0 };
}

function percentage(present, sessions) {
  return sessions ? Math.round((present / sessions) * 1000) / 10 : null;
}

function reconcileAttendanceData(primaryAthletes, attendanceData) {
  const roster = [];
  for (const team of attendanceData?.teams || []) {
    const latestDate = team.sessionDates.at(-1) || null;
    const startDate = latestDate
      ? new Date(Date.parse(`${latestDate}T00:00:00Z`) - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;
    const weeklySessionDates = team.sessionDates.filter(
      (date) => (!startDate || date >= startDate) && (!latestDate || date <= latestDate)
    );
    const athleteNames = [...new Set(team.records.map((record) => record.athleteName))];

    for (const attendanceName of athleteNames) {
      const resolution = resolveAttendanceAthlete(attendanceName, team.teamName, primaryAthletes);
      const athleteRecords = team.records.filter((record) => record.athleteName === attendanceName);
      const lastPresenceDate = athleteRecords.filter((record) => record.present).map((record) => record.date).sort().at(-1) || null;
      const weeklyRecords = athleteRecords.filter((record) => weeklySessionDates.includes(record.date));
      const weeklyPresent = weeklyRecords.filter((record) => record.present).length;
      roster.push({
        modalityId: team.modalityId,
        teamName: team.teamName,
        attendanceName,
        matchStatus: resolution.status,
        confidence: Math.round(resolution.confidence * 100),
        primaryAthleteId: ["approved", "exact", "alias"].includes(resolution.status) ? resolution.athlete?.id || null : null,
        primaryAthleteName: resolution.athlete?.name || "",
        suggestedAthleteId: resolution.status === "suggested" ? resolution.athlete?.id || null : null,
        lastPresenceDate,
        weeklyPresent,
        weeklySessions: weeklySessionDates.length,
        weeklyPercentage: percentage(weeklyPresent, weeklySessionDates.length),
      });
    }
  }

  const lastSessionDate = (attendanceData?.teams || [])
    .flatMap((team) => team.sessionDates)
    .sort()
    .at(-1) || null;
  return { roster, lastSessionDate };
}

function applyAttendanceActivity(primaryAthletes, attendanceData, primaryUpdatedAt, windowDays) {
  const reconciliation = reconcileAttendanceData(primaryAthletes, attendanceData);
  const primaryDate = primaryUpdatedAt instanceof Date && !Number.isNaN(primaryUpdatedAt.getTime())
    ? primaryUpdatedAt.toISOString().slice(0, 10)
    : null;
  const referenceDate = [primaryDate, reconciliation.lastSessionDate].filter(Boolean).sort().at(-1) || null;
  const attendanceTeamKeys = new Set(
    (attendanceData?.teams || []).map((team) => normalizeTeamKey(team.teamName))
  );
  const presenceByAthlete = new Map(
    reconciliation.roster
      .filter((item) => item.primaryAthleteId && item.lastPresenceDate)
      .map((item) => [item.primaryAthleteId, item])
  );

  const athletes = primaryAthletes.map((athlete) => {
    const presence = presenceByAthlete.get(athlete.id);
    const checkInDate = athlete.latest?.timestampIso?.slice(0, 10) || null;
    const lastActivityDate = [checkInDate, presence?.lastPresenceDate].filter(Boolean).sort().at(-1) || null;
    const inactiveAfter = referenceDate
      ? new Date(Date.parse(`${referenceDate}T00:00:00Z`) - windowDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : null;
    const hasAttendanceCoverage = attendanceTeamKeys.has(normalizeTeamKey(athlete.category));
    const hasRecentActivity = !inactiveAfter || Boolean(lastActivityDate && lastActivityDate >= inactiveAfter);
    const activityStatus = hasRecentActivity
      ? "active"
      : hasAttendanceCoverage
        ? "inactive"
        : "unverified";
    const isActive = activityStatus !== "inactive";
    const activitySource = presence?.lastPresenceDate && presence.lastPresenceDate > (checkInDate || "")
      ? "attendance"
      : presence?.lastPresenceDate === checkInDate
        ? "both"
        : "checkin";
    return {
      ...athlete,
      isActive,
      activityStatus,
      hasAttendanceCoverage,
      lastActivityDate,
      lastActivitySource: activitySource,
      lastPresenceDate: presence?.lastPresenceDate || null,
    };
  });

  const matched = reconciliation.roster.filter((item) => ["approved", "exact", "alias"].includes(item.matchStatus)).length;
  return {
    athletes,
    reconciliation: {
      ...reconciliation,
      referenceDate,
      matched,
      suggested: reconciliation.roster.filter((item) => item.matchStatus === "suggested").length,
      unmatched: reconciliation.roster.filter((item) => item.matchStatus === "unmatched").length,
    },
  };
}

module.exports = {
  applyAttendanceActivity,
  isSubsetName,
  normalizeTeamKey,
  reconcileAttendanceData,
  resolveAttendanceAthlete,
  similarity,
};
