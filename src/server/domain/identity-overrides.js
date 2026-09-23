const identityOverrides = require("../config/athlete-identity-reviewed.json");
const { normalizeAthleteKey } = require("../integrations/attendance");

function identityKey(teamName, athleteName) {
  const teamKey = normalizeAthleteKey(teamName).replace(/\s+/g, "");
  return `${teamKey}|${normalizeAthleteKey(athleteName)}`;
}

const approvedIdentityOverrides = new Map(
  identityOverrides.mappings.map((mapping) => [
    identityKey(mapping.teamName, mapping.attendanceName),
    mapping,
  ])
);

function findApprovedIdentityOverride(teamName, attendanceName) {
  return approvedIdentityOverrides.get(identityKey(teamName, attendanceName)) || null;
}

module.exports = {
  findApprovedIdentityOverride,
  identityKey,
  identityOverrides,
};
