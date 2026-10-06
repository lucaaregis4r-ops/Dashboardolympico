const test = require("node:test");
const assert = require("node:assert/strict");
const { transformRows } = require("../src/server");
const { HEADER, transformWellnessSheetRows } = require("../src/server/integrations/wellness");

const target = { teamName: "BASQUETE SUB14", sheetName: "PSR 14" };
const sheetHeader = [
  "Carimbo de data/hora", "DATA DE HOJE", "NOME", "Local da dor", "Nível da dor",
  "QUESTIONÁRIO DE BEM ESTAR [FADIGA]", "QUESTIONÁRIO DE BEM ESTAR [SONO]",
  "QUESTIONÁRIO DE BEM ESTAR [DOR MUSCULAR]", "QUESTIONÁRIO DE BEM ESTAR [ESTRESSE]",
  "QUESTIONÁRIO DE BEM ESTAR [HUMOR]",
];

test("importa bem-estar da aba PSR para os indicadores e a equipe corretos", () => {
  const rows = transformWellnessSheetRows([
    sheetHeader,
    ["05/10/2026 14:56:00", "05/10/2026", "ATLETA TESTE", "2", "4", "4 - CANSADO", "2 - BOM", "3 - NORMAL", "4 - ESTRESSADO", "2 - BOM HUMOR"],
  ], target);
  const result = transformRows([HEADER, ...rows]);
  assert.equal(result.updatedAt, "2026-10-05T14:56:00.000Z");
  assert.equal(result.athletes[0].category, "BASQUETE SUB14");
  assert.equal(result.athletes[0].latest.fatigueScore, 4);
  assert.equal(result.athletes[0].latest.painLevel, 4);
  assert.equal(result.athletes[0].latest.stressScore, 4);
});

test("aceita aba PSR sem respostas, mas rejeita cabecalho incorreto", () => {
  assert.deepEqual(transformWellnessSheetRows([sheetHeader], target), []);
  assert.throws(
    () => transformWellnessSheetRows([["pagina de login"]], target),
    /cabecalho de bem-estar inesperado/
  );
});
