import { connect, listGroups } from "./client.js";

async function main() {
  const sock = await connect();
  const groups = await listGroups(sock);

  console.log("\n=== GRUPOS DISPONÍVEIS ===\n");
  for (const g of groups.sort((a, b) => a.subject.localeCompare(b.subject))) {
    console.log(`${g.subject}  (${g.size} membros)`);
    console.log(`  ID: ${g.id}\n`);
  }
  console.log(
    "Copie o ID do grupo alvo e cole em WHATSAPP_GROUP_ID no .env, depois derrube esse processo (Ctrl+C)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
