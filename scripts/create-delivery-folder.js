const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "dist");
const TARGET = path.join(ROOT, "ENTREGAR-DASHBOARD-OLYMPICO");

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function main() {
  await fs.rm(TARGET, { recursive: true, force: true });
  await copyDirectory(SOURCE, TARGET);

  const instructions = `# Dashboard Olympico

Para abrir:

1. Abra esta pasta.
2. De duplo clique em Dashboard-Olympico.exe.
3. O dashboard abrira no navegador.

Para usar no celular:

1. Deixe este computador e o celular na mesma rede Wi-Fi.
2. Abra o dashboard no computador.
3. Se aparecer alerta do Firewall do Windows, permita acesso em redes privadas.
4. Use o link de rede local exibido pelo servidor, no formato http://192.168.x.x:3000.

Importante:

- Copie/enviar esta pasta inteira, nao apenas o arquivo .exe.
- A pasta runtime contem o Node necessario para rodar o dashboard.
- As planilhas do Google precisam estar acessiveis pela internet.
`;

  await fs.writeFile(path.join(TARGET, "LEIA-ME.txt"), instructions, "utf8");
  console.log(`Pasta de entrega criada em: ${TARGET}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
