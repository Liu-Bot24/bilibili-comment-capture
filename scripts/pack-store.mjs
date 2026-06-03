import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = resolve(rootDir, "chrome-web-store");
const zipPath = resolve(packageDir, `${packageJson.name}-${packageJson.version}.zip`);

await mkdir(packageDir, { recursive: true });

const build = spawnSync("npm", ["run", "build"], { cwd: rootDir, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

await rm(zipPath, { force: true });

const zip = spawnSync("zip", ["-r", zipPath, "."], { cwd: resolve(rootDir, "dist"), stdio: "inherit" });
if (zip.status !== 0) process.exit(zip.status || 1);

console.log(zipPath);
