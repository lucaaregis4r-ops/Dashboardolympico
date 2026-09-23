const {
  ATTENDANCE_SOURCES,
  PRIMARY_ATHLETES_SOURCE,
  listAttendanceTeams,
  validateDataSourceConfiguration,
} = require("../src/server/config/data-sources");

const PROBE_TIMEOUT_MS = 20000;

function buildAttendanceProbeUrl(spreadsheetId, sheetName) {
  const params = new URLSearchParams({
    tqx: "out:csv",
    headers: "0",
    sheet: sheetName,
    range: "A1:D5",
  });
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
}

async function probeAttendanceSheet(target, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetchImpl(buildAttendanceProbeUrl(target.spreadsheetId, target.sheetName), {
      headers: { "User-Agent": "Dashboard Olympico source validator" },
      redirect: "follow",
      signal: controller.signal,
    });
    const content = await response.text();
    const finalUrl = response.url || "";
    const readableHeader = /ATLETA/i.test(content);
    const loginRedirect = /accounts\.google\.com/i.test(finalUrl);

    return {
      ...target,
      accessible: response.ok && readableHeader && !loginRedirect,
      status: response.status,
      reason: !response.ok
        ? `HTTP ${response.status}`
        : loginRedirect
          ? "redirecionada para login"
          : readableHeader
            ? "ok"
            : "cabecalho ATLETA nao encontrado",
    };
  } catch (error) {
    return {
      ...target,
      accessible: false,
      status: 0,
      reason: error.name === "AbortError" ? "tempo limite excedido" : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function validateOnlineAccess(fetchImpl = fetch) {
  return Promise.all(listAttendanceTeams().map((target) => probeAttendanceSheet(target, fetchImpl)));
}

async function main() {
  const configuration = validateDataSourceConfiguration();
  if (!configuration.valid) {
    configuration.errors.forEach((error) => console.error(`ERRO: ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Base principal preservada: ${PRIMARY_ATHLETES_SOURCE.label}`);
  console.log(
    `Configuracao valida: ${configuration.attendanceSourceCount} fontes suplementares e ${configuration.attendanceTeamCount} categorias.`
  );

  if (process.argv.includes("--offline")) {
    console.log("Validacao online ignorada (--offline). ");
    return;
  }

  const results = await validateOnlineAccess();
  const failures = results.filter((result) => !result.accessible);
  for (const result of results) {
    console.log(`${result.accessible ? "OK" : "FALHA"} ${result.teamName} (${result.sheetName}): ${result.reason}`);
  }

  if (failures.length) {
    console.error(`${failures.length} aba(s) nao podem ser lidas publicamente pelo dashboard.`);
    process.exitCode = 1;
  } else {
    console.log(`Acesso publico confirmado nas ${results.length} abas de presenca.`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildAttendanceProbeUrl,
  probeAttendanceSheet,
  validateOnlineAccess,
};
