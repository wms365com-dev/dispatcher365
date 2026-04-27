import { spawn } from "node:child_process";
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

  const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
  const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

  console.log("Applying Prisma schema...");
  await runNodeScript(prismaCli, ["db", "push", "--skip-generate"]);

  console.log(`Starting Next.js on port ${port}...`);
  const child = spawn(process.execPath, [nextCli, "start", "-H", "0.0.0.0", "-p", port], {
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
