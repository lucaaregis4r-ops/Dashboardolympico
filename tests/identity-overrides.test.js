const test = require("node:test");
const assert = require("node:assert/strict");

const {
  findApprovedIdentityOverride,
  identityKey,
  identityOverrides,
} = require("../src/server/domain/identity-overrides");

test("persiste as identidades aprovadas na planilha de unificacao", () => {
  assert.equal(identityOverrides.version, 2);
  assert.equal(identityOverrides.mappings.length, 259);
  assert.equal(identityOverrides.summary.pending, 61);
  assert.equal(identityOverrides.reviewSpreadsheetId, "1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw");

  const keys = identityOverrides.mappings.map((item) => identityKey(item.teamName, item.attendanceName));
  assert.equal(new Set(keys).size, keys.length);
});

test("aplica aprovacoes manuais e correcoes de equipe do pente fino", () => {
  const manual = findApprovedIdentityOverride(
    "BASQUETE SUB14",
    "Adriel Lincon Santos Rodrigues"
  );
  const correctedTeam = findApprovedIdentityOverride(
    "NATAÇÃO JUV",
    "EDUARDO LOUZADO ROSA DE OLIVEIRA"
  );

  assert.equal(manual.primaryName, "ADRYEL LINCON SANTOS RODRIGUES");
  assert.equal(manual.matchType, "REVISAO_APROVADA");
  assert.equal(correctedTeam.primaryTeam, "NATAÇÃO JR");
  assert.equal(correctedTeam.matchType, "PENTE_FINO");
});

test("consulta override ignorando acentos, caixa e espacamento da equipe", () => {
  const mapping = findApprovedIdentityOverride(
    "basquete sub15",
    "Alexandre Gabriel Lopes Bebiano"
  );

  assert.equal(mapping.primaryName, "ALEXANDRE LOPES");
});
