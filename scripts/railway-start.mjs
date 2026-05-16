import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptPath} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const port = process.env.PORT ?? "3000";
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is required before Railway startup.");
    process.exit(1);
  }

  const nextCli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
  const prismaCli = new URL("../node_modules/prisma/build/index.js", import.meta.url);

  try {
    await access(nextCli, constants.F_OK);
  } catch {
    console.error("Next.js runtime binary was not found. Ensure dependencies were installed during build.");
    process.exit(1);
  }

  try {
    await access(prismaCli, constants.F_OK);
  } catch {
    console.error("Prisma CLI was not found. Ensure dependencies were installed during build.");
    process.exit(1);
  }

  console.log("Applying Prisma schema to the configured database...");
  const dbPushArgs = ["db", "push", "--skip-generate"];
  if (process.env.PRISMA_ACCEPT_DATA_LOSS === "true") {
    dbPushArgs.push("--accept-data-loss");
  }
  await runNodeScript(fileURLToPath(prismaCli), dbPushArgs);

  console.log(`Starting Next.js on port ${port}...`);
  const child = spawn(process.execPath, [fileURLToPath(nextCli), "start", "-H", "0.0.0.0", "-p", port], {
    stdio: "inherit",
    env: process.env
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
