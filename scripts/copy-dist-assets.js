const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "Olímpico_Clube_escudo.png",
];

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
  await fs.mkdir(DIST, { recursive: true });

  await Promise.all(
    FILES.map((fileName) => fs.copyFile(path.join(ROOT, fileName), path.join(DIST, fileName)))
  );

  await copyDirectory(path.join(ROOT, "docs"), path.join(DIST, "docs"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
