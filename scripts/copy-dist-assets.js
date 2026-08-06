const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
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

  await copyDirectory(path.join(ROOT, "src"), path.join(DIST, "src"));
  await copyDirectory(path.join(ROOT, "assets"), path.join(DIST, "assets"));
  await copyDirectory(path.join(ROOT, "docs"), path.join(DIST, "docs"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
