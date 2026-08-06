const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPhysioDemandPanelHtml,
  transformPhysioModalityRows,
} = require("../src/server");

test("le observacoes da secao de atletas em tratamento como campo proprio", () => {
  const rows = [
    ["ATLETAS EM TRATAMENTO"],
    [
      "NOME",
      "CATEGORIA",
      "LESÃO",
      "GRAVIDADE",
      "FASE DO TRATAMENTO",
      "VETO TREINO",
      "VETO PF",
      "OBSERVAÇÕES",
    ],
    [
      "Atleta Teste",
      "SUB-17",
      "Entorse de tornozelo",
      "AMARELO",
      "2",
      "SIM, PARCIAL",
      "NÃO",
      "Retorno progressivo após avaliação",
    ],
  ];

  const items = transformPhysioModalityRows(rows, "basquete");

  assert.equal(items.length, 1);
  assert.equal(items[0].observations, "Retorno progressivo após avaliação");
  assert.equal(items[0].notes, "Em tratamento | Fase 2 | Veto treino: SIM, PARCIAL | Veto PF: NÃO");
});

test("aceita alias Obs e nao cria conteudo para observacao vazia", () => {
  const rows = [
    ["ATLETAS EM TRATAMENTO"],
    ["NOME", "CATEGORIA", "LESÃO", "GRAVIDADE", "Obs"],
    ["Atleta Sem Obs", "SUB-15", "Dor muscular", "VERDE", ""],
  ];

  const [item] = transformPhysioModalityRows(rows, "basquete");
  const html = buildPhysioDemandPanelHtml("BASQUETE SUB-15", [item]);

  assert.equal(item.observations, "");
  assert.doesNotMatch(html, /Observações:/);
});

test("exclui registros abaixo de historico e altas", () => {
  const rows = [
    ["ATLETAS EM TRATAMENTO"],
    ["NOME", "CATEGORIA", "LESÃO", "GRAVIDADE", "FASE", "OBSERVAÇÕES"],
    ["Atleta Ativo", "SUB-14", "Lesão ativa", "AMARELO", "3", "Acompanhar carga"],
    ["HISTÓRICO DE ATENDIMENTOS IMEDIATOS ANTERIORES + ALTAS"],
    ["NOME", "CATEGORIA", "LESÃO", "GRAVIDADE", "FASE", "OBSERVAÇÕES"],
    ["Atleta Antigo", "SUB-14", "Lesão antiga", "VERDE", "ALTA", "Caso encerrado"],
  ];

  const items = transformPhysioModalityRows(rows, "basquete");

  assert.deepEqual(items.map((item) => item.athleteName), ["Atleta Ativo"]);
});

test("renderiza e escapa a observacao no relatorio", () => {
  const html = buildPhysioDemandPanelHtml("BASQUETE SUB-17", [
    {
      athleteName: "Atleta Teste",
      teamName: "SUB-17",
      modalityId: "basquete",
      demand: "Dor no joelho",
      semaphore: "AMARELO",
      phase: "2",
      notes: "Em tratamento | Fase 2",
      observations: "Reavaliar <sexta> & avisar comissão",
    },
  ]);

  assert.match(html, /Observações:/);
  assert.match(html, /Reavaliar &lt;sexta&gt; &amp; avisar comissão/);
  assert.doesNotMatch(html, /Reavaliar <sexta>/);
});
