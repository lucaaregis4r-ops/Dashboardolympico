const fs = require("fs/promises");
const path = require("path");
const {
  DEFAULT_CLIENT_FILE,
  authorizeGoogleDrive,
  parseClientCredentials,
} = require("./google-drive");

function getArgValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

async function main() {
  const suppliedClientFile = getArgValue("client-file");
  if (suppliedClientFile) {
    const source = path.resolve(suppliedClientFile);
    const payload = JSON.parse(await fs.readFile(source, "utf8"));
    parseClientCredentials(payload);
    await fs.mkdir(path.dirname(DEFAULT_CLIENT_FILE), { recursive: true });
    await fs.copyFile(source, DEFAULT_CLIENT_FILE);
    console.log(`Credencial salva fora do projeto: ${DEFAULT_CLIENT_FILE}`);
  }

  await authorizeGoogleDrive({
    clientFile: DEFAULT_CLIENT_FILE,
    tokenFile: getArgValue("token-file"),
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
