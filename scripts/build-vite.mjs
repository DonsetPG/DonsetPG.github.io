import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const productionIndex = readFileSync("index.html", "utf8");

try {
  copyFileSync("index.vite.html", "index.html");

  const viteBinary = process.platform === "win32" ? "node_modules/.bin/vite.cmd" : "node_modules/.bin/vite";
  const result = spawnSync(viteBinary, ["build"], { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
} finally {
  writeFileSync("index.html", productionIndex);
}
