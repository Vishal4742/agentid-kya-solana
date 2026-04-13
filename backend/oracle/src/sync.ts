import { createOracleRuntime, syncAllAgents } from "./core";

async function main() {
  const runtime = createOracleRuntime();
  const result = await syncAllAgents(runtime);

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: result.scanned,
        updated: result.updated.length,
        changes: result.updated,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[oracle-sync] Failed:", error);
  process.exit(1);
});
