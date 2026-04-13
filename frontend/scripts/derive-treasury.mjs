import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF");
const KNOWN_AGENT = new PublicKey("8DLr8MYie8VHBiLkFcoE6YHtNeKdgz5PWy5tpSV3iqZA");

try {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent-treasury"), KNOWN_AGENT.toBuffer()],
    PROGRAM_ID
  );
  console.log("treasury PDA:", pda.toBase58(), "bump:", bump);
} catch (e) {
  console.log("Error:", e.message);
}
