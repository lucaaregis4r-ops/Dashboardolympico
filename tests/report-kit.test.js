const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

const { buildReportList, downloadReport, normalizeKey } = require("../scripts/create-report-kit");
const {
  buildAuthorizationUrl,
  escapeDriveQuery,
  parseClientCredentials,
} = require("../scripts/google-drive");

test("lista do kit gera um PDF para cada uma das dezesseis categorias", () => {
  const reports = buildReportList([
    "BASQUETE SUB14",
    "BASQUETE SUB 15",
    "BASQUETE SUB16",
    "BASQUETE SUB17",
    "VÔLEI FEM SUB15",
  ]);

  assert.equal(reports[1].team, "BASQUETE SUB 15");
  assert.ok(reports.some((report) => normalizeKey(report.team) === "VOLEIFEMSUB15"));
  assert.ok(reports.some((report) => normalizeKey(report.team) === "NATACAOJUV"));
  assert.ok(reports.some((report) => normalizeKey(report.team) === "FUTSALSUB17"));
  assert.equal(reports.length, 16);
});

test("credencial do Drive aceita o formato de aplicativo instalado", () => {
  assert.deepEqual(
    parseClientCredentials({ installed: { client_id: "cliente", client_secret: "segredo" } }),
    { clientId: "cliente", clientSecret: "segredo" }
  );
  assert.equal(escapeDriveQuery("Relatorio d'agua"), "Relatorio d\\'agua");
});

test("endereco OAuth inclui os parametros exigidos pelo Google", () => {
  const url = buildAuthorizationUrl(
    { clientId: "cliente.apps.googleusercontent.com", clientSecret: "segredo" },
    "http://127.0.0.1:3210/oauth2callback",
    "estado-seguro",
  );

  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "cliente.apps.googleusercontent.com");
  assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:3210/oauth2callback");
});

test("download valida PDF e retoma sem baixar novamente", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dashboard-kit-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  let requests = 0;
  const server = http.createServer((_request, response) => {
    requests += 1;
    response.writeHead(200, { "Content-Type": "application/pdf" });
    response.end(Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(1500, 1)]));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const report = { modality: "basquete", team: "BASQUETE SUB 15", fileName: "Relatorio Sub 15.pdf" };

  const first = await downloadReport(baseUrl, report, directory);
  const second = await downloadReport(baseUrl, report, directory);

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(requests, 1);
  assert.ok((await fs.stat(path.join(directory, report.fileName))).size > 1000);
});

test("download interrompe resposta presa no prazo configurado", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "dashboard-kit-timeout-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const server = http.createServer(() => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const originalArgv = process.argv;
  process.argv = [...originalArgv, "--timeout-seconds=1", "--retries=1"];
  try {
    await assert.rejects(
      downloadReport(
        `http://127.0.0.1:${server.address().port}`,
        { modality: "basquete", team: "BASQUETE SUB 15", fileName: "travado.pdf" },
        directory
      ),
      /tempo limite de 1s excedido/
    );
  } finally {
    process.argv = originalArgv;
  }
});
