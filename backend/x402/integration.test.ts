import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import { x402Middleware } from "./middleware";
import express, { Express } from "express";
import request from "supertest";

/**
 * Integration tests for x402 middleware with actual Solana devnet transactions
 *
 * WARNING: These tests require:
 * 1. Solana devnet to be accessible
 * 2. A funded payer wallet
 * 3. USDC devnet mint setup
 *
 * Run with: INTEGRATION=true npm test -- integration.test.ts
 */

const SHOULD_RUN = process.env.INTEGRATION === "true";
const DEVNET_RPC = "https://api.devnet.solana.com";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

describe.skip("x402Middleware Integration Tests", () => {
  let app: Express;
  let connection: Connection;
  let payer: Keypair;
  let treasury: Keypair;
  let treasuryTokenAccount: PublicKey;

  beforeAll(async () => {
    if (!SHOULD_RUN) {
      console.log("Skipping integration tests. Set INTEGRATION=true to run.");
      return;
    }

    connection = new Connection(DEVNET_RPC, "confirmed");
    payer = Keypair.generate();
    treasury = Keypair.generate();

    // Airdrop SOL to payer for transaction fees
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2e9); // 2 SOL
    await connection.confirmTransaction(airdropSig);

    // Create treasury token account
    const usdcMint = new PublicKey(DEVNET_USDC_MINT);
    const treasuryAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      treasury.publicKey
    );
    treasuryTokenAccount = treasuryAta.address;

    // Setup Express app
    app = express();
    app.get(
      "/protected",
      x402Middleware(1.0, treasury.publicKey.toBase58()),
      (req, res) => {
        res.json({ success: true, payment: res.locals.verifiedPayment });
      }
    );
  }, 60000);

  it("should reject request without payment signature", async () => {
    if (!SHOULD_RUN) return;

    const response = await request(app).get("/protected");

    expect(response.status).toBe(402);
    expect(response.body.error).toBe("Payment Required");
    expect(response.body.required_amount).toBe(1.0);
  });

  it("should accept request with valid USDC payment", async () => {
    if (!SHOULD_RUN) return;

    // Create and send USDC payment transaction
    const usdcMint = new PublicKey(DEVNET_USDC_MINT);
    const payerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      payer.publicKey
    );

    // Mint 2 USDC to payer (assuming we have mint authority - devnet only)
    // In reality, payer would already have USDC or get it from a faucet
    // This is a simplified example

    // Transfer 1 USDC to treasury
    const transferSig = await transfer(
      connection,
      payer,
      payerAta.address,
      treasuryTokenAccount,
      payer.publicKey,
      1_000_000 // 1 USDC (6 decimals)
    );

    // Wait for confirmation
    await connection.confirmTransaction(transferSig, "confirmed");

    // Make request with payment signature
    const response = await request(app)
      .get("/protected")
      .set("X-Payment-Signature", transferSig);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.payment.signature).toBe(transferSig);
    expect(response.body.payment.amountUsdc).toBeGreaterThanOrEqual(1.0);
  }, 60000);

  it("should reject replayed payment signature", async () => {
    if (!SHOULD_RUN) return;

    // Create valid payment
    const usdcMint = new PublicKey(DEVNET_USDC_MINT);
    const payerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      payer.publicKey
    );

    const transferSig = await transfer(
      connection,
      payer,
      payerAta.address,
      treasuryTokenAccount,
      payer.publicKey,
      1_000_000
    );

    await connection.confirmTransaction(transferSig, "confirmed");

    // First request should succeed
    const response1 = await request(app)
      .get("/protected")
      .set("X-Payment-Signature", transferSig);
    expect(response1.status).toBe(200);

    // Second request with same signature should be rejected
    const response2 = await request(app)
      .get("/protected")
      .set("X-Payment-Signature", transferSig);
    expect(response2.status).toBe(409);
    expect(response2.body.error).toBe("Replay detected");
  }, 60000);

  it("should reject insufficient payment", async () => {
    if (!SHOULD_RUN) return;

    const usdcMint = new PublicKey(DEVNET_USDC_MINT);
    const payerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      payer.publicKey
    );

    // Transfer only 0.5 USDC (insufficient for 1.0 USDC requirement)
    const transferSig = await transfer(
      connection,
      payer,
      payerAta.address,
      treasuryTokenAccount,
      payer.publicKey,
      500_000 // 0.5 USDC
    );

    await connection.confirmTransaction(transferSig, "confirmed");

    const response = await request(app)
      .get("/protected")
      .set("X-Payment-Signature", transferSig);

    expect(response.status).toBe(402);
    expect(response.body.error).toBe("Insufficient payment");
    expect(response.body.observed_amount).toBe(0.5);
    expect(response.body.required_amount).toBe(1.0);
  }, 60000);
});

/**
 * Example usage for manual testing:
 *
 * 1. Get devnet USDC from faucet:
 *    https://spl-token-faucet.com/?token-name=USDC-Dev
 *
 * 2. Send USDC to treasury:
 *    spl-token transfer 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU 1 <TREASURY_ADDRESS> --url devnet
 *
 * 3. Use transaction signature as X-Payment-Signature header:
 *    curl -H "X-Payment-Signature: <TX_SIG>" http://localhost:3000/protected
 */
