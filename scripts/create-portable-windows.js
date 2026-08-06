const fs = require("fs/promises");
const fsSync = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const RUNTIME = path.join(DIST, "runtime");
const NODE_VERSION = "22.11.0";
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;

const FILES = [
  "server.js",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "Olímpico_Clube_escudo.png",
];

function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

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

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "User-Agent": "Dashboard Olympico" } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, targetPath).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Falha ao baixar ${url} (${response.statusCode})`));
        return;
      }

      const file = fsSync.createWriteStream(targetPath);
      response.pipe(file);
      file.on("finish", () => file.close(resolve));
      file.on("error", reject);
    });

    request.on("error", reject);
  });
}

async function ensureNodeRuntime() {
  await fs.mkdir(RUNTIME, { recursive: true });
  const nodePath = path.join(RUNTIME, "node.exe");
  if (fsSync.existsSync(nodePath)) {
    return nodePath;
  }

  const localNode = process.execPath;
  if (fsSync.existsSync(localNode)) {
    console.log(`Copiando Node local para o pacote: ${localNode}`);
    await fs.copyFile(localNode, nodePath);
    return nodePath;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "olympico-node-"));
  const zipPath = path.join(tempDir, NODE_ZIP);

  try {
    console.log(`Baixando Node.js ${NODE_VERSION} portable...`);
    await downloadFile(NODE_URL, zipPath);
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tempDir.replace(/'/g, "''")}' -Force`,
    ]);

    const extractedNode = path.join(tempDir, `node-v${NODE_VERSION}-win-x64`, "node.exe");
    await fs.copyFile(extractedNode, nodePath);
    return nodePath;
  } catch (error) {
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function compileLauncher() {
  const sourcePath = path.join(DIST, "Dashboard-Olympico.Launcher.cs");
  const outputPath = path.join(DIST, "Dashboard-Olympico.exe");
  const cscCandidates = [
    "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
    "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe",
  ];
  const cscPath = cscCandidates.find((candidate) => fsSync.existsSync(candidate));

  if (!cscPath) {
    throw new Error("Nao encontrei csc.exe para compilar o launcher.");
  }

  const source = `
using System;
using System.Diagnostics;
using System.IO;

class DashboardOlympicoLauncher {
  static void Main() {
    string root = AppDomain.CurrentDomain.BaseDirectory;
    string node = Path.Combine(root, "runtime", "node.exe");
    string server = Path.Combine(root, "server.js");

    if (!File.Exists(node) || !File.Exists(server)) {
      System.Windows.Forms.MessageBox.Show("Arquivos do Dashboard Olympico nao encontrados. Copie a pasta dist inteira.", "Dashboard Olympico");
      return;
    }

    ProcessStartInfo startInfo = new ProcessStartInfo();
    startInfo.FileName = node;
    startInfo.Arguments = "\\\"" + server + "\\\" --open";
    startInfo.WorkingDirectory = root;
    startInfo.UseShellExecute = false;
    startInfo.CreateNoWindow = true;
    Process.Start(startInfo);
  }
}
`;

  await fs.writeFile(sourcePath, source, "utf8");
  await execFileAsync(cscPath, [
    "/nologo",
    "/target:winexe",
    `/out:${outputPath}`,
    "/reference:System.Windows.Forms.dll",
    sourcePath,
  ]);
  await fs.rm(sourcePath, { force: true });
}

async function main() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  await Promise.all(
    FILES.map((fileName) => fs.copyFile(path.join(ROOT, fileName), path.join(DIST, fileName)))
  );
  await copyDirectory(path.join(ROOT, "docs"), path.join(DIST, "docs"));
  await ensureNodeRuntime();
  await compileLauncher();

  console.log(`Pacote portatil criado em ${DIST}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
