import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = resolve(rootDir, "releases");
const stagingDir = resolve(rootDir, ".package");
const releaseRootName = `${packageJson.name}-${packageJson.version}`;
const zipPath = resolve(releaseDir, `${releaseRootName}.zip`);

await mkdir(releaseDir, { recursive: true });

const build = spawnSync("npm", ["run", "build"], { cwd: rootDir, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

await rm(zipPath, { force: true });
await rm(stagingDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

try {
  await cp(resolve(rootDir, "dist"), resolve(stagingDir, releaseRootName), { recursive: true });

  const zip = spawnSync("zip", ["-r", zipPath, releaseRootName], {
    cwd: stagingDir,
    stdio: "inherit",
  });
  if (zip.status !== 0) process.exit(zip.status || 1);
} finally {
  await rm(stagingDir, { recursive: true, force: true });
}

console.log(zipPath);
